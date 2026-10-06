const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticateUser, requireAdmin, requireSalesPerson } = require('../middleware/auth');

const auth = require('../controllers/authController');
const sales = require('../controllers/salesController');
const customers = require('../controllers/customersController');
const stock = require('../controllers/stockController');
const prices = require('../controllers/priceController');
const coupons = require('../controllers/couponController');
const analytics = require('../controllers/analyticsController');
const loginActivity = require('../controllers/loginActivityController');
const gsheets = require('../controllers/googleSheetsController');

// ---- reusable validation rules ----
const cleanPhone = (v) => String(v || '').replace(/[\s-]/g, '');
const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid id');
const phoneRule = (field) => body(field).customSanitizer(cleanPhone)
  .matches(/^\+?\d{10,15}$/).withMessage('Enter a valid phone number');
const quantityRule = body('quantity').isFloat({ gt: 0, max: 10000 }).withMessage('Quantity must be greater than 0');
const couponRule = body('couponCode').optional({ checkFalsy: true }).trim().isLength({ max: 30 }).withMessage('Invalid coupon code');
const customerRules = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Customer name is required'),
  phoneRule('phone'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email address'),
];

// ---- auth ----
router.post('/auth/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'), validate], auth.login);
router.post('/auth/logout', authenticateUser, auth.logout);
router.get('/auth/me', authenticateUser, auth.me);
router.get('/users/salespersons', authenticateUser, requireAdmin, auth.listSalespersons);

// ---- sales ----
router.get('/sales/export', authenticateUser, requireAdmin, sales.exportCsv);
router.post('/sales', authenticateUser, requireSalesPerson, [
  body('customer.name').trim().isLength({ min: 1, max: 100 }).withMessage('Customer name is required'),
  phoneRule('customer.phone'),
  body('customer.email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email address'),
  body('item').optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
  quantityRule, couponRule, validate], sales.create);
router.get('/sales', authenticateUser, sales.list);
router.get('/sales/:id', authenticateUser, idParam, validate, sales.getOne);
router.put('/sales/:id', authenticateUser, requireSalesPerson, [idParam, quantityRule, couponRule, validate], sales.update);
router.delete('/sales/:id', authenticateUser, idParam, validate, sales.remove);

// ---- customers ----
router.get('/customers', authenticateUser, customers.list);
router.get('/customers/lookup/:phone', authenticateUser, customers.lookup);
router.get('/customers/:id', authenticateUser, idParam, validate, customers.getOne);
router.post('/customers', authenticateUser, [...customerRules, validate], customers.create);
router.put('/customers/:id', authenticateUser, [idParam, ...customerRules, validate], customers.update);

// ---- stock (admin) ----

router.get('/stock', authenticateUser, requireAdmin, stock.getStock);
router.get('/stock/history', authenticateUser, requireAdmin, stock.history);

// CHANGED: Removed '/add' from the path, and removed 'gt: 0' from the validation so negative numbers work!
router.post('/stock', authenticateUser, requireAdmin, [
  body('quantity').isFloat({ min: -100000, max: 100000 }).withMessage('Stock quantity must be a valid number')
    .custom(val => Number(val) !== 0).withMessage('Quantity cannot be 0'),
  body('type').optional({ checkFalsy: true }).trim().isString(),
  body('note').optional({ checkFalsy: true }).trim().isLength({ max: 200 }), validate], stock.adjustStock);
router.put('/stock/threshold', authenticateUser, requireAdmin, [
  body('threshold').isFloat({ min: 0, max: 100000 }).withMessage('Invalid threshold'), validate], stock.setThreshold);

// ---- chicken price ----
router.get('/prices/current', authenticateUser, prices.current);
router.get('/prices/history', authenticateUser, requireAdmin, prices.history);
router.post('/prices', authenticateUser, requireAdmin, [
  body('price').isFloat({ gt: 0, max: 100000 }).withMessage('Price must be greater than 0'), validate], prices.update);

// ---- coupons ----
router.post('/coupons/validate', authenticateUser, requireSalesPerson, [
  phoneRule('phone'), quantityRule,
  body('couponCode').trim().notEmpty().withMessage('Enter a coupon code'), validate], coupons.validate);
router.get('/coupons', authenticateUser, requireAdmin, coupons.list);
router.post('/coupons', authenticateUser, requireAdmin, [
  body('customerId').isInt({ min: 1 }).withMessage('Select a customer'),
  body('discountAmount').isFloat({ gt: 0, max: 100000 }).withMessage('Discount must be greater than 0'),
  body('expiryDate').isISO8601({ strict: true }).withMessage('Enter a valid expiry date')
    .custom((v) => new Date(v) >= new Date(new Date().toDateString())).withMessage('Expiry date cannot be in the past'),
  validate], coupons.create);
router.get('/coupons/:id', authenticateUser, requireAdmin, idParam, validate, coupons.getOne);
router.post('/coupons/:id/send-whatsapp', authenticateUser, requireAdmin, idParam, validate, coupons.sendWhatsApp);

// ---- analytics, login activity, sheets (admin) ----
router.get('/analytics/daily', authenticateUser, requireAdmin, analytics.daily);
router.get('/analytics/weekly', authenticateUser, requireAdmin, analytics.weekly);
router.get('/analytics/monthly', authenticateUser, requireAdmin, analytics.monthly);
router.get('/analytics/salespersons', authenticateUser, requireAdmin, analytics.salespersons);
router.get('/login-activity', authenticateUser, requireAdmin, loginActivity.list);
router.get('/google-sheets/sync-status', authenticateUser, requireAdmin, gsheets.status);
router.post('/google-sheets/retry', authenticateUser, requireAdmin, gsheets.retry);

module.exports = router;
