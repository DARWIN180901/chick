import dayjs from 'dayjs';

// The API omits days/hours with no sales; charts look right when those show as zero.
export function fillDays(series, start, end) {
  const byDate = new Map(series.map((r) => [String(r.date).slice(0, 10), r]));
  const out = [];
  for (let d = start; !d.isAfter(end, 'day'); d = d.add(1, 'day')) {
    const key = d.format('YYYY-MM-DD');
    const r = byDate.get(key);
    out.push({ date: key, label: d.format('DD MMM'), revenue: r?.revenue || 0, quantity: r?.quantity || 0, transactions: r?.transactions || 0 });
  }
  return out;
}
export const lastSevenDays = (series) => fillDays(series, dayjs().subtract(6, 'day'), dayjs());
export const thisMonth = (series) => fillDays(series, dayjs().startOf('month'), dayjs());

export function fillHours(series) {
  const hours = series.map((r) => r.hour);
  const lo = Math.min(6, ...hours);
  const hi = Math.max(21, ...hours);
  const byHour = new Map(series.map((r) => [r.hour, r]));
  const out = [];
  for (let h = lo; h <= hi; h++) {
    const r = byHour.get(h);
    out.push({ label: `${String(h).padStart(2, '0')}:00`, revenue: r?.revenue || 0, quantity: r?.quantity || 0 });
  }
  return out;
}
