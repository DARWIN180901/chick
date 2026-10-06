import { useState } from 'react';
import { IndianRupee, ReceiptText, Scale } from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import RevenueChart from '../components/RevenueChart';
import QuantityChart from '../components/QuantityChart';
import SalesChart from '../components/SalesChart';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import useFetch from '../hooks/useFetch';
import { adminApi } from '../services';
import { fillHours, lastSevenDays, thisMonth } from '../utils/chartData';
import { kg, money } from '../utils/format';

function Panel({ title, state, children }) {
  return (
    <div className="card section">
      <h3>{title}</h3>
      {state.loading ? <LoadingSpinner /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : children}
    </div>
  );
}

function SummaryRow({ title, state }) {
  const s = state.data?.summary;
  return (
    <>
      <div className="group-title">{title}</div>
      <div className="grid-cards">
        <DashboardCard icon={IndianRupee} label="Revenue" value={s ? money(s.revenue) : '-'} />
        <DashboardCard icon={Scale} label="Quantity sold" value={s ? kg(s.quantity) : '-'} />
        <DashboardCard icon={ReceiptText} label="Transactions" value={s ? s.transactions : '-'} />
      </div>
    </>
  );
}

export default function Analytics() {
  const [range, setRange] = useState('month');
  const daily = useFetch(() => adminApi.analytics('daily'), []);
  const weekly = useFetch(() => adminApi.analytics('weekly'), []);
  const monthly = useFetch(() => adminApi.analytics('monthly'), []);
  const people = useFetch(() => adminApi.analytics('salespersons', { range }), [range]);

  const monthData = monthly.data ? thisMonth(monthly.data.series) : [];
  const columns = [
    { key: 'name', header: 'Salesperson' },
    { key: 'sales_count', header: 'Sales' },
    { key: 'quantity', header: 'Quantity sold', render: (r) => kg(r.quantity) },
    { key: 'revenue', header: 'Revenue', render: (r) => money(r.revenue) },
  ];

  return (
    <>
      <div className="page-head"><div><h2>Analytics</h2><p className="muted">Calculated from recorded sales.</p></div></div>
      <SummaryRow title="Today" state={daily} />
      <SummaryRow title="Last 7 days" state={weekly} />
      <SummaryRow title="This month" state={monthly} />

      <div className="group-title">Charts</div>
      <div className="charts">
        <Panel title="Daily sales (revenue by hour)" state={daily}>{daily.data && <RevenueChart data={fillHours(daily.data.series)} />}</Panel>
        <Panel title="Weekly sales (revenue per day)" state={weekly}>{weekly.data && <RevenueChart data={lastSevenDays(weekly.data.series)} />}</Panel>
        <Panel title="Monthly sales (revenue per date)" state={monthly}><RevenueChart data={monthData} /></Panel>
        <Panel title="Quantity sold this month" state={monthly}><QuantityChart data={monthData} /></Panel>
      </div>

      <div className="card section" style={{ marginTop: 20 }}>
        <div className="page-head" style={{ marginBottom: 8 }}>
          <h3>Salesperson performance</h3>
          <select className="input" style={{ width: 'auto' }} value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="today">Today</option><option value="week">This week</option>
            <option value="month">This month</option><option value="all">All time</option>
          </select>
        </div>
        {people.loading ? <LoadingSpinner /> : people.error ? <ErrorState message={people.error} onRetry={people.reload} /> : (
          <>
            <SalesChart data={people.data} />
            <DataTable columns={columns} rows={people.data} emptyMessage="No salespersons found." />
          </>
        )}
      </div>
    </>
  );
}
