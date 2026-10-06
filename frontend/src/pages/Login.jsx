import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Drumstick } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const homeFor = (user) => (user.role === 'ADMIN' ? '/admin' : '/dashboard');

export default function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) return toast.error('Enter your username and password');
    setBusy(true);
    try {
      const u = await login(form.username.trim(), form.password);
      navigate(homeFor(u), { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={submit}>
        <div className="login-logo"><Drumstick size={28} /></div>
        <h1>Chicken Shop Manager</h1>
        <p className="muted">Sign in to continue</p>
        <label className="field">Username
          <input className="input" autoFocus autoComplete="username" value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })} />
        </label>
        <label className="field">Password
          <input className="input" type="password" autoComplete="current-password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
        <div className="login-theme-hint"><i>Salesperson</i><i>Admin</i></div>
      </form>
    </div>
  );
}
