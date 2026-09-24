/**
 * Mahsulot rasmi ramkasi — tik (3:4). Telefonda olingan 9:16 rasmlarga mos.
 */
export const FRAME_ASPECT = 3 / 4;

/**
 * Rasm ko'rinishi (admin paneldan sozlanadi): { z, x, y, r }
 *   r — rasmning eni / bo'yi nisbati;
 *   z — kattalik: 1 = ramkani to'liq to'ldiradi (bo'sh joy qolmaydi), undan katta — yaqinroq;
 *   x / y — rasmning qaysi qismi ko'rinadi (0 — chap / yuqori, 100 — o'ng / past).
 * Sozlanmagan rasm ramkani markazdan to'ldiradi.
 */
export function frameOf(product, url) {
  const frame = product?.imageFrames?.[url];
  // Eski formatdagi sozlama (r yo'q) — oddiy to'ldirish
  return frame && frame.r ? frame : null;
}

/**
 * <img> uchun style. Ota element `position: relative; overflow: hidden` bo'lishi kerak.
 * `aspect` — ota elementning eni / bo'yi (kichik kvadrat rasmlar uchun 1).
 */
export function frameStyle(frame, aspect = FRAME_ASPECT) {
  if (!frame || !frame.r) {
    return { display: 'block', width: '100%', height: '100%', objectFit: 'cover' };
  }

  const z = Math.max(1, Number(frame.z) || 1);
  const x = frame.x ?? 50;
  const y = frame.y ?? 50;
  const { w, h } = coverSize(frame.r, aspect);

  return {
    display: 'block',
    position: 'absolute',
    maxWidth: 'none',
    width: `${w * z}%`,
    height: `${h * z}%`,
    left: `${((100 - w * z) * x) / 100}%`,
    top: `${((100 - h * z) * y) / 100}%`,
  };
}

/** Ramkani to'liq to'ldiradigan o'lcham (% da) */
export function coverSize(r, aspect = FRAME_ASPECT) {
  return r < aspect ? { w: 100, h: (aspect / r) * 100 } : { w: (r / aspect) * 100, h: 100 };
}
