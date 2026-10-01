/** Chiziqli SVG ikonkalar — emoji o'rniga, har qanday ekranda bir xil ko'rinadi */
const PATHS = {
  home: (
    <>
      <path d="M3.5 10.5 12 3.8l8.5 6.7" />
      <path d="M5.5 9v10.2a1 1 0 0 0 1 1h3.7v-5.6h3.6v5.6h3.7a1 1 0 0 0 1-1V9" />
    </>
  ),
  grid: (
    <>
      <rect x="3.8" y="3.8" width="6.6" height="6.6" rx="2" />
      <rect x="13.6" y="3.8" width="6.6" height="6.6" rx="2" />
      <rect x="3.8" y="13.6" width="6.6" height="6.6" rx="2" />
      <rect x="13.6" y="13.6" width="6.6" height="6.6" rx="2" />
    </>
  ),
  bag: (
    <>
      <path d="M5.2 8.2h13.6l-1 11.1a1.6 1.6 0 0 1-1.6 1.5H7.8a1.6 1.6 0 0 1-1.6-1.5z" />
      <path d="M8.8 10.5V7a3.2 3.2 0 0 1 6.4 0v3.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.2" r="3.9" />
      <path d="M4.6 20.2c.9-3.6 3.9-5.6 7.4-5.6s6.5 2 7.4 5.6" />
    </>
  ),
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  check: <path d="m5.5 12.5 4.2 4.2 8.8-9.4" />,
  arrow: <path d="M5 12h13.5M13 6.5l5.5 5.5-5.5 5.5" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.4" />
      <path d="m20 20-4.4-4.4" />
    </>
  ),
  box: (
    <>
      <path d="M3.8 7.6 12 3.6l8.2 4v8.8L12 20.4l-8.2-4z" />
      <path d="M3.8 7.6 12 11.6l8.2-4M12 11.6v8.8" />
    </>
  ),
  swap: <path d="M7 4.5 3.8 7.7 7 10.9M4 7.7h13M17 13.1l3.2 3.2-3.2 3.2M20 16.3H7" />,
};

export default function Icon({ name, size = 22, stroke = 1.9, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
