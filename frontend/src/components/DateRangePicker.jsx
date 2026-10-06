export default function DateRangePicker({ range, from, to, onChange }) {
  return (
    <>
      <select className="input" value={range} onChange={(e) => onChange({ range: e.target.value, from, to })}>
        <option value="all">All dates</option>
        <option value="today">Today</option>
        <option value="yesterday">Yesterday</option>
        <option value="week">This week</option>
        <option value="month">This month</option>
        <option value="custom">Custom range</option>
      </select>
      {range === 'custom' && (
        <>
          <input className="input" type="date" value={from} onChange={(e) => onChange({ range, from: e.target.value, to })} aria-label="From date" />
          <input className="input" type="date" value={to} onChange={(e) => onChange({ range, from, to: e.target.value })} aria-label="To date" />
        </>
      )}
    </>
  );
}
