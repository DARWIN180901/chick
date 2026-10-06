import { useState } from 'react';
import DataTable from '../components/DataTable';
import FilterPanel from '../components/FilterPanel';
import CouponBadge from '../components/CouponBadge';
import useFetch from '../hooks/useFetch';
import { adminApi, salesApi } from '../services';
import { useToast } from '../context/ToastContext';
import { downloadBlob } from '../utils/download';
import { fmtDate, fmtTime, kg, money } from '../utils/format';

const EMPTY = { range: 'all', from: '', to: '', salespersonId: '', item: '', coupon: '', search: '' };

// Turn the filter form into API params (empty values are dropped).
function toParams(f) {
  const p = {};
  if (f.range !== 'all') p.range = f.range;
  if (f.range === 'custom') { p.from = f.from; p.to = f.to; }
  ['salespersonId', 'item', 'coupon'].forEach((k) => { if (f[k]) p[k] = f[k]; });
  if (f.search.trim()) p.search = f.search.trim();
  return p;
}

export default function AdminSales() {
  const toast = useToast();
  const [filters, setFilters] = useState(EMPTY);
  const [applied, setApplied] = useState({});
  const [exporting, setExporting] = useState(false);
  const people = useFetch(() => adminApi.salespersons(), []);
  const { data, loading, error, reload } = useFetch(() => salesApi.list(applied), [applied]);

  const search = () => {
    if (filters.range === 'custom' && (!filters.from || !filters.to)) return toast.error('Choose both a start and an end date');
    setApplied(toParams(filters));
  };
  const reset = () => { setFilters(EMPTY); setApplied({}); };
  const exportCsv = async () => {
    setExporting(true);
    try { downloadBlob(await adminApi.exportSales(applied), 'sales.csv'); }
    catch (e) { toast.error(e.message); } finally { setExporting(false); }
  };

  const columns = [
    { key: 'id', header: 'Sale ID', render: (r) => `#${r.id}` },
    { key: 'sale_date', header: 'Date', render: (r) => fmtDate(r.sale_date) },
    { key: 'sale_time', header: 'Time', render: (r) => fmtTime(r.sale_time) },
    { key: 'salesperson', header: 'Salesperson' },
    { key: 'customer_name', header: 'Customer' },
    { key: 'customer_phone', header: 'Phone' },
    { key: 'customer_email', header: 'Email', render: (r) => r.customer_email || '-' },
    { key: 'item', header: 'Item' },
    { key: 'quantity', header: 'Quantity', render: (r) => kg(r.quantity) },
    { key: 'price_per_unit', header: 'Price/kg', render: (r) => money(r.price_per_unit) },
    { key: 'subtotal', header: 'Subtotal', render: (r) => money(r.subtotal) },
    { key: 'coupon_code', header: 'Coupon', render: (r) => <CouponBadge code={r.coupon_code} /> },
    { key: 'coupon_discount', header: 'Discount', render: (r) => (r.coupon_discount ? `- ${money(r.coupon_discount)}` : '-') },
    { key: 'final_amount', header: 'Final Amount', render: (r) => <strong>{money(r.final_amount)}</strong> },
  ];
  const total = (data || []).reduce((s, r) => s + r.final_amount, 0);

  return (
    <>
      <div className="page-head"><div><h2>Sales</h2><p className="muted">All sales across salespersons.</p></div></div>
      <div className="card section">
        <FilterPanel filters={filters} setFilters={setFilters} salespersons={people.data} onSearch={search} onReset={reset}
          onExport={exportCsv} exporting={exporting} />
        <DataTable columns={columns} rows={data} loading={loading} error={error} onRetry={reload} emptyMessage="No sales found for the selected filters." />
        {data?.length > 0 && <div className="table-foot">{data.length} sales · {money(total)} total</div>}
      </div>
    </>
  );
}
