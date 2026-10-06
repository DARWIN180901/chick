import { Inbox } from 'lucide-react';

export default function EmptyState({ message = 'Nothing to show yet.', action }) {
  return (
    <div className="state">
      <Inbox size={32} className="muted" />
      <p>{message}</p>
      {action}
    </div>
  );
}
