/** Mahsulot ranglari — backend/src/config/default.js dagi `colors` bilan bir xil */
export const COLORS = [
  { key: 'black', label: 'Qora', hex: '#1c1c1e' },
  { key: 'brown', label: 'Jigarrang', hex: '#7a4a2b' },
  { key: 'blue', label: "Ko'k", hex: '#1f4fa3' },
];

export const colorOf = (key) => COLORS.find((c) => c.key === key) || null;

export const PAYMENT = {
  cash: '💵 Naqd pul',
  click: '💳 Click',
};
