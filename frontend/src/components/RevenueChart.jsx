import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { money } from '../utils/format';

const TIP = { borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 12px 30px rgba(0,0,0,.14)', fontWeight: 600 };

export default function RevenueChart({ data, xKey = 'label' }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={56} />
        <Tooltip cursor={{ stroke: 'var(--chart-1)', strokeDasharray: '4 4' }} contentStyle={TIP} formatter={(v) => [money(v), 'Revenue']} />
        <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={3} fill="url(#rev)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
