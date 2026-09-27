import { haptic, isTelegram } from '../lib/telegram';

/**
 * Oynani yopib, orqaga qaytaradigan tugma.
 * Telegram ichida tepada o'zining "Orqaga" tugmasi bor — u yerda ko'rsatilmaydi.
 * Brauzerda (Chrome, Safari, ekranga qo'shilgan ilova) esa boshqa yo'l yo'q.
 */
export default function SheetClose({ onClose, label }) {
  if (isTelegram) return null;
  return (
    <button
      type="button"
      className="sheet-close"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        haptic();
        onClose();
      }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          d="M15 5l-7 7 7 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
