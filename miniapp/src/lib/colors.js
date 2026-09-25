/** Tayyor ranglar — backend/src/config/default.js dagi `colors` bilan bir xil */
export const COLORS = [
  { key: 'black', uz: 'Qora', ru: 'Чёрный', hex: '#1c1c1e' },
  { key: 'brown', uz: 'Jigarrang', ru: 'Коричневый', hex: '#7a4a2b' },
  { key: 'blue', uz: "Ko'k", ru: 'Синий', hex: '#1f4fa3' },
];

// Admin qo'lda kiritgan rang: "Nomi#rrggbb" (# qismi ixtiyoriy)
const CUSTOM_RE = /^([^#\n]{1,30})(#[0-9a-fA-F]{6})?$/;

/** Rang ma'lumoti: { key, uz, ru, hex } — tayyor yoki qo'lda kiritilgan */
export function colorInfo(value) {
  const preset = COLORS.find((c) => c.key === value);
  if (preset) return preset;
  const m = String(value || '').match(CUSTOM_RE);
  if (!m) return null;
  return { key: value, uz: m[1], ru: m[1], hex: m[2] || '#9aa3b2' };
}

/** Mahsulotda bor ranglar: avval tayyor ranglar, keyin qo'lda kiritilganlar (serverdagi kabi) */
export function productColors(product) {
  const used = [];
  for (const url of product?.images || []) {
    const v = product.imageColors?.[url];
    if (v && !used.includes(v)) used.push(v);
  }
  const presets = COLORS.filter((c) => used.includes(c.key));
  const custom = used
    .filter((v) => !COLORS.some((c) => c.key === v))
    .map(colorInfo)
    .filter(Boolean);
  return [...presets, ...custom];
}

/** Savatcha qatorining haqiqiy rangi (server ham xuddi shunday tanlaydi) */
export function effectiveColor(product, color) {
  const keys = productColors(product).map((c) => c.key);
  if (keys.includes(color)) return color;
  return keys[0] || null;
}

/** Tanlangan rangdagi birinchi rasm (bo'lmasa — asosiy rasm) */
export function colorImage(product, color) {
  return (
    (color && product.images.find((url) => product.imageColors?.[url] === color)) ||
    product.images[0]
  );
}

export function colorLabel(key, lang) {
  const c = colorInfo(key);
  return c ? c[lang === 'ru' ? 'ru' : 'uz'] : '';
}
