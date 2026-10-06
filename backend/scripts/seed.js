// Seeds users, customers, price, stock, a demo coupon and ~30 days of sample sales.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

(async () => {
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM users');
  if (n > 0) { console.log('Seed data already present, skipping.'); return pool.end(); }

  const hash = (p) => bcrypt.hashSync(p, 10);
  const [adminRes] = await pool.query(
    "INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, 'Admin', 'ADMIN')",
    [process.env.ADMIN_USERNAME || 'admin', hash(process.env.ADMIN_PASSWORD || 'Admin@123')]);
  const adminId = adminRes.insertId;
  const [s1] = await pool.query(
    "INSERT INTO users (username, password_hash, display_name, role) VALUES ('sales1', ?, 'Salesperson 1', 'SALESPERSON')",
    [hash(process.env.SALES1_PASSWORD || 'Sales@123')]);
  const [s2] = await pool.query(
    "INSERT INTO users (username, password_hash, display_name, role) VALUES ('sales2', ?, 'Salesperson 2', 'SALESPERSON')",
    [hash(process.env.SALES2_PASSWORD || 'Sales@123')]);
  const sellers = [s1.insertId, s2.insertId];

  const customers = [['Kumar', '9876543210'], ['Arun', '9876543211'], ['Priya', '9876543212']];
  const custs = [];
  for (const [name, phone] of customers) {
    const [r] = await pool.query('INSERT INTO customers (name, phone) VALUES (?, ?)', [name, phone]);
    custs.push({ id: r.insertId, name, phone });
  }

  const PRICE = 250;
  await pool.query('INSERT INTO chicken_prices (price, updated_by) VALUES (?, ?)', [PRICE, adminId]);

  // Deterministic pseudo-random sample sales: 2-5 per day for the last 30 days.
  let seedN = 7;
  const rnd = () => (seedN = (seedN * 9301 + 49297) % 233280) / 233280;
  let totalQty = 0;
  const sales = [];
  for (let day = 29; day >= 0; day--) {
    const count = 2 + Math.floor(rnd() * 4);
    for (let i = 0; i < count; i++) {
      const qty = 1 + Math.floor(rnd() * 6);
      const c = custs[Math.floor(rnd() * custs.length)];
      const hour = 8 + Math.floor(rnd() * 11), min = Math.floor(rnd() * 60);
      totalQty += qty;
      sales.push({ day, qty, c, seller: sellers[Math.floor(rnd() * 2)],
        time: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00` });
    }
  }

  // Add enough stock so that 100 kg remain after the sample sales.
  await pool.query('UPDATE stock SET current_stock = ?, low_stock_threshold = 10 WHERE id = 1', [100]);
  await pool.query(
    "INSERT INTO stock_transactions (type, quantity, description, created_by) VALUES ('STOCK_ADDED', ?, 'Opening stock (seed)', ?)",
    [100 + totalQty, adminId]);

  for (const s of sales) {
    const sub = s.qty * PRICE;
    const [r] = await pool.query(
      `INSERT INTO sales (salesperson_id, customer_id, customer_name, customer_phone, item, quantity,
         price_per_unit, subtotal, coupon_discount, final_amount, sale_date, sale_time)
       VALUES (?, ?, ?, ?, 'Chicken', ?, ?, ?, 0, ?, CURDATE() - INTERVAL ? DAY, ?)`,
      [s.seller, s.c.id, s.c.name, s.c.phone, s.qty, PRICE, sub, sub, s.day, s.time]);
    await pool.query(
      "INSERT INTO stock_transactions (type, quantity, reference_id, description, created_by) VALUES ('SALE', ?, ?, ?, ?)",
      [-s.qty, r.insertId, `Sale #${r.insertId} (seed)`, s.seller]);
  }

  await pool.query(
    `INSERT INTO coupons (coupon_code, customer_id, discount_amount, expiry_date, created_by)
     VALUES ('CHICK-DEMO1', ?, 100, CURDATE() + INTERVAL 30 DAY, ?)`, [custs[0].id, adminId]);

  console.log(`Seeded ${sales.length} sample sales. Demo coupon CHICK-DEMO1 (Kumar, 9876543210, ₹100).`);
  console.log('Seeded sales are not queued for Google Sheets.');
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
