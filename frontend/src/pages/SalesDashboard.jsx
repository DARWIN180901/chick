import { Link } from 'react-router-dom';
import { IndianRupee, Scale, ReceiptText, Plus } from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import DataTable from '../components/DataTable';
import CouponBadge from '../components/CouponBadge';
import useFetch from '../hooks/useFetch';
import { salesApi } from '../services';
import { useAuth } from '../context/AuthContext';
import { fmtDate, fmtTime, kg, money } from '../utils/format';

export default function SalesDashboard() {
  const { user } = useAuth();
  const today = useFetch(() => salesApi.list({ range: 'today' }), []);
  const recent = useFetch(() => salesApi.list({ limit: 5 }), []);

  const rows = today.data || [];
  const amount = rows.reduce((s, r) => s + r.final_amount, 0);
  const quantity = rows.reduce((s, r) => s + r.quantity, 0);

  const columns = [
    { key: 'customer_name', header: 'Customer' },
    { key: 'quantity', header: 'Quantity', render: (r) => kg(r.quantity) },
    { key: 'final_amount', header: 'Amount', render: (r) => money(r.final_amount) },
    { key: 'coupon_code', header: 'Coupon', render: (r) => <CouponBadge code={r.coupon_code} /> },
    { key: 'sale_date', header: 'Date', render: (r) => `${fmtDate(r.sale_date)}, ${fmtTime(r.sale_time)}` },
  ];

  return (
    <>
      <div className="page-head hero">
        <div><h2>Hello, {user.name}</h2><p className="muted">Here is how today is going.</p></div>
        <Link to="/sales/new" className="btn btn-primary"><Plus size={18} /> Add New Sale</Link>
      </div>
      <div className="grid-cards">
        <DashboardCard icon={IndianRupee} label="Today's Sales" value={money(amount)} />
        <DashboardCard icon={Scale} label="Quantity Sold" value={kg(quantity)} />
        <DashboardCard icon={ReceiptText} label="Transactions" value={rows.length} />
      </div>
      <div className="card section">
        <h3>Recent sales</h3>
        <DataTable columns={columns} rows={recent.data} loading={recent.loading} error={recent.error}
          onRetry={recent.reload} emptyMessage="No sales yet. Add your first sale." />
      </div>
    </>
  );
}
