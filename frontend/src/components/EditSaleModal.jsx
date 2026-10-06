import { useEffect, useState } from 'react';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import { salesApi } from '../services';
import { useToast } from '../context/ToastContext';
import { money } from '../utils/format';

export default function EditSaleModal({ sale, onClose, onSaved }) {
  const toast = useToast();
  const [quantity, setQuantity] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (sale) { setQuantity(String(sale.quantity)); setCouponCode(sale.coupon_code || ''); setConfirm(false); }
  }, [sale]);

  if (!sale) return null;

  const review = () => {
    if (!(Number(quantity) > 0)) return toast.error('Quantity must be greater than 0');
    setConfirm(true);
  };
  const save = async () => {
    setBusy(true);
    try {
      await salesApi.update(sale.id, { quantity: Number(quantity), couponCode: couponCode.trim() });
      toast.success('Sale updated');
      onSaved();
    } catch (e) {
      setConfirm(false);
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  return (
    <>
      <Modal open title={`Edit sale #${sale.id}`} onClose={onClose}
        footer={(<><button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={review}>Save changes</button></>)}>
        <p className="muted">{sale.customer_name} · {sale.customer_phone}</p>
        <div className="form-grid">
          <label className="field">Price per kg (original)
            <input className="input" value={money(sale.price_per_unit)} readOnly />
          </label>
          <label className="field">Quantity (kg)
            <input className="input" type="number" min="0" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>
          <label className="field">Coupon code (leave empty for none)
            <input className="input mono" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
          </label>
        </div>
        <small className="muted">The amount, discount and stock are recalculated by the server when you save.</small>
      </Modal>
      <ConfirmDialog open={confirm} message="Are you sure you want to modify this sale?" confirmLabel="Yes, modify"
        loading={busy} onConfirm={save} onCancel={() => setConfirm(false)} />
    </>
  );
}
