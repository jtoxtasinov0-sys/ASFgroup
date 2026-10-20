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

const TOKEN_KEY = 'asf_admin_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export function imageUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${activeApiUrl}${path}`;
}

/* ----------------------------------------------------------
   Render'ning bepul rejasida servis harakatsizlikdan keyin
   uxlaydi va birinchi so'rov uzilib qolishi mumkin. Shuning
   uchun ulanish xatosida bir necha marta qayta urinamiz.
   ---------------------------------------------------------- */
const RETRY_DELAYS = [3000, 8000, 15000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function apiFetch(path, options) {
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
      await sleep(RETRY_DELAYS[attempt]);
    }
  }
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

  const res = await apiFetch(`/api/admin${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle(res);
}

/** FormData (rasm yuklash bilan) so'rov */
async function upload(method, path, formData) {
  const res = await apiFetch(`/api/admin${path}`, {
    method,
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  return handle(res);
}

/**
 * Rasmli forma uchun yuklash — foizini ko'rsatadi va cheksiz kutib qolmaydi.
 * Telefonda internet uzilsa `fetch` "Saqlanmoqda..." holatida abadiy qotib
 * qolardi; bu yerda aniq vaqt chegarasi bor va xato aniq ko'rsatiladi.
 */
const UPLOAD_TIMEOUT = 120000;

function xhrUpload(url, method, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);
    xhr.timeout = UPLOAD_TIMEOUT;
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      };
    }
    xhr.onload = () =>
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status || 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    xhr.onerror = () => reject(Object.assign(new Error("Serverga ulanib bo'lmadi"), { network: true }));
    xhr.ontimeout = () =>
      reject(new Error("Yuklash juda uzoq davom etdi. Internetni tekshirib, qayta urinib ko'ring"));
    xhr.send(formData);
  });
}

/** Formadagi rasmlardan biri o'qilmayaptimi (iPhone faylga ruxsatni yopgan bo'lsa) */
async function hasUnreadableFile(formData) {
  for (const value of formData.values()) {
    if (!(value instanceof Blob)) continue;
    try {
      await value.slice(0, 1).arrayBuffer();
    } catch (_) {
      return true;
    }
  }
  return false;
}

async function uploadWithProgress(method, path, formData, onProgress) {
  let res;
  try {
    res = await xhrUpload(`${activeApiUrl}/api/admin${path}`, method, formData, onProgress);
  } catch (err) {
    if (!err.network) throw err;
    // Aybdor server emas, rasm fayli bo'lsa — qayta urinish foyda bermaydi
    if (await hasUnreadableFile(formData)) {
      throw new Error("Rasmni o'qib bo'lmadi. Rasmni o'chirib (×), galereyadan qayta tanlang");
    }
    // Server uxlab qolgan bo'lishi mumkin — uyg'otib, bir marta qayta urinamiz
    if (onProgress) onProgress(0);
    await apiFetch('/api/health').catch(() => {});
    res = await xhrUpload(`${activeApiUrl}/api/admin${path}`, method, formData, onProgress);
  }
  if (onProgress) onProgress(100);
  return handle(res);
}

export const api = {
  login: async (password) => {
    const res = await apiFetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await handle(res);
    setToken(data.token);
    return data;
  },
  /** Telegram ichida ochilganda — admin ID'si bo'lsa parolsiz kirish */
  telegramLogin: async (initData) => {
    const res = await apiFetch('/api/admin/telegram-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
    });
    const data = await handle(res);
    setToken(data.token);
    return data;
  },
  me: () => request('GET', '/me'),
  dashboard: () => request('GET', '/dashboard'),

  orders: (status) => {
    // "pay:pending" — to'lov holati bo'yicha filtr
    if (status && status.startsWith('pay:')) return request('GET', `/orders?payment=${status.slice(4)}`);
    return request('GET', `/orders${status && status !== 'all' ? `?status=${status}` : ''}`);
  },
  setPaymentStatus: (id, paymentStatus) => request('PATCH', `/orders/${id}/payment`, { paymentStatus }),
  clearOrders: () => request('POST', '/orders/clear', { confirm: 'TOZALASH' }),
  setOrderStatus: (id, status) => request('PATCH', `/orders/${id}/status`, { status }),
  deleteOrder: (id) => request('DELETE', `/orders/${id}`),

  products: () => request('GET', '/products'),
  createProduct: (formData, onProgress) =>
    uploadWithProgress('POST', '/products', formData, onProgress),
  updateProduct: (id, formData, onProgress) =>
    uploadWithProgress('PUT', `/products/${id}`, formData, onProgress),
  deleteProduct: (id) => request('DELETE', `/products/${id}`),
  updateStock: (id, data) => request('PATCH', `/products/${id}/stock`, data),

  stories: () => request('GET', '/stories'),
  createStory: (formData) => upload('POST', '/stories', formData),
  updateStory: (id, formData) => upload('PUT', `/stories/${id}`, formData),
  deleteStory: (id) => request('DELETE', `/stories/${id}`),

  users: () => request('GET', '/users'),

  settings: () => request('GET', '/settings'),
  saveSettings: (data) => request('PUT', '/settings', data),
  saveSales: (retailEnabled) => request('PUT', '/settings/sales', { retailEnabled }),

  broadcastInfo: () => request('GET', '/broadcast'),
  broadcast: (formData) => upload('POST', '/broadcast', formData),

  publicConfig: async () => {
    const res = await apiFetch('/api/config');
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
