/** Telegram WebApp bilan ishlash (brauzerda ham xatosiz ishlaydi) */

export const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

export const isTelegram = Boolean(tg?.initData);

export function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.('#16243F');
    tg.setBackgroundColor?.('#FFFFFF');
    tg.disableVerticalSwipes?.();
  } catch (_) {
    /* eski Telegram versiyalari */
  }
}

export function getInitData() {
  return tg?.initData || '';
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
