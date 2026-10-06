// Core sale logic. All money/stock changes happen inside one DB transaction.
// `pool` is a mysql2/promise pool (see config/db.js).
const pool = require('../config/db');

const AppError = require('../utils/AppError');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// NEW HELPER: Converts meat weight to live bird weight (1.2x multiplier)
// E.g., 1.5kg meat * 1.2 = 1.8kg live bird weight
const getLiveWeight = (meatQty) => round2(Number(meatQty) * 1.2);

async function getCurrentPrice(conn) {
  const [rows] = await conn.query(
    'SELECT price FROM chicken_prices ORDER BY effective_date DESC, id DESC LIMIT 1');
  if (!rows.length) throw new AppError('Chicken price has not been set by admin');
  return Number(rows[0].price);
}

async function upsertCustomer(conn, { name, phone, email }) {
  const [rows] = await conn.query('SELECT * FROM customers WHERE phone = ? FOR UPDATE', [phone]);
  if (rows.length) return rows[0];
  const [res] = await conn.query(
    'INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)', [name, phone, email || null]);
  return { id: res.insertId, name, phone, email: email || null };
}

// Validates coupon for this customer. `ignoreSaleId` lets an edit keep its own already-USED coupon.
async function loadValidCoupon(conn, code, customerId, ignoreSaleId = null) {
  const [rows] = await conn.query('SELECT * FROM coupons WHERE coupon_code = ? FOR UPDATE', [code]);
  if (!rows.length) throw new AppError('Invalid coupon code');
  const c = rows[0];
  if (c.customer_id !== customerId) throw new AppError('Coupon does not belong to this customer');
  if (c.status === 'USED') {
    const [own] = ignoreSaleId
      ? await conn.query('SELECT id FROM sales WHERE id = ? AND coupon_id = ?', [ignoreSaleId, c.id])
      : [[]];
    if (!own.length) throw new AppError('Coupon has already been used');
    return c; // same sale keeps its coupon
  }
  if (c.status === 'EXPIRED' || new Date(c.expiry_date) < new Date(new Date().toDateString()))
    throw new AppError('Coupon has expired');
  return c;
}

function calculate(price, qty, coupon) {
  const subtotal = round2(price * qty);
  const discount = coupon ? Math.min(Number(coupon.discount_amount), subtotal) : 0;
  return { subtotal, discount: round2(discount), finalAmount: round2(Math.max(subtotal - discount, 0)) };
}

async function lockStock(conn) {
  const [rows] = await conn.query('SELECT current_stock FROM stock WHERE id = 1 FOR UPDATE');
  return Number(rows[0].current_stock);
}

async function changeStock(conn, { type, delta, saleId, userId, description }) {
  await conn.query('UPDATE stock SET current_stock = current_stock + ? WHERE id = 1', [delta]);
  await conn.query(
    `INSERT INTO stock_transactions (type, quantity, reference_id, description, created_by)
     VALUES (?, ?, ?, ?, ?)`, [type, delta, saleId, description, userId]);
}

async function createSale(user, input) {
  const qty = Number(input.quantity); // Meat quantity
  if (!(qty > 0)) throw new AppError('Invalid quantity');

  const liveWeight = getLiveWeight(qty); // The actual stock reduction needed

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const price = await getCurrentPrice(conn);           // never trust client price
    const available = await lockStock(conn);
    
    // Check against live weight, not meat weight!
    if (liveWeight > available) throw new AppError(`Insufficient stock! Needs ${liveWeight}kg live weight.`);

    const customer = await upsertCustomer(conn, input.customer);
    const coupon = input.couponCode
      ? await loadValidCoupon(conn, input.couponCode.trim().toUpperCase(), customer.id)
      : null;
    const { subtotal, discount, finalAmount } = calculate(price, qty, coupon); // Price is based on MEAT weight

    const now = new Date();
    const [res] = await conn.query(
      `INSERT INTO sales (salesperson_id, customer_id, customer_name, customer_phone, customer_email,
         item, quantity, price_per_unit, subtotal, coupon_id, coupon_discount, final_amount,
         sale_date, sale_time)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,CURDATE(),CURTIME())`,
      [user.id, customer.id, customer.name, customer.phone, customer.email,
       input.item || 'Chicken', qty, price, subtotal, coupon ? coupon.id : null, discount, finalAmount]);
    const saleId = res.insertId;

    // Deduct LIVE WEIGHT from stock
    await changeStock(conn, { 
      type: 'SALE', 
      delta: -liveWeight, 
      saleId, 
      userId: user.id,
      description: `Sale #${saleId} (Meat: ${qty}kg | Live: ${liveWeight}kg)` 
    });
    
    if (coupon) await conn.query(
      "UPDATE coupons SET status = 'USED', used_at = NOW() WHERE id = ?", [coupon.id]);
    await conn.query("INSERT INTO google_sheet_sync (sale_id, status) VALUES (?, 'PENDING')", [saleId]);

    await conn.commit();
    return { saleId, price, subtotal, discount, finalAmount };
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}

// Edit keeps the ORIGINAL price_per_unit of the sale (historical accuracy); only qty/coupon change.
async function updateSale(user, saleId, input) {
  const qty = Number(input.quantity);
  if (!(qty > 0)) throw new AppError('Invalid quantity');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM sales WHERE id = ? FOR UPDATE', [saleId]);
    if (!rows.length) throw new AppError('Sale not found', 404);
    const sale = rows[0];
    if (user.role !== 'ADMIN' && sale.salesperson_id !== user.id)
      throw new AppError('You can only edit your own sales', 403);

    const available = await lockStock(conn);
    
    // Calculate stock differences using LIVE weights
    const oldLiveWeight = getLiveWeight(Number(sale.quantity));
    const newLiveWeight = getLiveWeight(qty);
    const liveWeightDelta = round2(newLiveWeight - oldLiveWeight); // e.g., +0.6kg if they increased meat order
    
    if (liveWeightDelta > available) throw new AppError(`Insufficient stock! Needs ${liveWeightDelta}kg extra live weight.`);

    const code = input.couponCode ? input.couponCode.trim().toUpperCase() : null;
    const coupon = code ? await loadValidCoupon(conn, code, sale.customer_id, saleId) : null;
    const { subtotal, discount, finalAmount } = calculate(Number(sale.price_per_unit), qty, coupon); // Price on MEAT

    // Coupon history: release old coupon if removed/replaced, consume new one.
    const oldId = sale.coupon_id, newId = coupon ? coupon.id : null;
    if (oldId && oldId !== newId)
      await conn.query(
        "UPDATE coupons SET status = IF(expiry_date < CURDATE(),'EXPIRED','ACTIVE'), used_at = NULL WHERE id = ?",
        [oldId]);
    if (newId && newId !== oldId)
      await conn.query("UPDATE coupons SET status = 'USED', used_at = NOW() WHERE id = ?", [newId]);

    await conn.query(
      `UPDATE sales SET quantity=?, subtotal=?, coupon_id=?, coupon_discount=?, final_amount=? WHERE id=?`,
      [qty, subtotal, newId, discount, finalAmount, saleId]);
      
    if (liveWeightDelta !== 0) {
      await changeStock(conn, { 
        type: 'SALE_EDIT', 
        delta: -liveWeightDelta, 
        saleId, 
        userId: user.id,
        description: `Sale #${saleId} edit: Meat ${sale.quantity}->${qty}kg (Live adjustment: ${-liveWeightDelta > 0 ? '+' : ''}${-liveWeightDelta}kg)` 
      });
    }
    
    await conn.query("UPDATE google_sheet_sync SET status='PENDING' WHERE sale_id = ?", [saleId]);

    await conn.commit();
    return { saleId, subtotal, discount, finalAmount };
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}

// Read-only preview for the "Apply Coupon" button. Final numbers are recomputed in createSale.
async function previewSale({ phone, quantity, couponCode }) {
  const qty = Number(quantity);
  if (!(qty > 0)) throw new AppError('Invalid quantity');
  const price = await getCurrentPrice(pool);
  let coupon = null;
  if (couponCode) {
    const [c] = await pool.query('SELECT id FROM customers WHERE phone = ?', [phone]);
    if (!c.length) throw new AppError('Coupon does not belong to this customer');
    coupon = await loadValidCoupon(pool, couponCode.trim().toUpperCase(), c[0].id);
  }
  return { price, ...calculate(price, qty, coupon), couponCode: coupon ? coupon.coupon_code : null };
}

// Cancels a sale: returns stock (SALE_REVERSAL) and frees the coupon again.
async function cancelSale(user, saleId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM sales WHERE id = ? FOR UPDATE', [saleId]);
    if (!rows.length) throw new AppError('Sale not found', 404);
    const sale = rows[0];
    if (user.role !== 'ADMIN' && sale.salesperson_id !== user.id)
      throw new AppError('You can only cancel your own sales', 403);

    const liveWeightToReturn = getLiveWeight(Number(sale.quantity));

    await lockStock(conn);
    await changeStock(conn, { 
      type: 'SALE_REVERSAL', 
      delta: liveWeightToReturn, // Add the live weight back!
      saleId,
      userId: user.id, 
      description: `Sale #${saleId} cancelled (Restored ${liveWeightToReturn}kg live weight)` 
    });
    
    if (sale.coupon_id)
      await conn.query(
        "UPDATE coupons SET status = IF(expiry_date < CURDATE(),'EXPIRED','ACTIVE'), used_at = NULL WHERE id = ?",
        [sale.coupon_id]);
    await conn.query('DELETE FROM sales WHERE id = ?', [saleId]);
    await conn.commit();
    return { saleId };
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}

module.exports = { createSale, updateSale, cancelSale, previewSale, AppError };