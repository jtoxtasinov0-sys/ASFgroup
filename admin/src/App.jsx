import { useCallback, useEffect, useState } from 'react';
import { api, clearToken, getToken } from './lib/api';

import Login from './pages/Login';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Stock from './pages/Stock';
import Stories from './pages/Stories';
import Users from './pages/Users';
import Broadcast from './pages/Broadcast';
import Settings from './pages/Settings';
import Icon from './components/Icon';
import InstallHint, { useInstall } from './components/InstallHint';
import { canPromptInstall, promptInstall } from './lib/install';

const MENU = [
  { key: 'orders', icon: 'receipt', label: 'Buyurtmalar' },
  { key: 'products', icon: 'shoe', label: 'Mahsulotlar' },
  { key: 'stock', icon: 'box', label: 'Ombor' },
  { key: 'stories', icon: 'camera', label: 'Storylar' },
  { key: 'users', icon: 'users', label: 'Mijozlar' },
  { key: 'broadcast', icon: 'megaphone', label: 'Rassilka' },
  { key: 'settings', icon: 'settings', label: 'Sozlamalar' },
];

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [page, setPage] = useState('orders');
  const [stats, setStats] = useState(null);
  // Yon menyudagi "Ekranga qo'shish" bosilganda ko'rsatma yopilgan bo'lsa ham qayta chiqadi
  const [showInstall, setShowInstall] = useState(false);
  const install = useInstall();

  const loadStats = useCallback(() => {
    if (!getToken()) return;
    api.dashboard().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    const onLogout = () => setAuthed(false);
    window.addEventListener('asf-logout', onLogout);
    return () => window.removeEventListener('asf-logout', onLogout);
  }, []);

  useEffect(() => {
    if (authed) loadStats();
  }, [authed, loadStats]);

  if (!authed) {
    return (
      <Login
        onSuccess={() => {
          setAuthed(true);
          setPage('orders');
        }}
      />
    );
  }

  const openPage = (key) => {
    setPage(key);
    window.scrollTo(0, 0);
  };

  const onInstallClick = async () => {
    // Chrome/Edge o'zining "O'rnatish" oynasini beradi, qolganlarida — ko'rsatma
    if (canPromptInstall()) await promptInstall();
    else setShowInstall(true);
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="ASF GROUP" />
          <div>
            <b>ASF ADMIN</b>
            <span>SIFAT VA ISHONCH</span>
          </div>
        </div>

        <div className="side-menu">
        {MENU.map((item) => (
          <button
            key={item.key}
            className={`side-btn${page === item.key ? ' active' : ''}`}
            onClick={() => openPage(item.key)}
          >
            <Icon name={item.icon} size={19} stroke={page === item.key ? 2.2 : 1.8} />
            {item.label}
            {item.key === 'orders' && (stats?.newCount > 0 || stats?.pendingPayments > 0) && (
              <span className="side-count">{Math.max(stats.newCount, stats.pendingPayments)}</span>
            )}
          </button>
        ))}
        </div>

        {install.available && (
          <button className="side-install" onClick={onInstallClick}>
            <Icon name="download" size={18} stroke={2.1} />
            Ekranga qo'shish
          </button>
        )}

        <button
          className="logout"
          onClick={() => {
            clearToken();
            setAuthed(false);
          }}
        >
          <Icon name="logout" size={18} />
          Chiqish
        </button>
      </aside>

      <main className="main" key={page}>
        <InstallHint forced={showInstall} onClose={() => setShowInstall(false)} />
        {page === 'orders' && <Orders stats={stats} reload={loadStats} />}
        {page === 'products' && <Products reload={loadStats} />}
        {page === 'stock' && <Stock />}
        {page === 'stories' && <Stories />}
        {page === 'users' && <Users />}
        {page === 'broadcast' && <Broadcast />}
        {page === 'settings' && <Settings />}
      </main>
    </div>
  );
}
