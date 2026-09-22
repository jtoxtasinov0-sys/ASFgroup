import { getInitData } from './telegram';

export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/** Rasm manzilini to'liq URL'ga aylantiradi */
export function imageUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path}`;
}

async function request(method, path, body) {
  const headers = {
    'X-Telegram-Init-Data': getInitData(),
    'ngrok-skip-browser-warning': 'true',
  };
  if (body) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (_) {
    throw new Error("Server ishlamayapti. Backendni ishga tushiring.");
  }

  let json;
  try {
    json = await res.json();
  } catch (_) {
    throw new Error('Server javob bermadi');
  }

  if (!res.ok || json.ok === false) {
    throw new Error(json.message || 'Xatolik yuz berdi');
  }
  return json.data;
}

export const api = {
  getConfig: () => request('GET', '/config'),
  me: () => request('POST', '/me'),
  updateProfile: (data) => request('PATCH', '/profile', data),

  getProducts: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v && v !== 'all')
    ).toString();
    return request('GET', `/products${qs ? `?${qs}` : ''}`);
  },
  getProduct: (id) => request('GET', `/products/${id}`),
  getStories: () => request('GET', '/stories'),

  calculate: (items) => request('POST', '/cart/calculate', { items }),
  createOrder: (payload) => request('POST', '/orders', payload),
  myOrders: () => request('GET', '/orders/my'),
};
