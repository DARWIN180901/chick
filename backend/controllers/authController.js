const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
  const user = rows[0];
  // Same message for unknown user and wrong password.
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    throw new AppError('Invalid username or password', 401);

  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.display_name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' });

  if (user.role === 'SALESPERSON')
    await pool.query(
      `INSERT INTO login_activity (user_id, username, login_date, login_time, ip_address)
       VALUES (?, ?, CURDATE(), CURTIME(), ?)`, [user.id, user.username, req.ip]);

  res.json({ success: true, data: { token, user: { id: user.id, username: user.username, name: user.display_name, role: user.role } } });
});

exports.logout = asyncHandler(async (req, res) => {
  if (req.user.role === 'SALESPERSON')
    await pool.query(
      `UPDATE login_activity SET logout_date = CURDATE(), logout_time = CURTIME()
       WHERE user_id = ? AND logout_time IS NULL ORDER BY id DESC LIMIT 1`, [req.user.id]);
  res.json({ success: true, message: 'Logged out' });
});

exports.me = (req, res) => res.json({ success: true, data: req.user });

exports.listSalespersons = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, username, display_name AS name FROM users WHERE role = 'SALESPERSON' ORDER BY display_name");
  res.json({ success: true, data: rows });
});
