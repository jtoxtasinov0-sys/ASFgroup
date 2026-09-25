/** Mahsulot ranglari — backend/src/config/default.js dagi `colors` bilan bir xil */
export const COLORS = [
  { key: 'black', uz: 'Qora', ru: 'Чёрный', hex: '#1c1c1e' },
  { key: 'brown', uz: 'Jigarrang', ru: 'Коричневый', hex: '#7a4a2b' },
  { key: 'blue', uz: "Ko'k", ru: 'Синий', hex: '#1f4fa3' },
];

/** Mahsulotda bor ranglar (admin panelda rasmlarga biriktirilgan), palitra tartibida */
export function productColors(product) {
  const used = new Set(Object.values(product?.imageColors || {}));
  return COLORS.filter((c) => used.has(c.key));
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
  const c = COLORS.find((x) => x.key === key);
  return c ? c[lang === 'ru' ? 'ru' : 'uz'] : '';
}
