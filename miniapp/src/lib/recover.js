/**
 * Oq ekrandan himoya.
 *
 * Ilova fonda uzoq (masalan, 1 soat) turib qaytganda ikki holat oq ekran beradi:
 *  1. Shu orada yangi versiya chiqqan — eski sahifa endi mavjud bo'lmagan
 *     JS bo'laklarini so'raydi va React yiqiladi.
 *  2. Telefon (ayniqsa iPhone) xotirani bo'shatish uchun sahifani "o'ldiradi" —
 *     qaytganda ekran bo'sh qoladi.
 * Ikkalasida ham sahifani bir marta qayta yuklash yetarli.
 */

const RELOAD_KEY = 'asf_recover_at';
// Fonda shuncha vaqt turgan bo'lsa — qaytganda yangi versiya bormi, tekshiramiz
const STALE_MS = 30 * 60 * 1000;

/**
 * Sahifani yangi versiya bilan qayta yuklaydi. Ilova xotiradan (service worker)
 * ochilayotgan bo'lsa, avval u yerdagi nusxani serverdagisi bilan almashtiramiz —
 * aks holda qayta yuklash yana eski versiyani ochadi.
 */
export function hardReload() {
  const sw = typeof navigator !== 'undefined' && navigator.serviceWorker;
  if (!sw || !sw.controller) {
    window.location.reload();
    return;
  }
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    window.location.reload();
  };
  sw.addEventListener('message', (e) => e.data === 'shell-refreshed' && go());
  sw.controller.postMessage('refresh-shell');
  // Internet sekin bo'lsa ham uzoq kuttirmaymiz
  setTimeout(go, 4000);
}

/** Qayta yuklaydi, lekin cheksiz aylanib qolmaslik uchun 20 soniyada ko'pi bilan bir marta */
export function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 20000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch (_) { /* private rejim — baribir qayta yuklaymiz */ }
  hardReload();
  return true;
}

/** Ilovani telefon xotirasiga saqlaydi — keyingi ochilishlar bir zumda bo'ladi */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || typeof navigator === 'undefined' || !navigator.serviceWorker) return;
  const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register);
}

const rootIsEmpty = () => {
  const root = document.getElementById('root');
  return !root || !root.firstElementChild;
};

// Joriy sahifadagi asosiy JS fayl nomi (har deployda o'zgaradi)
const currentEntry = () => {
  const script = document.querySelector('script[type="module"][src*="/assets/"]');
  return script ? new URL(script.src, location.href).pathname : '';
};

/** Serverdagi index.html boshqa JS faylni ko'rsatsa — yangi versiya chiqqan */
async function hasNewVersion() {
  const entry = currentEntry();
  if (!entry) return false; // dev rejim
  try {
    const res = await fetch(`/?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return false;
    const html = await res.text();
    return !html.includes(entry);
  } catch (_) {
    return false; // internet yo'q — tegmaymiz
  }
}

export function installRecovery() {
  if (typeof window === 'undefined') return;

  // 1. Yangi deploydan keyin eski JS bo'lak topilmadi
  window.addEventListener('vite:preloadError', (e) => {
    e.preventDefault();
    reloadOnce();
  });

  let hiddenAt = 0;

  const check = async () => {
    // Ekran bo'sh qolgan — darhol qayta yuklaymiz
    if (rootIsEmpty()) {
      reloadOnce();
      return;
    }
    // Uzoq fonda turgan — yangi versiya bo'lsa, yangilab olamiz
    if (hiddenAt && Date.now() - hiddenAt > STALE_MS && (await hasNewVersion())) {
      reloadOnce();
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now();
    else check();
  });

  // iOS sahifani keshdan (bfcache) tiklaganda
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) check();
  });
}
