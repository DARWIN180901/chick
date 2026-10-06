import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../services';
import { TOKEN_KEY } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    authApi.me()
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const res = await authApi.login({ username, password });
    localStorage.setItem(TOKEN_KEY, res.data.token);
    sessionStorage.removeItem('lowStockSeen');
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* token may already be expired */ }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}
