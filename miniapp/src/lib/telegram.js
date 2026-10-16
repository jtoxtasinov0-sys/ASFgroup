/** Telegram WebApp bilan ishlash (brauzerda ham xatosiz ishlaydi) */

export const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

export const isTelegram = Boolean(tg?.initData);

export function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.('#F3F6FC');
    tg.setBackgroundColor?.('#F3F6FC');
    tg.disableVerticalSwipes?.();
  } catch (_) {
    /* eski Telegram versiyalari */
  }
}

export function getInitData() {
  return tg?.initData || '';
}

/**
 * Ulashilgan havola orqali ochilgan mahsulot ID'si:
 * `?product=12` (bot tugmasi, sayt) yoki Telegram `startapp=p12`.
 */
export function getLinkedProductId() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('product');
    const fromStart = String(tg?.initDataUnsafe?.start_param || '').match(/^p(\d+)$/)?.[1];
    const id = Number(fromUrl || fromStart);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch (_) {
    return null;
  }
}

export function getTgUser() {
  return tg?.initDataUnsafe?.user || null;
}

export function haptic(style = 'light') {
  try {
    tg?.HapticFeedback?.impactOccurred(style);
  } catch (_) { /* qo'llab-quvvatlanmaydi */ }
}

export function notifySuccess() {
  try {
    tg?.HapticFeedback?.notificationOccurred('success');
  } catch (_) { /* qo'llab-quvvatlanmaydi */ }
}

export function closeApp() {
  try {
    tg?.close();
  } catch (_) { /* brauzerda ishlamaydi */ }
}

/** Tashqi havolani ochadi (Telegram ichida — brauzerda, oddiy brauzerda — yangi oynada) */
export function openLink(url) {
  try {
    if (tg?.openLink) tg.openLink(url);
    else window.open(url, '_blank');
  } catch (_) {
    window.location.href = url;
  }
}

/** Telegramning orqaga tugmasi */
export function setBackButton(visible, handler) {
  if (!tg?.BackButton) return () => {};
  if (visible) {
    tg.BackButton.show();
    tg.BackButton.onClick(handler);
    return () => {
      tg.BackButton.offClick(handler);
      tg.BackButton.hide();
    };
  }
  tg.BackButton.hide();
  return () => {};
}
