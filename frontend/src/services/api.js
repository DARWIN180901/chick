import axios from 'axios';

export const TOKEN_KEY = 'cs_token';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Responses resolve to the API body ({ success, data, message }).
// Errors always carry a user-friendly `message`.
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status;
    if (status === 401 && !String(err.config?.url).includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    err.message = err.response?.data?.message
      || (err.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : 'Network error. Please check your connection.');
    return Promise.reject(err);
  },
);

export default api;
