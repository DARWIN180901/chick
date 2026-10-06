import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Ticket, Check } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import useDebounce from '../hooks/useDebounce';
import { couponsApi, customersApi, pricesApi, salesApi } from '../services';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import { cleanPhone, isValidPhone, money } from '../utils/format';

const EMPTY = { name: '', phone: '', email: '', item: 'Chicken', quantity: '', couponCode: '' };

export default function AddSale() {
  const toast = useToast();
  const navigate = useNavigate();
  const price = useFetch(() => pricesApi.current(), []);
  const [form, setForm] = useState(EMPTY);
  const [customerFound, setCustomerFound] = useState(null); // null = unknown, true/false after lookup
  const [applied, setApplied] = useState(null);
  const [applying, setApplying] = useState(false);
  const [busy, setBusy] = useState(false);

  const phone = cleanPhone(form.phone);
  const debouncedPhone = useDebounce(phone, 400);
  const debouncedQty = useDebounce(form.quantity, 500);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Look the customer up by phone and auto-fill their details.
  useEffect(() => {
    if (!isValidPhone(debouncedPhone)) { setCustomerFound(null); return; }
    customersApi.lookup(debouncedPhone).then((res) => {
      if (res.data) {
        setCustomerFound(true);
        setForm((f) => ({ ...f, name: res.data.name, email: res.data.email || '' }));
      } else setCustomerFound(false);
    }).catch(() => setCustomerFound(null));
  }, [debouncedPhone]);

  const applyCoupon = async (silent = false) => {
    const qty = Number(form.quantity);
    if (!form.couponCode.trim()) return toast.error('Enter a coupon code');
    if (!isValidPhone(phone)) return toast.error('Enter the customer phone number first');
    if (!(qty > 0)) return toast.error('Enter the quantity first');
    setApplying(true);
    try {
      const res = await couponsApi.validate({ phone, quantity: qty, couponCode: form.couponCode.trim() });
      setApplied(res.data);
      if (!silent) toast.success('Coupon applied');
    } catch (e) {
      setApplied(null);
      toast.error(e.message);
    } finally { setApplying(false); }
  };

  // Keep the discount correct if the quantity changes after applying a coupon.
  useEffect(() => {
    if (applied && Number(debouncedQty) > 0) applyCoupon(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQty]);

  if (price.loading) return <LoadingSpinner label="Loading current price..." />;
  if (price.error) return <ErrorState message={price.error} onRetry={price.reload} />;

  const unitPrice = price.data?.price ?? null;
  const qty = Number(form.quantity) > 0 ? Number(form.quantity) : 0;
  const subtotal = unitPrice ? Math.round(unitPrice * qty * 100) / 100 : 0;
  const appliedOk = applied && Math.abs(applied.subtotal - subtotal) < 0.005;
  const discount = appliedOk ? applied.discount : 0;
  const finalAmount = Math.max(subtotal - discount, 0);
  const now = dayjs();

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Customer name is required');
    if (!isValidPhone(phone)) return toast.error('Enter a valid phone number');
    if (!(qty > 0)) return toast.error('Quantity must be greater than 0');
    if (form.couponCode.trim() && !applied) return toast.error('Apply the coupon, or clear the coupon field');
    setBusy(true);
    try {
      await salesApi.create({
        customer: { name: form.name.trim(), phone, email: form.email.trim() },
        item: form.item,
        quantity: qty,
        couponCode: applied ? form.couponCode.trim() : '',
      });
      toast.success('Sale recorded');
      navigate('/sales');
    } catch (err) {
      toast.error(err.message);
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="page-head"><div><h2>Add Sale</h2><p className="muted">Price is set by the admin and calculated by the server.</p></div></div>
      {!unitPrice && <div className="notice">The chicken price has not been set yet. Ask the admin to set it before recording sales.</div>}
      <form className="split" onSubmit={submit}>
        <div className="card section">
          <h3>Customer</h3>
          <div className="form-grid">
            <label className="field">Phone number *
              <input className="input" inputMode="tel" value={form.phone}
                onChange={(e) => { setForm((f) => ({ ...f, phone: e.target.value })); setApplied(null); }} />
              {customerFound === true && <small className="ok">Existing customer found</small>}
              {customerFound === false && <small className="muted">New customer, will be added</small>}
            </label>
            <label className="field">Customer name *
              <input className="input" value={form.name} onChange={set('name')} disabled={customerFound === true} />
            </label>
            <label className="field">Email (optional)
              <input className="input" type="email" value={form.email} onChange={set('email')} disabled={customerFound === true} />
            </label>
          </div>

          <h3>Sale</h3>
          <div className="form-grid">
            <label className="field">Item
              <select className="input" value={form.item} onChange={set('item')}><option>Chicken</option></select>
            </label>
            <label className="field">Quantity (kg) *
              <input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={form.quantity} onChange={set('quantity')} />
            </label>
            <label className="field">Current price
              <input className="input" value={unitPrice ? `${money(unitPrice)} / kg` : 'Not set'} readOnly />
            </label>
            <label className="field">Sale date
              <input className="input" value={now.format('DD MMM YYYY')} readOnly />
            </label>
            <label className="field">Sale time
              <input className="input" value={now.format('hh:mm A')} readOnly />
            </label>
          </div>

          <h3>Coupon (optional)</h3>
          <div className="coupon-row">
            <input className="input mono" placeholder="CHICK-XXXXX" value={form.couponCode}
              onChange={(e) => { setForm((f) => ({ ...f, couponCode: e.target.value.toUpperCase() })); setApplied(null); }} />
            <button type="button" className="btn btn-ghost" onClick={() => applyCoupon()} disabled={applying}>
              <Ticket size={16} /> {applying ? 'Checking...' : 'Apply Coupon'}
            </button>
          </div>
          {applied && <small className="ok"><Check size={14} /> Coupon {applied.couponCode} applied</small>}
        </div>

        <div className="card section summary">
          <h3>Summary</h3>
          <div className="row"><span>Price per kg</span><span>{unitPrice ? money(unitPrice) : '-'}</span></div>
          <div className="row"><span>Quantity</span><span>{qty} kg</span></div>
          <div className="row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div className="row"><span>Coupon</span><span className={discount ? 'ok' : ''}>{discount ? `- ${money(discount)}` : '-'}</span></div>
          <div className="row total"><span>Final amount</span><span>{money(finalAmount)}</span></div>
          <button className="btn btn-primary btn-block" disabled={busy || !unitPrice}>{busy ? 'Saving...' : 'Save Sale'}</button>
          <small className="muted">The final amount is recalculated and stock is checked when you save.</small>
        </div>
      </form>
    </>
  );
}
