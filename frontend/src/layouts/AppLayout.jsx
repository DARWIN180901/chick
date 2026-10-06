import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import { useAuth } from '../context/AuthContext';
import { ADMIN_NAV, SALES_NAV } from './navConfig';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  // Role-based theme: Ember (salesperson) / Midnight (admin). Set on <html> so modals and toasts inherit it too.
  const theme = user.role === 'ADMIN' ? 'admin' : 'sales';
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    return () => document.documentElement.removeAttribute('data-theme');
  }, [theme]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app" data-theme={theme}>
      <Sidebar
        items={user.role === 'ADMIN' ? ADMIN_NAV : SALES_NAV}
        open={open}
        onClose={() => setOpen(false)}
        onLogout={handleLogout}
        roleLabel={user.role === 'ADMIN' ? 'Admin Console' : 'Sales Desk'}
      />
      <div className="main">
        <TopNavbar user={user} onMenu={() => setOpen(true)} />
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
