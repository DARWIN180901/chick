import { NavLink } from 'react-router-dom';
import { Drumstick, LogOut } from 'lucide-react';

export default function Sidebar({ items, open, onClose, onLogout, roleLabel = 'Manager' }) {
  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark"><Drumstick size={22} /></span>
          <span className="brand-text"><strong>Chicken Shop</strong><em>{roleLabel}</em></span>
        </div>
        <div className="nav-label">Menu</div>
        <nav className="nav">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <button className="nav-logout" onClick={onLogout}><LogOut size={18} /> Logout</button>
      </aside>
    </>
  );
}
