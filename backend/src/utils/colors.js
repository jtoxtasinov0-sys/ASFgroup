const config = require('../config/default');

/**
 * Rasm rangi — ikki xil yoziladi:
 *   tayyor rang kaliti: "black" | "brown" | "blue"
 *   qo'lda kiritilgan rang: "Nomi#rrggbb" (masalan "Qizil#c62828"), # qismi ixtiyoriy
 */
const CUSTOM_RE = /^([^#\n]{1,30})(#[0-9a-fA-F]{6})?$/;

/** Admin paneldan kelgan qiymatni tekshiradi va tozalaydi (yaroqsiz bo'lsa null) */
function cleanColor(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (config.colors.some((c) => c.key === v)) return v;
  const m = v.match(CUSTOM_RE);
  if (!m || !m[1].trim()) return null;
  return `${m[1].trim()}${m[2] ? m[2].toLowerCase() : ''}`;
}

/** Rang nomi va rangi: { key, uz, ru, hex } */
function colorInfo(value) {
  const preset = config.colors.find((c) => c.key === value);
  if (preset) return preset;
  const m = String(value || '').match(CUSTOM_RE);
  if (!m) return null;
  return { key: value, uz: m[1], ru: m[1], hex: m[2] || '#9aa3b2' };
}

/** Mahsulotda bor ranglar: avval tayyor ranglar (palitra tartibida), keyin qo'lda kiritilganlar */
function productColors(product) {
  const used = [];
  for (const url of product.images || []) {
    const v = product.imageColors?.[url];
    if (v && !used.includes(v)) used.push(v);
  }
  const presets = config.colors.map((c) => c.key).filter((k) => used.includes(k));
  const custom = used.filter((v) => !presets.includes(v) && colorInfo(v));
  return [...presets, ...custom];
}

module.exports = { cleanColor, colorInfo, productColors };
