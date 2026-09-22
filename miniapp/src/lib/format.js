/** 140000 -> "140 000" */
export function money(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}

/** Sana: 22.09.2026, 14:30 */
export function date(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Telefonni +998 XX XXX XX XX ko'rinishiga soladi */
export function phoneMask(raw) {
  const digits = String(raw || '').replace(/\D/g, '').replace(/^998/, '').slice(0, 9);
  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 5),
    digits.slice(5, 7),
    digits.slice(7, 9),
  ].filter(Boolean);
  return parts.length ? `+998 ${parts.join(' ')}` : '';
}

/** Raqam to'liq kiritilganmi (9 ta raqam) */
export function isPhoneValid(raw) {
  return String(raw || '').replace(/\D/g, '').replace(/^998/, '').length === 9;
}
