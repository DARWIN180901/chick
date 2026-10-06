import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

export default function StockAlert({ open, stock, onUpdate, onClose }) {
  return (
    <Modal open={open} title="Low stock alert" onClose={onClose}
      footer={(<><button className="btn btn-ghost" onClick={onClose}>Dismiss</button>
        <button className="btn btn-primary" onClick={onUpdate}>Update stock</button></>)}>
      <div className="alert-body">
        <AlertTriangle size={36} className="bad" />
        <p><strong>Only {stock?.currentStock} kg chicken remaining.</strong></p>
        <p className="muted">Please update stock. (Alert level: {stock?.lowStockThreshold} kg)</p>
      </div>
    </Modal>
  );
}
