import api from './api';

export const authApi = {
  login: (body) => api.post('/auth/login', body),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};
export const salesApi = {
  list: (params) => api.get('/sales', { params }),
  create: (body) => api.post('/sales', body),
  update: (id, body) => api.put(`/sales/${id}`, body),
  remove: (id) => api.delete(`/sales/${id}`),
};
export const customersApi = {
  list: (params) => api.get('/customers', { params }),
  lookup: (phone) => api.get(`/customers/lookup/${encodeURIComponent(phone)}`),
};
export const pricesApi = { current: () => api.get('/prices/current') };
export const couponsApi = { validate: (body) => api.post('/coupons/validate', body) };

export const adminApi = {
  salespersons: () => api.get('/users/salespersons'),
  exportSales: (params) => api.get('/sales/export', { params, responseType: 'blob' }),
  createCustomer: (body) => api.post('/customers', body),
  updateCustomer: (id, body) => api.put(`/customers/${id}`, body),
  stock: () => api.get('/stock'),
  // REPLACE WITH THIS:
  adjustStock: (data) => api.post('/stock', data),
  setThreshold: (threshold) => api.put('/stock/threshold', { threshold }),
  stockHistory: () => api.get('/stock/history'),
  priceHistory: () => api.get('/prices/history'),
  setPrice: (price) => api.post('/prices', { price }),
  coupons: (params) => api.get('/coupons', { params }),
  createCoupon: (body) => api.post('/coupons', body),
  sendCoupon: (id) => api.post(`/coupons/${id}/send-whatsapp`),
  analytics: (kind, params) => api.get(`/analytics/${kind}`, { params }),
  loginActivity: () => api.get('/login-activity'),
  sheetStatus: () => api.get('/google-sheets/sync-status'),
  sheetRetry: () => api.post('/google-sheets/retry'),
};
