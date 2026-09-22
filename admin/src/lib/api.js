export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const TOKEN_KEY = 'asf_admin_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export function imageUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path}`;
}

async function handle(res) {
  let json;
  try {
    json = await res.json();
  } catch (_) {
    throw new Error('Server javob bermadi');
  }
  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event('asf-logout'));
  }
  if (!res.ok || json.ok === false) throw new Error(json.message || 'Xatolik');
  return json.data;
}

async function request(method, path, body) {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}/api/admin${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle(res);
}

/** FormData (rasm yuklash bilan) so'rov */
async function upload(method, path, formData) {
  const res = await fetch(`${API_URL}/api/admin${path}`, {
    method,
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  return handle(res);
}

export const api = {
  login: async (username, password) => {
    const res = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await handle(res);
    setToken(data.token);
    return data;
  },
  me: () => request('GET', '/me'),
  dashboard: () => request('GET', '/dashboard'),

  orders: (status) => request('GET', `/orders${status && status !== 'all' ? `?status=${status}` : ''}`),
  setOrderStatus: (id, status) => request('PATCH', `/orders/${id}/status`, { status }),
  deleteOrder: (id) => request('DELETE', `/orders/${id}`),

  products: () => request('GET', '/products'),
  createProduct: (formData) => upload('POST', '/products', formData),
  updateProduct: (id, formData) => upload('PUT', `/products/${id}`, formData),
  deleteProduct: (id) => request('DELETE', `/products/${id}`),

  stories: () => request('GET', '/stories'),
  createStory: (formData) => upload('POST', '/stories', formData),
  updateStory: (id, formData) => upload('PUT', `/stories/${id}`, formData),
  deleteStory: (id) => request('DELETE', `/stories/${id}`),

  users: () => request('GET', '/users'),

  publicConfig: async () => {
    const res = await fetch(`${API_URL}/api/config`);
    return handle(res);
  },
};

export const money = (v) => new Intl.NumberFormat('ru-RU').format(Number(v) || 0);

export const date = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
};
