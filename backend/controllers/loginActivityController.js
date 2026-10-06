const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT la.id, la.user_id, la.username, u.display_name AS name, la.login_date, la.login_time,
            la.logout_date, la.logout_time, la.ip_address,
            IF(la.logout_time IS NULL, 'Active', 'Logged Out') AS status
     FROM login_activity la JOIN users u ON u.id = la.user_id
     ORDER BY la.id DESC LIMIT 500`);
  res.json({ success: true, data: rows });
});
