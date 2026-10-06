const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

exports.list = asyncHandler(async (req, res) => {
  const params = [];
  let where = '';
  if (req.query.search) {
    where = 'WHERE name LIKE ? OR phone LIKE ?';
    params.push(`%${req.query.search}%`, `%${req.query.search}%`);
  }
  const [rows] = await pool.query(
    `SELECT id, name, phone, email, created_at FROM customers ${where} ORDER BY name LIMIT 500`, params);
  res.json({ success: true, data: rows });
});

// Used by the Add Sale form: returns the customer or null.
exports.lookup = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT id, name, phone, email FROM customers WHERE phone = ?', [req.params.phone]);
  res.json({ success: true, data: rows[0] || null });
});

exports.getOne = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  if (!rows.length) throw new AppError('Customer not found', 404);
  res.json({ success: true, data: rows[0] });
});

exports.create = asyncHandler(async (req, res) => {
  const { name, phone, email } = req.body;
  const [r] = await pool.query('INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)', [name, phone, email || null]);
  res.status(201).json({ success: true, data: { id: r.insertId, name, phone, email: email || null } });
});

exports.update = asyncHandler(async (req, res) => {
  const { name, phone, email } = req.body;
  const [r] = await pool.query('UPDATE customers SET name = ?, phone = ?, email = ? WHERE id = ?',
    [name, phone, email || null, req.params.id]);
  if (!r.affectedRows) throw new AppError('Customer not found', 404);
  res.json({ success: true, message: 'Customer updated' });
});
