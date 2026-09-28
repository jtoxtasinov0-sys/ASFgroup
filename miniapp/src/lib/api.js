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

/**
 * Joriy manzil. Sozlangani javob bermasa, `PROD_API_URL` ga o'tib ketadi —
 * `VITE_API_URL` eskirib qolgan holat uchun (masalan servis nomi o'zgargan).
 */
let activeApiUrl = resolveApiUrl();

export const getApiUrl = () => activeApiUrl;

/**
 * Rasm manzilini to'liq URL'ga aylantiradi.
 * `width` berilsa — server shu enga mos kichik (WebP) nusxani beradi:
 * kartochka va doirachalar uchun 300-600 KB o'rniga 10-45 KB.
 */
export function imageUrl(path, width) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  const thumb = width && path.startsWith('/uploads/') ? `?w=${width}` : '';
  return `${activeApiUrl}${path}${thumb}`;
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

async function fetchWithRetry(path, options) {
  let waiting = false;
  try {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await fetch(`${activeApiUrl}${path}`, options);
      } catch (_) {
        // Sozlangan manzil butunlay noto'g'ri bo'lishi mumkin — ma'lum
        // ishlaydigan manzilni sinab ko'ramiz va ishlasa o'shanga o'tamiz
        if (activeApiUrl !== PROD_API_URL) {
          try {
            const res = await fetch(`${PROD_API_URL}${path}`, options);
            activeApiUrl = PROD_API_URL;
            return res;
          } catch (_) { /* u ham javob bermadi */ }
        }

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

/* ----------------------------------------------------------
   Brauzerda (Chrome, Safari, ekranga qo'shilgan ilova) Telegram
   imzosi yo'q. Shunda serverdan veb-token olinadi va telefonda
   saqlanadi — mijoz buyurtma bera oladi va o'z buyurtmalarini ko'radi.
   ---------------------------------------------------------- */
const WEB_TOKEN_KEY = 'asf_web_token';
let webTokenMemory = '';
let webTokenPromise = null;

function readWebToken() {
  try {
    return localStorage.getItem(WEB_TOKEN_KEY) || webTokenMemory;
  } catch (_) {
    return webTokenMemory;
  }
}

function saveWebToken(token) {
  webTokenMemory = token;
  try {
    if (token) localStorage.setItem(WEB_TOKEN_KEY, token);
    else localStorage.removeItem(WEB_TOKEN_KEY);
  } catch (_) { /* xotira yopiq (maxfiy rejim) */ }
}

async function getWebToken() {
  const saved = readWebToken();
  if (saved) return saved;
  if (!webTokenPromise) {
    webTokenPromise = fetchWithRetry('/api/web/session', {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
      .then((res) => res.json())
      .then((json) => {
        const token = json?.data?.token || '';
        saveWebToken(token);
        return token;
      })
      .catch(() => '')
      .finally(() => {
        webTokenPromise = null;
      });
  }
  return webTokenPromise;
}

async function request(method, path, body, retried = false) {
  const initData = getInitData();
  const headers = {
    'X-Telegram-Init-Data': initData,
    'ngrok-skip-browser-warning': 'true',
  };
  // Katalog, storylar va sozlamalar ochiq — ular tokenni kutib turmaydi
  const needsAuth = !/^\/(config|products|stories|cart)\b/.test(path);
  if (!initData && needsAuth) {
    const token = await getWebToken();
    if (token) headers['X-Web-Token'] = token;
  }
  // FormData (fayl yuklash) bo'lsa Content-Type ni brauzer o'zi qo'yadi
  const isForm = body instanceof FormData;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const res = await fetchWithRetry(`/api${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  // Saqlangan veb-token eskirgan bo'lsa — yangisini olib, bir marta qayta urinamiz
  if (res.status === 401 && !initData && needsAuth && !retried) {
    saveWebToken('');
    return request(method, path, body, true);
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
  orderStatus: (orderId) => request('GET', `/orders/${orderId}/status`),
  clickLinks: (orderId) => request('GET', `/orders/${orderId}/click`),
  uploadReceipt: (orderId, file) => {
    const form = new FormData();
    form.append('file', file, file.name || 'receipt.jpg');
    return request('POST', `/orders/${orderId}/receipt`, form);
  },
};
