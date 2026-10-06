import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function QuantityChart({ data, xKey = 'label' }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={40} />
        <Tooltip cursor={{ fill: 'var(--accent-soft)' }} contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', fontWeight: 600 }} formatter={(v) => [`${v} kg`, 'Quantity']} />
        <Bar dataKey="quantity" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
