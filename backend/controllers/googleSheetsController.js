const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const sheets = require('../services/googleSheetsService');

exports.status = asyncHandler(async (req, res) => {
  const [counts] = await pool.query('SELECT status, COUNT(*) AS count FROM google_sheet_sync GROUP BY status');
  const [items] = await pool.query(
    `SELECT sale_id, status, attempt_count, last_attempt, error_message
     FROM google_sheet_sync WHERE status <> 'SYNCED' ORDER BY updated_at DESC LIMIT 200`);
  const totals = { SYNCED: 0, PENDING: 0, FAILED: 0 };
  counts.forEach((c) => { totals[c.status] = c.count; });
  res.json({ success: true, data: { configured: sheets.isConfigured(), totals, items } });
});

exports.retry = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await sheets.retryPending() });
});
