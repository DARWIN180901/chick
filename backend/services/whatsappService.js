const AppError = require('../utils/AppError');

const isConfigured = () => Boolean(process.env.WHATSAPP_API_URL &&
  process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  return digits.length === 10 ? (process.env.DEFAULT_COUNTRY_CODE || '91') + digits : digits;
}
const ddmmyyyy = (iso) => String(iso).slice(0, 10).split('-').reverse().join('/');

function buildMessage({ customerName, couponCode, discount, expiryDate }) {
  return `Hello ${customerName},\n\nYou have received a special coupon from our chicken shop.\n\n` +
    `Coupon Code: ${couponCode}\nDiscount: ₹${discount}\nValid Until: ${ddmmyyyy(expiryDate)}\n\n` +
    'Thank you for shopping with us!';
}

async function sendCoupon(details) {
  if (!isConfigured()) throw new AppError('WhatsApp service is not configured.', 503);
  const url = `${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp', to: normalizePhone(details.phone),
        type: 'text', text: { body: buildMessage(details) } }),
    });
  } catch {
    throw new AppError('Could not reach the WhatsApp service. Please try again.', 502);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new AppError(`WhatsApp error: ${(body.error && body.error.message) || res.statusText}`, 502);
  }
}

module.exports = { sendCoupon, isConfigured, buildMessage };
