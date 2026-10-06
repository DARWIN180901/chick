const crypto = require('crypto');
const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const saleService = require('../services/saleService');
const whatsapp = require('../services/whatsappService');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alike characters
const makeCode = () =>
  'CHICK-' + Array.from(crypto.randomBytes(5), (b) => ALPHABET[b % ALPHABET.length]).join('');

const SELECT = `SELECT c.id, c.coupon_code, c.customer_id, cu.name AS customer_name, cu.phone AS customer_phone,
                       c.discount_amount, c.status, c.expiry_date, c.created_at, c.used_at
                FROM coupons c JOIN customers cu ON cu.id = c.customer_id`;

const expireOld = () =>
  pool.query("UPDATE coupons SET status = 'EXPIRED' WHERE status = 'ACTIVE' AND expiry_date < CURDATE()");

exports.list = asyncHandler(async (req, res) => {
  await expireOld();
  const params = [];
  let where = '';
  if (['ACTIVE', 'USED', 'EXPIRED'].includes(req.query.status)) { where = 'WHERE c.status = ?'; params.push(req.query.status); }
  const [rows] = await pool.query(`${SELECT} ${where} ORDER BY c.id DESC LIMIT 500`, params);
  res.json({ success: true, data: rows });
});

exports.getOne = asyncHandler(async (req, res) => {
  await expireOld();
  const [rows] = await pool.query(`${SELECT} WHERE c.id = ?`, [req.params.id]);
  if (!rows.length) throw new AppError('Coupon not found', 404);
  res.json({ success: true, data: rows[0] });
});

exports.create = asyncHandler(async (req, res) => {
  const { customerId, discountAmount, expiryDate } = req.body;
  const [cust] = await pool.query('SELECT id FROM customers WHERE id = ?', [customerId]);
  if (!cust.length) throw new AppError('Customer not found', 404);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    try {
      const [r] = await pool.query(
        `INSERT INTO coupons (coupon_code, customer_id, discount_amount, expiry_date, created_by)
         VALUES (?, ?, ?, ?, ?)`, [code, customerId, Number(discountAmount), expiryDate, req.user.id]);
      return res.status(201).json({ success: true, message: 'Coupon generated', data: { id: r.insertId, couponCode: code } });
    } catch (e) { if (e.code !== 'ER_DUP_ENTRY') throw e; }
  }
  throw new AppError('Could not generate a unique coupon code. Please try again.', 500);
});

exports.sendWhatsApp = asyncHandler(async (req, res) => {
  await expireOld();
  const [rows] = await pool.query(`${SELECT} WHERE c.id = ?`, [req.params.id]);
  if (!rows.length) throw new AppError('Coupon not found', 404);
  const c = rows[0];
  if (c.status !== 'ACTIVE') throw new AppError(`Only active coupons can be sent (this one is ${c.status})`);
  await whatsapp.sendCoupon({
    phone: c.customer_phone, customerName: c.customer_name, couponCode: c.coupon_code,
    discount: c.discount_amount, expiryDate: c.expiry_date });
  res.json({ success: true, message: 'Coupon sent via WhatsApp' });
});

// Salesperson "Apply Coupon" preview. The final amount is re-checked when the sale is saved.
exports.validate = asyncHandler(async (req, res) => {
  const preview = await saleService.previewSale(req.body);
  res.json({ success: true, data: preview });
});
