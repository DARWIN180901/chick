const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

exports.getStock = asyncHandler(async (req, res) => {
  const [[st]] = await pool.query('SELECT current_stock, low_stock_threshold, updated_at FROM stock WHERE id = 1');
  const [[added]] = await pool.query("SELECT COALESCE(SUM(quantity),0) AS total FROM stock_transactions WHERE type = 'STOCK_ADDED'");
  const [[sold]] = await pool.query('SELECT COALESCE(SUM(quantity),0) AS total FROM sales');
  
  // Calculate wastage: 0.3kg waste for every 1.5kg sold = 20% of meat weight
  const totalWastage = sold.total * 0.2;

  res.json({ success: true, data: {
    currentStock: st.current_stock,
    totalAdded: added.total,
    totalSold: sold.total,         // Meat weight sold
    totalWastage: totalWastage,   // Live-bird waste (feathers, legs, etc)
    remainingStock: st.current_stock,
    lowStockThreshold: st.low_stock_threshold,
    isLowStock: st.current_stock <= st.low_stock_threshold,
    updatedAt: st.updated_at,
  } });
});

exports.adjustStock = asyncHandler(async (req, res) => {
  // qty can be negative (for removal) or positive (for additions)
  const qty = Number(req.body.quantity); 
  
  const type = req.body.type || (qty >= 0 ? 'STOCK_ADDED' : 'STOCK_REMOVED');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('SELECT current_stock FROM stock WHERE id = 1 FOR UPDATE');
    await conn.query('UPDATE stock SET current_stock = current_stock + ? WHERE id = 1', [qty]);
    await conn.query(
      `INSERT INTO stock_transactions (type, quantity, created_by)
       VALUES (?, ?, ?)`, [type, qty, req.user.id]
    );
    await conn.commit();
  } catch (e) { 
    await conn.rollback(); throw e; 
  } finally { 
    conn.release(); 
  }
  res.json({ success: true, message: `Stock adjusted by ${qty} kg` });
});


exports.setThreshold = asyncHandler(async (req, res) => {
  await pool.query('UPDATE stock SET low_stock_threshold = ? WHERE id = 1', [Number(req.body.threshold)]);
  res.json({ success: true, message: 'Low stock threshold updated' });
});

exports.history = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT t.id, t.type, t.quantity, t.reference_id, t.description, t.created_at, u.display_name AS created_by
     FROM stock_transactions t JOIN users u ON u.id = t.created_by
     ORDER BY t.id DESC LIMIT 500`);
  res.json({ success: true, data: rows });
});
