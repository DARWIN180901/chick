const { google } = require('googleapis');
const pool = require('../config/db');

const HEADERS = ['Sale ID', 'Date', 'Time', 'Salesperson', 'Customer Name', 'Phone', 'Email', 'Item',
  'Quantity', 'Price/kg', 'Subtotal', 'Coupon Code', 'Discount', 'Final Amount'];
const MAX_AUTO_ATTEMPTS = 5;

const isConfigured = () => Boolean(process.env.GOOGLE_SHEET_ID &&
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
const tab = () => process.env.GOOGLE_SHEET_TAB || 'Sales';

let client;
function getClient() {
  if (!isConfigured()) throw new Error('Google Sheets is not configured');
  if (!client) {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    client = google.sheets({ version: 'v4', auth });
  }
  return client;
}

async function loadRow(saleId) {
  const [rows] = await pool.query(
    `SELECT s.*, u.display_name AS salesperson, c.coupon_code
     FROM sales s JOIN users u ON u.id = s.salesperson_id
     LEFT JOIN coupons c ON c.id = s.coupon_id WHERE s.id = ?`, [saleId]);
  if (!rows.length) return null;
  const s = rows[0];
  return [s.id, s.sale_date, s.sale_time, s.salesperson, s.customer_name, s.customer_phone,
    s.customer_email || '', s.item, s.quantity, s.price_per_unit, s.subtotal,
    s.coupon_code || '', s.coupon_discount, s.final_amount];
}

// Inserts the sale, or updates its existing row (so edits never create duplicates).
// Never throws: the outcome is recorded in google_sheet_sync.
async function syncSale(saleId) {
  await pool.query(
    `INSERT INTO google_sheet_sync (sale_id, status, attempt_count, last_attempt)
     VALUES (?, 'PENDING', 1, NOW())
     ON DUPLICATE KEY UPDATE attempt_count = attempt_count + 1, last_attempt = NOW()`, [saleId]);
  try {
    const values = await loadRow(saleId);
    if (!values) return;
    const sheets = getClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const existing = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab()}!A:A` });
    const col = existing.data.values || [];
    if (!col.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId, range: `${tab()}!A1`, valueInputOption: 'RAW', requestBody: { values: [HEADERS] } });
      col.push(['Sale ID']);
    }
    const idx = col.findIndex((r, i) => i > 0 && String(r[0]) === String(saleId));
    if (idx >= 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId, range: `${tab()}!A${idx + 1}:N${idx + 1}`, valueInputOption: 'RAW', requestBody: { values: [values] } });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId, range: `${tab()}!A:N`, valueInputOption: 'RAW', requestBody: { values: [values] } });
    }
    await pool.query("UPDATE google_sheet_sync SET status = 'SYNCED', error_message = NULL WHERE sale_id = ?", [saleId]);
  } catch (err) {
    await pool.query(
      `UPDATE google_sheet_sync SET error_message = ?,
         status = IF(attempt_count >= ${MAX_AUTO_ATTEMPTS}, 'FAILED', 'PENDING') WHERE sale_id = ?`,
      [String(err.message).slice(0, 500), saleId]);
  }
}

async function retryPending() {
  if (!isConfigured()) return { attempted: 0, message: 'Google Sheets is not configured' };
  await pool.query("UPDATE google_sheet_sync SET attempt_count = 0 WHERE status = 'FAILED'");
  const [rows] = await pool.query("SELECT sale_id FROM google_sheet_sync WHERE status IN ('PENDING','FAILED') ORDER BY sale_id");
  for (const r of rows) await syncSale(r.sale_id); // sequential to respect API quotas
  const [[left]] = await pool.query("SELECT COUNT(*) AS n FROM google_sheet_sync WHERE status <> 'SYNCED'");
  return { attempted: rows.length, stillUnsynced: left.n };
}

module.exports = { syncSale, retryPending, isConfigured };
