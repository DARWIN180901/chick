import { useState } from 'react';
import DataTable from '../components/DataTable';
import SearchBar from '../components/SearchBar';
import useFetch from '../hooks/useFetch';
import useDebounce from '../hooks/useDebounce';
import { customersApi } from '../services';

export default function CustomerList() {
  const [search, setSearch] = useState('');
  const q = useDebounce(search, 400);
  const { data, loading, error, reload } = useFetch(() => customersApi.list({ search: q || undefined }), [q]);
  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'phone', header: 'Phone' },
    { key: 'email', header: 'Email', render: (r) => r.email || '-' },
  ];
  return (
    <>
      <div className="page-head"><div><h2>Customers</h2><p className="muted">Customers are added automatically when you record a sale.</p></div></div>
      <div className="card section">
        <div className="toolbar"><SearchBar value={search} onChange={setSearch} placeholder="Search name or phone" /></div>
        <DataTable columns={columns} rows={data} loading={loading} error={error} onRetry={reload} emptyMessage="No customers found." />
      </div>
    </>
  );
}
