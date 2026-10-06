import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import DataTable from '../components/DataTable';
import SearchBar from '../components/SearchBar';
import Modal from '../components/Modal';
import useFetch from '../hooks/useFetch';
import useDebounce from '../hooks/useDebounce';
import { adminApi, customersApi } from '../services';
import { useToast } from '../context/ToastContext';
import { cleanPhone, fmtDate, isValidPhone } from '../utils/format';

export default function AdminCustomers() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // { id?, name, phone, email }
  const [busy, setBusy] = useState(false);
  const q = useDebounce(search, 400);
  const { data, loading, error, reload } = useFetch(() => customersApi.list({ search: q || undefined }), [q]);

  const save = async () => {
    if (!editing.name.trim()) return toast.error('Customer name is required');
    if (!isValidPhone(editing.phone)) return toast.error('Enter a valid phone number');
    const body = { name: editing.name.trim(), phone: cleanPhone(editing.phone), email: editing.email.trim() };
    setBusy(true);
    try {
      if (editing.id) await adminApi.updateCustomer(editing.id, body);
      else await adminApi.createCustomer(body);
      toast.success(editing.id ? 'Customer updated' : 'Customer added');
      setEditing(null);
      reload();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'phone', header: 'Phone' },
    { key: 'email', header: 'Email', render: (r) => r.email || '-' },
    { key: 'created_at', header: 'Added', render: (r) => fmtDate(r.created_at) },
    { key: 'actions', header: 'Actions', render: (r) => (
      <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ id: r.id, name: r.name, phone: r.phone, email: r.email || '' })}>
        <Pencil size={14} /> Edit
      </button>) },
  ];
  const set = (k) => (e) => setEditing((c) => ({ ...c, [k]: e.target.value }));

  return (
    <>
      <div className="page-head">
        <div><h2>Customers</h2><p className="muted">Everyone who has bought from, or been added to, the shop.</p></div>
        <button className="btn btn-primary" onClick={() => setEditing({ name: '', phone: '', email: '' })}><Plus size={18} /> Add Customer</button>
      </div>
      <div className="card section">
        <div className="toolbar"><SearchBar value={search} onChange={setSearch} placeholder="Search name or phone" /></div>
        <DataTable columns={columns} rows={data} loading={loading} error={error} onRetry={reload} emptyMessage="No customers found." />
      </div>
      <Modal open={Boolean(editing)} title={editing?.id ? 'Edit customer' : 'Add customer'} onClose={() => setEditing(null)}
        footer={(<><button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save'}</button></>)}>
        {editing && (
          <div className="form-grid">
            <label className="field">Name *<input className="input" value={editing.name} onChange={set('name')} /></label>
            <label className="field">Phone *<input className="input" inputMode="tel" value={editing.phone} onChange={set('phone')} /></label>
            <label className="field">Email<input className="input" type="email" value={editing.email} onChange={set('email')} /></label>
          </div>
        )}
      </Modal>
    </>
  );
}
