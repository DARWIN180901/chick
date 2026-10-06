import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import AppLayout from './layouts/AppLayout';
import { useAuth } from './context/AuthContext';
import Login, { homeFor } from './pages/Login';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';
import AdminDashboard from './pages/AdminDashboard';
import AdminSales from './pages/AdminSales';
import Analytics from './pages/Analytics';
import AdminCustomers from './pages/AdminCustomers';
import Coupons from './pages/Coupons';
import ChickenPrice from './pages/ChickenPrice';
import StockManagement from './pages/StockManagement';
import LoginActivity from './pages/LoginActivity';
import GoogleSheetSync from './pages/GoogleSheetSync';
import SalesDashboard from './pages/SalesDashboard';
import AddSale from './pages/AddSale';
import MySales from './pages/MySales';
import CustomerList from './pages/CustomerList';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  return <Navigate to={user ? homeFor(user) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute role="SALESPERSON" />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<SalesDashboard />} />
          <Route path="/sales/new" element={<AddSale />} />
          <Route path="/sales" element={<MySales />} />
          <Route path="/customers" element={<CustomerList />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="ADMIN" />}>
        <Route element={<AppLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/sales" element={<AdminSales />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/customers" element={<AdminCustomers />} />
          <Route path="/admin/coupons" element={<Coupons />} />
          <Route path="/admin/price" element={<ChickenPrice />} />
          <Route path="/admin/stock" element={<StockManagement />} />
          <Route path="/admin/login-activity" element={<LoginActivity />} />
          <Route path="/admin/google-sheets" element={<GoogleSheetSync />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
