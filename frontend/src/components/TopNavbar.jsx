import { Menu } from 'lucide-react';
import dayjs from 'dayjs';

export default function TopNavbar({ user, onMenu }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Open menu"><Menu size={22} /></button>
        <div className="topbar-date">{dayjs().format('dddd, DD MMM YYYY')}</div>
      </div>
      <div className="topbar-user">
        <div className="avatar">{user.name?.[0] || '?'}</div>
        <div>
          <div className="topbar-name">{user.name}</div>
          <div className="topbar-role">{user.role === 'ADMIN' ? 'Admin' : 'Salesperson'}</div>
        </div>
      </div>
    </header>
  );
}
