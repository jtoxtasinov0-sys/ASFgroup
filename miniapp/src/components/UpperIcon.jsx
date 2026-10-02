/**
 * Zagatovka uchun premium belgi: poyabzalning ustki qismi (taglisiz),
 * oltin chok va yaltiroq — to'q ko'k kartochka ustida
 */
export default function UpperIcon() {
  return (
    <svg className="upper-icon" viewBox="0 0 160 100" aria-hidden="true">
      <defs>
        <linearGradient id="upper-leather" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c9d6f0" />
        </linearGradient>
        <linearGradient id="upper-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7e3a1" />
          <stop offset="0.5" stopColor="#e2b857" />
          <stop offset="1" stopColor="#b8872b" />
        </linearGradient>
      </defs>

      {/* Ustki qism: tovon, yon devor, burun */}
      <path
        d="M24 30 C30 27 44 27 58 32 C70 36 82 40 94 40 C106 46 122 56 136 62
           C146 66 150 72 148 78 C146 82 140 83 132 83 L30 83 C22 83 18 79 18 72
           L19 44 C19 36 20 32 24 30 Z"
        fill="url(#upper-leather)"
      />
      {/* Yoqa (oyoq kiradigan joy) */}
      <path d="M24 30 C38 36 64 42 94 40" fill="none" stroke="#0b2257" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
      {/* Burun qoplamasi */}
      <path d="M104 50 C112 60 120 70 122 83" fill="none" stroke="#0b2257" strokeOpacity="0.18" strokeWidth="2" />
      {/* Tovon qoplamasi */}
      <path d="M19 52 C30 54 40 62 42 83" fill="none" stroke="#0b2257" strokeOpacity="0.18" strokeWidth="2" />
      {/* Oltin chok */}
      <path
        d="M26 37 C40 42 64 47 94 46 C106 52 120 60 132 66 C140 70 143 74 141 77 L30 77 C25 77 24 74 24 70 Z"
        fill="none"
        stroke="url(#upper-gold)"
        strokeWidth="1.8"
        strokeDasharray="4 3"
        strokeLinecap="round"
      />
      {/* Brend belgisi */}
      <rect x="62" y="56" width="14" height="10" rx="2.5" fill="url(#upper-gold)" />

      {/* Yaltiroq */}
      <path d="M128 16 L131 25 L140 28 L131 31 L128 40 L125 31 L116 28 L125 25 Z" fill="url(#upper-gold)" />
      <path d="M146 40 L147.5 44.5 L152 46 L147.5 47.5 L146 52 L144.5 47.5 L140 46 L144.5 44.5 Z" fill="#f7e3a1" />
    </svg>
  );
}
