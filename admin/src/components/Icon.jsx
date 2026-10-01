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
  receipt: (
    <>
      <path d="M6 3.5h12v17l-2.4-1.6-2.4 1.6-1.2-.8-1.2.8-2.4-1.6L6 20.5z" />
      <path d="M9 8.5h6M9 12h6M9 15.5h3.5" />
    </>
  ),
  shoe: (
    <>
      <path d="M3.5 16.5V9.2c0-.6.5-1 1.1-.9l3.6.7 1.6 2.2c.5.7 1.3 1.1 2.2 1.1h1.2l5.3 1.4c1.5.4 2.5 1.7 2.5 3.2v.6H3.5z" />
      <path d="M3.5 19.5h17M10 11.6l1.3-1.6M12.5 12.3l1.2-1.5" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h2.3l1.5-2.2h5.4l1.5 2.2h2.3A1.5 1.5 0 0 1 20 8.5v9.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.4" />
      <path d="M3 19.5c.7-3.2 3.1-5 6-5s5.3 1.8 6 5" />
      <path d="M15.5 5.4a3.4 3.4 0 0 1 0 6.3M17.6 14.8c1.7.6 3 2.2 3.4 4.7" />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 10v4a1 1 0 0 0 1 1h2.5l7.5 4V5L7.5 9H5a1 1 0 0 0-1 1z" />
      <path d="M18 9.2a4 4 0 0 1 0 5.6M7.5 15l1.2 4.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.4 1a7.4 7.4 0 0 0-2.6-1.5L14 2.6h-4l-.4 2.5A7.4 7.4 0 0 0 7 6.6l-2.4-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.4-1a7.4 7.4 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.4 7.4 0 0 0 2.6-1.5l2.4 1 2-3.4z" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4.5H6.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5H14" />
      <path d="M10.5 12H20M16.5 8l4 4-4 4" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
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
