import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Boxes, IndianRupee, ReceiptText, Plus, Tag, Ticket } from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import DataTable from '../components/DataTable';
import RevenueChart from '../components/RevenueChart';
import StockAlert from '../components/StockAlert';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import CouponBadge from '../components/CouponBadge';
import useFetch from '../hooks/useFetch';
import { adminApi, salesApi } from '../services';
import { fmtDate, fmtTime, kg, money } from '../utils/format';
import { lastSevenDays } from '../utils/chartData';

const FLAG = 'lowStockSeen';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const stock = useFetch(() => adminApi.stock(), []);
  const daily = useFetch(() => adminApi.analytics('daily'), []);
  const weekly = useFetch(() => adminApi.analytics('weekly'), []);
  const recent = useFetch(() => salesApi.list({ limit: 5 }), []);
  const [alertOpen, setAlertOpen] = useState(false);

  // Pop up once per login when stock is at or below the threshold.
  useEffect(() => {
    if (stock.data?.isLowStock && !sessionStorage.getItem(FLAG)) setAlertOpen(true);
  }, [stock.data]);
  const closeAlert = () => { sessionStorage.setItem(FLAG, '1'); setAlertOpen(false); };

  const s = stock.data;
  const today = daily.data?.summary;
  const columns = [
    { key: 'customer_name', header: 'Customer' },
    { key: 'salesperson', header: 'Salesperson' },
    { key: 'quantity', header: 'Qty', render: (r) => kg(r.quantity) },
    { key: 'final_amount', header: 'Amount', render: (r) => money(r.final_amount) },
    { key: 'coupon_code', header: 'Coupon', render: (r) => <CouponBadge code={r.coupon_code} /> },
    { key: 'sale_date', header: 'Date', render: (r) => `${fmtDate(r.sale_date)}, ${fmtTime(r.sale_time)}` },
  ];

  return (
    <>
      <div className="page-head hero"><div><h2>Chicken Shop Management</h2><p className="muted">Business overview</p></div></div>

      {s?.isLowStock && (
        <div className="notice bad-notice">
          <AlertTriangle size={18} /> Low stock: only {kg(s.currentStock)} left.
          <Link to="/admin/stock"><strong>Update stock</strong></Link>
        </div>
      )}

      <div className="grid-cards">
        <DashboardCard icon={IndianRupee} label="Today's Revenue" value={today ? money(today.revenue) : '-'} />
        <DashboardCard icon={ReceiptText} label="Today's Sales" value={today ? `${today.transactions} transactions` : '-'} hint={today ? kg(today.quantity) + ' sold' : ''} />
        <DashboardCard icon={Boxes} label="Stock" value={s ? kg(s.currentStock) : '-'} hint={s ? `Alert at ${kg(s.lowStockThreshold)}` : ''} />
        <DashboardCard icon={AlertTriangle} label="Alerts" value={s ? (s.isLowStock ? 'Low stock' : 'All good') : '-'} />
      </div>

      <div className="card section">
        <h3>Revenue overview (last 7 days)</h3>
        {weekly.loading ? <LoadingSpinner /> : weekly.error
          ? <ErrorState message={weekly.error} onRetry={weekly.reload} />
          : <RevenueChart data={lastSevenDays(weekly.data.series)} />}
      </div>

      <div className="card section">
        <h3>Recent sales</h3>
        <DataTable columns={columns} rows={recent.data} loading={recent.loading} error={recent.error} onRetry={recent.reload} emptyMessage="No sales yet." />
      </div>

      <div className="card section">
        <h3>Quick actions</h3>
        <div className="quick">
          <Link className="btn btn-primary" to="/admin/stock"><Plus size={16} /> Add Stock</Link>
          <Link className="btn btn-ghost" to="/admin/price"><Tag size={16} /> Update Price</Link>
          <Link className="btn btn-ghost" to="/admin/coupons"><Ticket size={16} /> Generate Coupon</Link>
        </div>
      </div>

      <StockAlert open={alertOpen} stock={s} onClose={closeAlert} onUpdate={() => { closeAlert(); navigate('/admin/stock'); }} />
    </>
  );
}
