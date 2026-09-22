import { getInitData } from './telegram';

/**
 * Backend manzili build paytida `VITE_API_URL` dan olinadi va kodga yozilib qoladi.
 * Jonli saytda (https) u berilmagan yoki `localhost` bo'lib qolgan bo'lsa,
 * brauzer so'rovni butunlay bloklaydi — shunda ishlab chiqarish manziliga tushamiz.
 */
const PROD_API_URL = 'https://asfgroup.onrender.com';
const LOCAL_API_URL = 'http://localhost:5000';

function resolveApiUrl() {
  const raw = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const onHttps = typeof location !== 'undefined' && location.protocol === 'https:';
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(raw);

  if (onHttps && (!raw || isLocal)) return PROD_API_URL;
  return raw || LOCAL_API_URL;
}

export const API_URL = resolveApiUrl();

/** Rasm manzilini to'liq URL'ga aylantiradi */
export function imageUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path}`;
}

/* ----------------------------------------------------------
   Render'ning bepul rejasida servis harakatsizlikdan keyin
   uxlaydi va birinchi so'rov uzilib qolishi mumkin. Shuning
   uchun ulanish xatosida bir necha marta qayta urinamiz —
   mijoz xato ekrani o'rniga kutish holatini ko'radi.
   ---------------------------------------------------------- */
const RETRY_DELAYS = [3000, 8000, 15000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let wakingHandler = null;
let wakingCount = 0;

/** Server uyg'onishini kutayotganda UI xabar ko'rsatishi uchun */
export function onApiWaking(fn) {
  wakingHandler = fn;
}

function setWaking(active) {
  wakingCount = Math.max(0, wakingCount + (active ? 1 : -1));
  wakingHandler?.(wakingCount > 0);
}

async function fetchWithRetry(url, options) {
  let waiting = false;
  try {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await fetch(url, options);
      } catch (_) {
        if (attempt >= RETRY_DELAYS.length) throw new Error("Serverga ulanib bo'lmadi");
        if (!waiting) {
          waiting = true;
          setWaking(true);
        }
        await sleep(RETRY_DELAYS[attempt]);
      }
    }
  } finally {
    if (waiting) setWaking(false);
  }
}

async function request(method, path, body) {
  const headers = {
    'X-Telegram-Init-Data': getInitData(),
    'ngrok-skip-browser-warning': 'true',
  };
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetchWithRetry(`${API_URL}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

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
