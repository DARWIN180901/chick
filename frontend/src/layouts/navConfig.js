import {
  LayoutDashboard, PlusCircle, Receipt, Users, BarChart3, Ticket, Tag, Boxes, History, Sheet,
} from 'lucide-react';

export const SALES_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/sales/new', label: 'Add Sale', icon: PlusCircle },
  { to: '/sales', label: 'My Sales', icon: Receipt },
  { to: '/customers', label: 'Customers', icon: Users },
];

export const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/sales', label: 'Sales', icon: Receipt },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { to: '/admin/price', label: 'Chicken Price', icon: Tag },
  { to: '/admin/stock', label: 'Stock Management', icon: Boxes },
  { to: '/admin/login-activity', label: 'Login Activity', icon: History },
  { to: '/admin/google-sheets', label: 'Google Sheets Sync', icon: Sheet },
];
