const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const SELECT = `SELECT p.id, p.price, p.effective_date, u.display_name AS updated_by
                FROM chicken_prices p JOIN users u ON u.id = p.updated_by`;

exports.current = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`${SELECT} ORDER BY p.effective_date DESC, p.id DESC LIMIT 2`);
  res.json({ success: true, data: rows.length
    ? { ...rows[0], previousPrice: rows[1] ? rows[1].price : null }
    : null });
});

exports.history = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`${SELECT} ORDER BY p.effective_date DESC, p.id DESC LIMIT 200`);
  res.json({ success: true, data: rows });
});

exports.update = asyncHandler(async (req, res) => {
  const [r] = await pool.query('INSERT INTO chicken_prices (price, updated_by) VALUES (?, ?)',
    [Number(req.body.price), req.user.id]);
  res.status(201).json({ success: true, message: 'Price updated', data: { id: r.insertId } });
});
