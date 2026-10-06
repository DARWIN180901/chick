import { useEffect, useState } from 'react';
import { Boxes, PackagePlus, ShoppingBasket, Warehouse, Trash2 } from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import useFetch from '../hooks/useFetch';
import { adminApi } from '../services'; // Make sure adminApi.adjustStock is defined in your services!
import { useToast } from '../context/ToastContext';
import { fmtDateTime, kg } from '../utils/format';

export default function StockManagement() {
  const toast = useToast();
  const stock = useFetch(() => adminApi.stock(), []);
  const history = useFetch(() => adminApi.stockHistory(), []);
  
  const [actionType, setActionType] = useState('STOCK_ADDED');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [threshold, setThreshold] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (stock.data) setThreshold(String(stock.data.lowStockThreshold)); }, [stock.data]);

  const reloadAll = () => { stock.reload(); history.reload(); };

  const review = (e) => {
    e.preventDefault();
    if (!(Number(qty) > 0)) return toast.error('Quantity must be greater than 0');
    
    setConfirm(true);
  };

  const submitAdjustment = async () => {
    setBusy(true);
    try {
      // If reducing stock, send a negative number
      const finalQty = actionType === 'CORRECTION_REMOVE' ? -Math.abs(Number(qty)) : Math.abs(Number(qty));
      
      // Call the new backend adjustStock endpoint
      await adminApi.adjustStock({ 
        quantity: finalQty, 
        type: actionType,
        note: note.trim() || 'New stock added' 
      });
      
      toast.success(`Stock successfully adjusted`);
      setQty('');
      setNote('');
      reloadAll();
    } catch (e) { 
      toast.error(e.message); 
    } finally { 
      setBusy(false); 
      setConfirm(false); 
    }
  };

  const saveThreshold = async (e) => {
    e.preventDefault();
    if (!(Number(threshold) >= 0) || threshold === '') return toast.error('Enter a valid threshold');
    try { 
      await adminApi.setThreshold(Number(threshold)); 
      toast.success('Low stock threshold updated'); 
      stock.reload(); 
    }
    catch (err) { toast.error(err.message); }
  };

  const s = stock.data;
  const columns = [
    { key: 'created_at', header: 'When', render: (r) => fmtDateTime(r.created_at) },
    { key: 'type', header: 'Type', render: (r) => <StatusBadge status={r.type} /> },
    { key: 'quantity', header: 'Change', render: (r) => <strong className={r.quantity < 0 ? 'bad' : 'ok'}>{r.quantity > 0 ? '+' : ''}{r.quantity} kg</strong> },
    { key: 'description', header: 'Details', render: (r) => r.description || '-' },
    { key: 'created_by', header: 'By' },
  ];

  return (
    <>
      <div className="page-head"><div><h2>Stock Management</h2><p className="muted">Live bird stock tracker (includes wastage calculations).</p></div></div>
      {stock.loading && !s ? <LoadingSpinner /> : stock.error ? <ErrorState message={stock.error} onRetry={stock.reload} /> : s && (
        <>
          {s.isLowStock && <div className="notice bad-notice">Low stock: only {kg(s.currentStock)} left. Please add stock.</div>}
          <div className="grid-cards">
            <DashboardCard icon={Boxes} label="Live Stock Remaining" value={kg(s.currentStock)} />
            <DashboardCard icon={PackagePlus} label="Total Stock Added" value={kg(s.totalAdded)} />
            <DashboardCard icon={ShoppingBasket} label="Meat Sold" value={kg(s.totalSold)} />
            <DashboardCard icon={Trash2} label="Est. Wastage (Feathers/Legs)" value={kg(s.totalWastage)} />
          </div>
        </>
      )}
      
      <div className="charts" style={{ marginBottom: 20 }}>
        <form className="card section" onSubmit={review}>
          <h3>Update or Correct Stock</h3>
          <div className="inline-form" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <label className="field">Action
              <select className="input" value={actionType} onChange={(e) => setActionType(e.target.value)}>
                <option value="STOCK_ADDED">Add New Stock (+)</option>
                <option value="CORRECTION_ADD">Correct Mistake - Add (+)</option>
                <option value="CORRECTION_REMOVE">Correct Mistake - Remove (-)</option>
              </select>
            </label>
            <label className="field">Quantity (kg)
              <input className="input" type="number" min="0" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 50" />
            </label>
            
            <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>Update</button>
          </div>
        </form>

        <form className="card section" onSubmit={saveThreshold}>
          <h3>Low stock threshold</h3>
          <div className="inline-form">
            <label className="field">Alert when stock is at or below (kg)
              <input className="input" type="number" min="0" step="0.01" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            </label>
            <button className="btn btn-ghost">Save</button>
          </div>
        </form>
      </div>

      <div className="card section">
        <h3>Stock history</h3>
        <DataTable columns={columns} rows={history.data} loading={history.loading} error={history.error} onRetry={history.reload} emptyMessage="No stock activity yet." />
      </div>
      
      <ConfirmDialog 
        open={confirm} 
        loading={busy} 
        message={`Are you sure you want to ${actionType === 'CORRECTION_REMOVE' ? 'REMOVE' : 'ADD'} ${qty} kg ${actionType === 'STOCK_ADDED' ? 'to' : 'from'} current stock?`} 
        confirmLabel="Confirm"
        onConfirm={submitAdjustment} 
        onCancel={() => setConfirm(false)} 
      />
    </>
  );
}