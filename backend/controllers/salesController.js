const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { rangeClause } = require('../utils/dateRange');
const saleService = require('../services/saleService');
const sheets = require('../services/googleSheetsService');

const BASE = `
  SELECT s.id, s.sale_date, s.sale_time, s.salesperson_id, u.display_name AS salesperson,
         s.customer_id, s.customer_name, s.customer_phone, s.customer_email, s.item,
         s.quantity, s.price_per_unit, s.subtotal, c.coupon_code, s.coupon_discount,
         s.final_amount, g.status AS sync_status
  FROM sales s
  JOIN users u ON u.id = s.salesperson_id
  LEFT JOIN coupons c ON c.id = s.coupon_id
  LEFT JOIN google_sheet_sync g ON g.sale_id = s.id`;

function buildFilters(q, user) {
  const where = ['1=1'];
  const params = [];
  if (user.role !== 'ADMIN') { where.push('s.salesperson_id = ?'); params.push(user.id); }
  else if (q.salespersonId) { where.push('s.salesperson_id = ?'); params.push(Number(q.salespersonId)); }

  const range = rangeClause(q);
  if (range) { where.push(range.sql); params.push(...range.params); }

  if (q.search) {
    where.push('(s.customer_name LIKE ? OR s.customer_phone LIKE ?)');
    params.push(`%${q.search}%`, `%${q.search}%`);
  }
  if (q.item) { where.push('s.item = ?'); params.push(q.item); }
  if (q.coupon === 'used') where.push('s.coupon_id IS NOT NULL');
  if (q.coupon === 'none') where.push('s.coupon_id IS NULL');
  return { where: where.join(' AND '), params };
}

async function fetchSales(q, user, limit = 1000) {
  const { where, params } = buildFilters(q, user);
  const [rows] = await pool.query(
    `${BASE} WHERE ${where} ORDER BY s.sale_date DESC, s.sale_time DESC, s.id DESC LIMIT ?`,
    [...params, limit]);
  return rows;
}

exports.create = asyncHandler(async (req, res) => {
  const result = await saleService.createSale(req.user, req.body);
  sheets.syncSale(result.saleId).catch(() => {}); // after commit; never fails the sale
  res.status(201).json({ success: true, message: 'Sale recorded', data: result });
});

exports.list = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 1000, 1), 1000);
  res.json({ success: true, data: await fetchSales(req.query, req.user, limit) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`${BASE} WHERE s.id = ?`, [req.params.id]);
  if (!rows.length) throw new AppError('Sale not found', 404);
  if (req.user.role !== 'ADMIN' && rows[0].salesperson_id !== req.user.id)
    throw new AppError('You can only access your own sales', 403);
  res.json({ success: true, data: rows[0] });
});

exports.update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const result = await saleService.updateSale(req.user, id, req.body);
  sheets.syncSale(id).catch(() => {});
  res.json({ success: true, message: 'Sale updated', data: result });
});

exports.remove = asyncHandler(async (req, res) => {
  const result = await saleService.cancelSale(req.user, Number(req.params.id));
  res.json({ success: true, message: 'Sale cancelled and stock restored', data: result });
});

const CSV_COLS = [
  ['Sale ID', 'id'], ['Date', 'sale_date'], ['Time', 'sale_time'], ['Salesperson', 'salesperson'],
  ['Customer', 'customer_name'], ['Phone', 'customer_phone'], ['Email', 'customer_email'],
  ['Item', 'item'], ['Quantity', 'quantity'], ['Price/kg', 'price_per_unit'], ['Subtotal', 'subtotal'],
  ['Coupon', 'coupon_code'], ['Discount', 'coupon_discount'], ['Final Amount', 'final_amount'],
];
const csvCell = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // block spreadsheet formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

exports.exportCsv = asyncHandler(async (req, res) => {
  const rows = await fetchSales(req.query, req.user, 50000);
  const lines = [CSV_COLS.map(([h]) => h).join(',')];
  for (const r of rows) lines.push(CSV_COLS.map(([, k]) => csvCell(r[k])).join(','));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sales.csv"');
  res.send(lines.join('\n'));
});
