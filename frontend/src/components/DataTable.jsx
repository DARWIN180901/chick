import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

// columns: [{ key, header, render?(row), align? }]
export default function DataTable({ columns, rows, rowKey = 'id', loading, error, onRetry, emptyMessage = 'No records found.' }) {
  if (loading && !rows?.length) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!rows?.length) return <EmptyState message={emptyMessage} />;
  return (
    <div className={`table-wrap ${loading ? 'is-loading' : ''}`}>
      <table>
        <thead>
          <tr>{columns.map((c) => <th key={c.key} style={{ textAlign: c.align }}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[rowKey]}>
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align }}>{c.render ? c.render(row) : row[c.key] ?? '-'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
