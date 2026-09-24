/**
 * Rasm ko'rinishi (admin paneldan sozlanadi).
 *
 * Sozlanmagan rasm kvadratni to'liq to'ldiradi (markazdan).
 * Sozlangan rasm { z, x, y }:
 *   z — kattalik: 1 = rasm butunlay ko'rinadi, 1 dan katta — kattalashtirilgan;
 *   x / y — kattalashtirilganda rasmning qaysi qismi ko'rinishi (0–100 %).
 */
export function frameOf(product, url) {
  return product?.imageFrames?.[url] || null;
}

/** <img> uchun style — ota element `overflow: hidden` bo'lishi kerak */
export function frameStyle(frame) {
  const base = { width: '100%', height: '100%' };
  if (!frame) return { ...base, objectFit: 'cover' };

  const z = Number(frame.z) || 1;
  const x = frame.x ?? 50;
  const y = frame.y ?? 50;
  return {
    ...base,
    objectFit: 'contain',
    transform: z === 1 ? undefined : `scale(${z})`,
    transformOrigin: `${x}% ${y}%`,
  };
}
