/** Tayyor ranglar — backend/src/config/default.js dagi `colors` bilan bir xil */
export const COLORS = [
  { key: 'black', label: 'Qora', hex: '#1c1c1e' },
  { key: 'brown', label: 'Jigarrang', hex: '#7a4a2b' },
  { key: 'blue', label: "Ko'k", hex: '#1f4fa3' },
];

// Qo'lda kiritilgan rang: "Nomi#rrggbb" (# qismi ixtiyoriy)
const CUSTOM_RE = /^([^#\n]{1,30})(#[0-9a-fA-F]{6})?$/;

/** { key, label, hex } — tayyor yoki qo'lda kiritilgan rang */
export const colorOf = (value) => {
  const preset = COLORS.find((c) => c.key === value);
  if (preset) return preset;
  const m = String(value || '').match(CUSTOM_RE);
  return m ? { key: value, label: m[1], hex: m[2] || '#9aa3b2', custom: true } : null;
};

/** Qo'lda kiritilgan rangni saqlanadigan ko'rinishga keltiradi */
export const customColor = (name, hex) => {
  const clean = String(name || '').replace(/#/g, '').trim().slice(0, 30);
  return clean ? `${clean}${/^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : ''}` : '';
};

export const PAYMENT = {
  cash: '💵 Naqd pul',
  click: '💳 Click',
};
