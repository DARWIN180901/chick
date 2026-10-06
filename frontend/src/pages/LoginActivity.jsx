import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import useFetch from '../hooks/useFetch';
import { adminApi } from '../services';
import { fmtDate, fmtTime } from '../utils/format';

export default function LoginActivity() {
  const { data, loading, error, reload } = useFetch(() => adminApi.loginActivity(), []);
  const columns = [
    { key: 'name', header: 'Salesperson', render: (r) => `${r.name} (${r.username})` },
    { key: 'login_date', header: 'Login Date', render: (r) => fmtDate(r.login_date) },
    { key: 'login_time', header: 'Login Time', render: (r) => fmtTime(r.login_time) },
    { key: 'logout_time', header: 'Logout Time', render: (r) => (r.logout_time ? `${fmtDate(r.logout_date)}, ${fmtTime(r.logout_time)}` : '-') },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'ip_address', header: 'IP address', render: (r) => r.ip_address || '-' },
  ];
  return (
    <>
      <div className="page-head"><div><h2>Login Activity</h2><p className="muted">Salesperson sign-ins, newest first.</p></div>
        <button className="btn btn-ghost" onClick={reload}>Refresh</button></div>
      <div className="card section">
        <DataTable columns={columns} rows={data} loading={loading} error={error} onRetry={reload} emptyMessage="No logins recorded yet." />
      </div>
    </>
  );
}
