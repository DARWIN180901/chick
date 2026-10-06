const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { rangeClause } = require('../utils/dateRange');

const TOTALS = `COALESCE(SUM(final_amount),0) AS revenue, COALESCE(SUM(quantity),0) AS quantity, COUNT(*) AS transactions`;

async function summary(where) {
  const [[row]] = await pool.query(`SELECT ${TOTALS} FROM sales WHERE ${where}`);
  return row;
}

exports.daily = asyncHandler(async (req, res) => {
  const where = 'sale_date = CURDATE()';
  const [series] = await pool.query(
    `SELECT HOUR(sale_time) AS hour, ${TOTALS} FROM sales WHERE ${where} GROUP BY HOUR(sale_time) ORDER BY hour`);
  res.json({ success: true, data: { summary: await summary(where), series } });
});

// Last 7 days including today. Days with no sales are simply absent from `series`.
exports.weekly = asyncHandler(async (req, res) => {
  const where = 'sale_date >= CURDATE() - INTERVAL 6 DAY AND sale_date <= CURDATE()';
  const [series] = await pool.query(
    `SELECT sale_date AS date, ${TOTALS} FROM sales WHERE ${where} GROUP BY sale_date ORDER BY sale_date`);
  res.json({ success: true, data: { summary: await summary(where), series } });
});

exports.monthly = asyncHandler(async (req, res) => {
  const where = "sale_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND sale_date <= LAST_DAY(CURDATE())";
  const [series] = await pool.query(
    `SELECT sale_date AS date, ${TOTALS} FROM sales WHERE ${where} GROUP BY sale_date ORDER BY sale_date`);
  res.json({ success: true, data: { summary: await summary(where), series } });
});

exports.salespersons = asyncHandler(async (req, res) => {
  const range = rangeClause(req.query, 's.sale_date');
  const [rows] = await pool.query(
    `SELECT u.id, u.display_name AS name, COUNT(s.id) AS sales_count,
            COALESCE(SUM(s.quantity),0) AS quantity, COALESCE(SUM(s.final_amount),0) AS revenue
     FROM users u LEFT JOIN sales s ON s.salesperson_id = u.id ${range ? 'AND ' + range.sql : ''}
     WHERE u.role = 'SALESPERSON' GROUP BY u.id, u.display_name ORDER BY revenue DESC`,
    range ? range.params : []);
  res.json({ success: true, data: rows });
});
