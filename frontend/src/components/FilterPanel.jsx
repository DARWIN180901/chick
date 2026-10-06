import { Download, RotateCcw, Search } from 'lucide-react';
import DateRangePicker from './DateRangePicker';

export default function FilterPanel({ filters, setFilters, salespersons, onSearch, onReset, onExport, exporting }) {
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  return (
    <form className="filter-panel" onSubmit={(e) => { e.preventDefault(); onSearch(); }}>
      <div className="toolbar">
        <DateRangePicker range={filters.range} from={filters.from} to={filters.to} onChange={set} />
        <select className="input" value={filters.salespersonId} onChange={(e) => set({ salespersonId: e.target.value })}>
          <option value="">All salespersons</option>
          {(salespersons || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input" value={filters.item} onChange={(e) => set({ item: e.target.value })}>
          <option value="">All items</option><option value="Chicken">Chicken</option>
        </select>
        <select className="input" value={filters.coupon} onChange={(e) => set({ coupon: e.target.value })}>
          <option value="">Coupon: any</option><option value="used">Coupon used</option><option value="none">No coupon</option>
        </select>
      </div>
      <div className="toolbar">
        <input className="input grow" placeholder="Customer name or phone" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
        <button className="btn btn-primary"><Search size={16} /> Search</button>
        <button type="button" className="btn btn-ghost" onClick={onReset}><RotateCcw size={16} /> Reset Filters</button>
        <button type="button" className="btn btn-ghost" onClick={onExport} disabled={exporting}><Download size={16} /> {exporting ? 'Exporting...' : 'Export'}</button>
      </div>
    </form>
  );
}
