export default function CouponBadge({ code }) {
  return code ? <span className="badge badge-accent mono">{code}</span> : <span className="muted">-</span>;
}
