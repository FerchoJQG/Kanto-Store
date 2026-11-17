const BASE = import.meta.env.VITE_API_URL || '/api';

export function getToken() { return localStorage.getItem('kanto_token'); }

async function request(path, { method = 'GET', body, params } = {}) {
  const qs = params
    ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString()
    : '';
  const headers = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${BASE}${path}${qs}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de red');
  return data;
}

export const api = {
  // auth
  login: (b) => request('/auth/login', { method: 'POST', body: b }),
  register: (b) => request('/auth/register', { method: 'POST', body: b }),
  // catálogo
  sets: () => request('/products/sets'),
  products: (params) => request('/products', { params }),
  product: (id) => request(`/products/${id}`),
  createProduct: (b) => request('/products', { method: 'POST', body: b }),
  updateProduct: (id, b) => request(`/products/${id}`, { method: 'PUT', body: b }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  // wishlist
  wishlist: () => request('/wishlist'),
  wishAdd: (id) => request(`/wishlist/${id}`, { method: 'POST' }),
  wishRemove: (id) => request(`/wishlist/${id}`, { method: 'DELETE' }),
  wishAlerts: () => request('/wishlist/alerts/available'),
  // pedidos
  checkout: (b) => request('/orders', { method: 'POST', body: b }),
  myOrders: () => request('/orders/mine'),
  order: (id, email) => request(`/orders/${id}`, { params: { email } }),
  confirmPayment: (id, email) => request(`/orders/${id}/confirm-payment`, { method: 'POST', body: { email } }),
  allOrders: (status) => request('/orders', { params: { status } }),
  myDeliveries: () => request('/orders/deliveries/mine'),
  setStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: { status } }),
  assign: (id, courier_id) => request(`/orders/${id}/assign`, { method: 'PATCH', body: { courier_id } }),
  // admin
  users: () => request('/admin/users'),
  createUser: (b) => request('/admin/users', { method: 'POST', body: b }),
  setRole: (id, role) => request(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  couriers: () => request('/admin/couriers'),
  inventory: () => request('/admin/inventory'),
  invAlerts: () => request('/admin/inventory/alerts'),
  updateInventory: (id, b) => request(`/admin/inventory/${id}`, { method: 'PATCH', body: b }),
  reports: () => request('/admin/reports'),
};
