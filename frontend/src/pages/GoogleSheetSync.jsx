import { useState } from 'react';
import { CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import useFetch from '../hooks/useFetch';
import { adminApi } from '../services';
import { useToast } from '../context/ToastContext';
import { fmtDateTime } from '../utils/format';

export default function GoogleSheetSync() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => adminApi.sheetStatus(), []);
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    try {
      const res = await adminApi.sheetRetry();
      const r = res.data;
      if (r.message) toast.error(r.message);
      else if (r.stillUnsynced) toast.error(`${r.stillUnsynced} sale(s) still not synced. Check the error details below.`);
      else toast.success(`Synced ${r.attempted} sale(s)`);
      reload();
    } catch (e) { toast.error(e.message); } finally { setRetrying(false); }
  };

  const columns = [
    { key: 'sale_id', header: 'Sale', render: (r) => `#${r.sale_id}` },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'attempt_count', header: 'Attempts' },
    { key: 'last_attempt', header: 'Last attempt', render: (r) => fmtDateTime(r.last_attempt) },
    { key: 'error_message', header: 'Error', render: (r) => <span style={{ whiteSpace: 'normal' }}>{r.error_message || '-'}</span> },
  ];

  return (
    <>
      <div className="page-head">
        <div><h2>Google Sheets Sync</h2><p className="muted">MySQL is the main record. Sheets is a synced copy for reporting.</p></div>
        <button className="btn btn-primary" onClick={retry} disabled={retrying || loading}><RefreshCw size={16} /> {retrying ? 'Retrying...' : 'Retry Failed Syncs'}</button>
      </div>
      {loading && !data ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <>
          {!data.configured && <div className="notice">Google Sheets is not configured. Add the Google variables to the backend .env file (see README). Sales are still saved and will sync once it is set up.</div>}
          <div className="grid-cards">
            <DashboardCard icon={CheckCircle2} label="Synced" value={data.totals.SYNCED} />
            <DashboardCard icon={Clock} label="Pending" value={data.totals.PENDING} />
            <DashboardCard icon={XCircle} label="Failed" value={data.totals.FAILED} />
          </div>
          <div className="card section">
            <h3>Not yet synced</h3>
            <DataTable columns={columns} rows={data.items} rowKey="sale_id" emptyMessage="Everything is synced." />
          </div>
        </>
      )}
    </>
  );
}
