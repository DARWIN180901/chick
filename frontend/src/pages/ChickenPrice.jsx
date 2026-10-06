import { useState } from 'react';
import DashboardCard from '../components/DashboardCard';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import useFetch from '../hooks/useFetch';
import { adminApi, pricesApi } from '../services';
import { useToast } from '../context/ToastContext';
import { fmtDateTime, money } from '../utils/format';
import { IndianRupee, History, Clock, UserRound } from 'lucide-react';

export default function ChickenPrice() {
  const toast = useToast();
  const current = useFetch(() => pricesApi.current(), []);
  const history = useFetch(() => adminApi.priceHistory(), []);
  const [price, setPrice] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const review = (e) => {
    e.preventDefault();
    if (!(Number(price) > 0)) return toast.error('Price must be greater than 0');
    setConfirm(true);
  };
  const save = async () => {
    setBusy(true);
    try {
      await adminApi.setPrice(Number(price));
      toast.success('Price updated. New sales use this price.');
      setPrice('');
      current.reload();
      history.reload();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); setConfirm(false); }
  };

  const c = current.data;
  const columns = [
    { key: 'price', header: 'Price/kg', render: (r) => money(r.price) },
    { key: 'effective_date', header: 'Effective from', render: (r) => fmtDateTime(r.effective_date) },
    { key: 'updated_by', header: 'Updated by' },
  ];

  return (
    <>
      <div className="page-head"><div><h2>Chicken Price</h2><p className="muted">Salespersons always sell at the latest price. Past sales keep their original price.</p></div></div>
      {current.loading ? <LoadingSpinner /> : current.error ? <ErrorState message={current.error} onRetry={current.reload} /> : (
        <div className="grid-cards">
          <DashboardCard icon={IndianRupee} label="Current price" value={c ? `${money(c.price)} / kg` : 'Not set'} />
          <DashboardCard icon={History} label="Previous price" value={c?.previousPrice != null ? money(c.previousPrice) : '-'} />
          <DashboardCard icon={Clock} label="Updated" value={c ? fmtDateTime(c.effective_date) : '-'} />
          <DashboardCard icon={UserRound} label="Updated by" value={c?.updated_by || '-'} />
        </div>
      )}
      <form className="card section" onSubmit={review}>
        <h3>Update price</h3>
        <div className="inline-form">
          <label className="field">Chicken price per kg (₹)
            <input className="input" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <button className="btn btn-primary">Update Price</button>
        </div>
      </form>
      <div className="card section">
        <h3>Price history</h3>
        <DataTable columns={columns} rows={history.data} loading={history.loading} error={history.error} onRetry={history.reload} emptyMessage="No price changes yet." />
      </div>
      <ConfirmDialog open={confirm} loading={busy} message={`Change the chicken price to ${money(price)} per kg?`} confirmLabel="Update price"
        onConfirm={save} onCancel={() => setConfirm(false)} />
    </>
  );
}
