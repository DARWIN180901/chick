import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Plus } from 'lucide-react';
import DataTable from '../components/DataTable';
import SearchBar from '../components/SearchBar';
import CouponBadge from '../components/CouponBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import EditSaleModal from '../components/EditSaleModal';
import useFetch from '../hooks/useFetch';
import useDebounce from '../hooks/useDebounce';
import { salesApi } from '../services';
import { useToast } from '../context/ToastContext';
import { fmtDate, fmtTime, kg, money } from '../utils/format';

export default function MySales() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [range, setRange] = useState('all');
  const [editing, setEditing] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [busy, setBusy] = useState(false);
  const q = useDebounce(search, 400);

  const { data, loading, error, reload } = useFetch(
    () => salesApi.list({ search: q || undefined, range: range === 'all' ? undefined : range }), [q, range]);

  const cancelSale = async () => {
    setBusy(true);
    try {
      await salesApi.remove(cancelling.id);
      toast.success('Sale cancelled and stock restored');
      setCancelling(null);
      reload();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const columns = [
    { key: 'date', header: 'Date', render: (r) => `${fmtDate(r.sale_date)}, ${fmtTime(r.sale_time)}` },
    { key: 'customer_name', header: 'Customer' },
    { key: 'customer_phone', header: 'Phone' },
    { key: 'item', header: 'Item' },
    { key: 'quantity', header: 'Quantity', render: (r) => kg(r.quantity) },
    { key: 'price_per_unit', header: 'Price', render: (r) => money(r.price_per_unit) },
    { key: 'coupon_code', header: 'Coupon', render: (r) => <CouponBadge code={r.coupon_code} /> },
    { key: 'coupon_discount', header: 'Discount', render: (r) => (r.coupon_discount ? `- ${money(r.coupon_discount)}` : '-') },
    { key: 'final_amount', header: 'Final Amount', render: (r) => <strong>{money(r.final_amount)}</strong> },
    { key: 'actions', header: 'Actions', render: (r) => (
      <div className="actions">
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(r)}><Pencil size={14} /> Edit</button>
        <button className="icon-btn" aria-label="Cancel sale" onClick={() => setCancelling(r)}><Trash2 size={16} /></button>
      </div>
    ) },
  ];

  return (
    <>
      <div className="page-head">
        <div><h2>My Sales</h2><p className="muted">Sales you have recorded.</p></div>
        <Link to="/sales/new" className="btn btn-primary"><Plus size={18} /> Add New Sale</Link>
      </div>
      <div className="card section">
        <div className="toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="Search customer name or phone" />
          <select className="input" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="all">All time</option><option value="today">Today</option>
            <option value="week">This week</option><option value="month">This month</option>
          </select>
          <button className="btn btn-ghost" onClick={() => { setSearch(''); setRange('all'); }}>Reset Filters</button>
        </div>
        <DataTable columns={columns} rows={data} loading={loading} error={error} onRetry={reload}
          emptyMessage="No sales found for the selected filters." />
      </div>
      <EditSaleModal sale={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
      <ConfirmDialog open={Boolean(cancelling)} danger title="Cancel this sale?" confirmLabel="Cancel sale" loading={busy}
        message={cancelling ? `Sale #${cancelling.id} (${cancelling.quantity} kg) will be removed and the stock returned.` : ''}
        onConfirm={cancelSale} onCancel={() => setCancelling(null)} />
    </>
  );
}
