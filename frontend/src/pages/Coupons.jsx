import { useState } from 'react';
import dayjs from 'dayjs';
import { MessageCircle, Plus } from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusBadge from '../components/StatusBadge';
import useFetch from '../hooks/useFetch';
import { adminApi, customersApi } from '../services';
import { useToast } from '../context/ToastContext';
import { fmtDate, money } from '../utils/format';

const TABS = [['ALL', 'All'], ['ACTIVE', 'Active'], ['USED', 'Used'], ['EXPIRED', 'Expired']];
const EMPTY = { customerId: '', discountAmount: '', expiryDate: '' };

export default function Coupons() {
  const toast = useToast();
  const [tab, setTab] = useState('ALL');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null); // { id, couponCode }
  const [sendingId, setSendingId] = useState(null);

  const list = useFetch(() => adminApi.coupons({ status: tab === 'ALL' ? undefined : tab }), [tab]);
  const customers = useFetch(() => customersApi.list(), []);
  const customer = (customers.data || []).find((c) => String(c.id) === String(form.customerId));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const closeModal = () => { setOpen(false); setForm(EMPTY); setCreated(null); setConfirm(false); };
  const review = () => {
    if (!form.customerId) return toast.error('Select a customer');
    if (!(Number(form.discountAmount) > 0)) return toast.error('Discount must be greater than 0');
    if (!form.expiryDate) return toast.error('Choose an expiry date');
    setConfirm(true);
  };
  const generate = async () => {
    setBusy(true);
    try {
      const res = await adminApi.createCoupon({ customerId: Number(form.customerId), discountAmount: Number(form.discountAmount), expiryDate: form.expiryDate });
      setCreated(res.data);
      toast.success('Coupon generated');
      list.reload();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); setConfirm(false); }
  };
  const send = async (id) => {
    setSendingId(id);
    try { await adminApi.sendCoupon(id); toast.success('Coupon sent via WhatsApp'); }
    catch (e) { toast.error(e.message); } finally { setSendingId(null); }
  };

  const columns = [
    { key: 'coupon_code', header: 'Code', render: (r) => <span className="badge badge-accent mono">{r.coupon_code}</span> },
    { key: 'customer_name', header: 'Customer', render: (r) => `${r.customer_name} (${r.customer_phone})` },
    { key: 'discount_amount', header: 'Discount', render: (r) => money(r.discount_amount) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'expiry_date', header: 'Expires', render: (r) => fmtDate(r.expiry_date) },
    { key: 'used_at', header: 'Used on', render: (r) => (r.used_at ? fmtDate(r.used_at) : '-') },
    { key: 'actions', header: 'Actions', render: (r) => (r.status === 'ACTIVE' ? (
      <button className="btn btn-ghost btn-sm" disabled={sendingId === r.id} onClick={() => send(r.id)}>
        <MessageCircle size={14} /> {sendingId === r.id ? 'Sending...' : 'Send via WhatsApp'}
      </button>) : '-') },
  ];

  return (
    <>
      <div className="page-head">
        <div><h2>Coupons</h2><p className="muted">Generate customer coupons and send them on WhatsApp.</p></div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> Generate Coupon</button>
      </div>
      <div className="card section">
        <div className="tabs">
          {TABS.map(([key, label]) => (
            <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>
        <DataTable columns={columns} rows={list.data} loading={list.loading} error={list.error} onRetry={list.reload} emptyMessage="No coupons found." />
      </div>

      <Modal open={open} title={created ? 'Coupon ready' : 'Generate coupon'} onClose={closeModal}
        footer={created ? (
          <>
            <button className="btn btn-ghost" onClick={closeModal}>Done</button>
            <button className="btn btn-primary" disabled={sendingId === created.id} onClick={() => send(created.id)}>
              <MessageCircle size={16} /> {sendingId === created.id ? 'Sending...' : 'Send via WhatsApp'}
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={review}>Generate Coupon</button>
          </>
        )}>
        {created ? (
          <div className="alert-body">
            <p className="muted">Coupon for {customer?.name}</p>
            <h2 className="mono">{created.couponCode}</h2>
            <p>{money(form.discountAmount)} off · valid until {fmtDate(form.expiryDate)}</p>
          </div>
        ) : (
          <div className="form-grid">
            <label className="field">Customer
              <select className="input" value={form.customerId} onChange={set('customerId')}>
                <option value="">Select customer</option>
                {(customers.data || []).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
              </select>
            </label>
            <label className="field">Discount amount (₹)
              <input className="input" type="number" min="1" step="1" value={form.discountAmount} onChange={set('discountAmount')} />
            </label>
            <label className="field">Expiry date
              <input className="input" type="date" min={dayjs().format('YYYY-MM-DD')} value={form.expiryDate} onChange={set('expiryDate')} />
            </label>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={confirm} loading={busy} message={`Generate ${money(form.discountAmount)} coupon for ${customer?.name || 'this customer'}?`}
        confirmLabel="Generate" onConfirm={generate} onCancel={() => setConfirm(false)} />
    </>
  );
}
