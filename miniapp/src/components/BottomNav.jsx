import { haptic } from '../lib/telegram';
import Icon from './Icon';

/**
 * Suzib turuvchi pastki menyu: o'rtada katta savatcha tugmasi.
 * "Qidiruv" — katalogni ochib, qidiruv maydoniga kursor qo'yadi.
 */
export default function BottomNav({ view, setView, cartCount, t }) {
  const go = (key) => {
    haptic();
    setView(key);
  };

  const tab = (key, icon, label) => (
    <button className={`nav-btn${view === key ? ' active' : ''}`} onClick={() => go(key)}>
      <Icon name={icon} size={22} stroke={view === key ? 2.2 : 1.8} />
      <span>{label}</span>
    </button>
  );

  return (
    <nav className="nav">
      <div className="nav-bar">
        {tab('home', 'home', t.navHome)}
        {tab('catalog', 'grid', t.navCatalog)}
        <div className="nav-fab-slot">
          <button
            className={`nav-fab${view === 'cart' ? ' active' : ''}`}
            data-cart-target
            onClick={() => go('cart')}
            aria-label={t.navCart}
          >
            <Icon name="bag" size={26} stroke={2} />
            {cartCount > 0 && (
              <span key={cartCount} className="nav-badge">
                {cartCount}
              </span>
            )}
          </button>
        </div>
        {tab('search', 'search', t.navSearch)}
        {tab('profile', 'user', t.navProfile)}
      </div>
    </nav>
  );
}
