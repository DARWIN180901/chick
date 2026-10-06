const AppError = require('./AppError');
const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Returns { sql, params } for a ?range= filter, or null when no range is given.
function rangeClause(q, col = 's.sale_date') {
  switch (q.range) {
    case 'today': return { sql: `${col} = CURDATE()`, params: [] };
    case 'yesterday': return { sql: `${col} = CURDATE() - INTERVAL 1 DAY`, params: [] };
    case 'week': return { sql: `YEARWEEK(${col}, 1) = YEARWEEK(CURDATE(), 1)`, params: [] };
    case 'month':
      return { sql: `${col} >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND ${col} <= LAST_DAY(CURDATE())`, params: [] };
    case 'custom':
      if (!ISO.test(q.from || '') || !ISO.test(q.to || '')) throw new AppError('Invalid custom date range');
      return { sql: `${col} BETWEEN ? AND ?`, params: [q.from, q.to] };
    default: return null;
  }
}
module.exports = { rangeClause };
