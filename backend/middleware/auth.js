const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

function authenticateUser(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new AppError('Authentication required', 401));
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: p.id, username: p.username, name: p.name, role: p.role };
    next();
  } catch {
    next(new AppError('Session expired or invalid. Please log in again.', 401));
  }
}
const requireRole = (role) => (req, res, next) =>
  req.user && req.user.role === role ? next() : next(new AppError('You do not have access to this resource', 403));

module.exports = {
  authenticateUser,
  requireAdmin: requireRole('ADMIN'),
  requireSalesPerson: requireRole('SALESPERSON'),
};
