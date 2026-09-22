import { haptic } from '../lib/telegram';

export default function BottomNav({ view, setView, cartCount, t }) {
  const tabs = [
    { key: 'home', icon: '🏠', label: t.navHome },
    { key: 'catalog', icon: '🔍', label: t.navCatalog },
    { key: 'cart', icon: '🛒', label: t.navCart, badge: cartCount },
    { key: 'profile', icon: '👤', label: t.navProfile },
  ];

  return (
    <nav className="nav">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`nav-btn${view === tab.key ? ' active' : ''}`}
          onClick={() => {
            haptic();
            setView(tab.key);
          }}
        >
          <span className="nav-icon">{tab.icon}</span>
          {tab.label}
          {tab.badge > 0 && <span className="nav-badge">{tab.badge}</span>}
        </button>
      ))}
    </nav>
  );
}
