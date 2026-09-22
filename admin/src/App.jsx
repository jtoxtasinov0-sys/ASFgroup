import { useCallback, useEffect, useState } from 'react';
import { api, clearToken, getToken } from './lib/api';

import Login from './pages/Login';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Stories from './pages/Stories';
import Users from './pages/Users';

const MENU = [
  { key: 'orders', icon: '🧾', label: 'Buyurtmalar' },
  { key: 'products', icon: '👞', label: 'Mahsulotlar' },
  { key: 'stories', icon: '📸', label: 'Storylar' },
  { key: 'users', icon: '👥', label: 'Mijozlar' },
];

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [page, setPage] = useState('orders');
  const [stats, setStats] = useState(null);

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

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="ASF GROUP" />
          <div>
            <b>ASF GROUP</b>
            <span>SIFAT VA ISHONCH</span>
          </div>
        </div>

        {MENU.map((item) => (
          <button
            key={item.key}
            className={`side-btn${page === item.key ? ' active' : ''}`}
            onClick={() => setPage(item.key)}
          >
            <span>{item.icon}</span>
            {item.label}
            {item.key === 'orders' && stats?.newCount > 0 && (
              <span className="side-count">{stats.newCount}</span>
            )}
          </button>
        ))}

        <button
          className="logout"
          onClick={() => {
            clearToken();
            setAuthed(false);
          }}
        >
          ⏻ Chiqish
        </button>
      </aside>

      <main className="main">
        {page === 'orders' && <Orders stats={stats} reload={loadStats} />}
        {page === 'products' && <Products reload={loadStats} />}
        {page === 'stories' && <Stories />}
        {page === 'users' && <Users />}
      </main>
    </div>
  );
}
