const TONES = {
  ACTIVE: 'ok', SYNCED: 'ok', Active: 'ok',
  USED: 'neutral', 'Logged Out': 'neutral',
  PENDING: 'warn', STOCK_ADDED: 'ok', SALE: 'neutral', SALE_EDIT: 'warn', SALE_REVERSAL: 'warn', EXPIRED: 'bad', FAILED: 'bad',
};
export default function StatusBadge({ status }) {
  return <span className={`badge badge-${TONES[status] || 'neutral'}`}>{status}</span>;
}
