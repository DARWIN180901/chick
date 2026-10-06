import dayjs from 'dayjs';

export const money = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);
export const kg = (n) => `${Number(n) || 0} kg`;
export const fmtDate = (d) => (d ? dayjs(d).format('DD MMM YYYY') : '-');
export const fmtTime = (t) => (t ? dayjs(`2000-01-01T${t}`).format('hh:mm A') : '-');
export const cleanPhone = (v) => String(v || '').replace(/[\s-]/g, '');
export const isValidPhone = (v) => /^\+?\d{10,15}$/.test(cleanPhone(v));
export const fmtDateTime = (ts) => (ts ? dayjs(ts).format('DD MMM YYYY, hh:mm A') : '-');
