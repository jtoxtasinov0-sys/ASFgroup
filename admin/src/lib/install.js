/** Ilovani telefon ekraniga qo'shish ("Добавить на экран «Домой»") */

const DISMISS_KEY = 'asf_admin_install_hint_closed';

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

// iPadOS 13+ o'zini Mac deb ko'rsatadi — sensorli ekran bo'yicha ajratamiz
export const isIos =
  /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);

export const isAndroid = /Android/.test(ua);

// iPhone'dagi Chrome, Firefox, Telegram va boshqa ilovalar ichidagi brauzerda
// "На экран «Домой»" yo'q — faqat Safari'da bor
export const isIosSafari =
  isIos && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|Telegram|FBAN|Instagram/.test(ua);

/** Ekrandagi belgidan ochilganmi (ilova sifatida) */
export const isStandalone = () =>
  (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) ||
  (typeof navigator !== 'undefined' && navigator.standalone === true);

// Chrome/Android "O'rnatish" oynasini sahifa ochilishi bilan beradi —
// React yuklanguncha o'tib ketmasligi uchun uni shu yerda ushlab qolamiz
let deferredPrompt = null;
const listeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((fn) => fn(true));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((fn) => fn(false));
  });
}

export const canPromptInstall = () => Boolean(deferredPrompt);

export function onInstallAvailable(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Brauzerning o'z "O'rnatish" oynasini ochadi (Chrome, Edge, Samsung Internet) */
export async function promptInstall() {
  if (!deferredPrompt) return false;
  const prompt = deferredPrompt;
  deferredPrompt = null;
  listeners.forEach((fn) => fn(false));
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    return choice?.outcome === 'accepted';
  } catch (_) {
    return false;
  }
}

export const isHintDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch (_) {
    return false;
  }
};

export const dismissHint = () => {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch (_) { /* private rejim */ }
};
