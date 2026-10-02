import { haptic } from '../lib/telegram';
import Icon from './Icon';
import UpperIcon from './UpperIcon';
import { MODE_ART } from './ModeCards';

/**
 * Optomdagi bosh sahifa: "Tayyor oyoq kiyim" (karobkalar) va "Zagatovka" (premium belgi).
 * Bosilganda katalogning shu bo'limi ochiladi.
 */
export default function CategoryCards({ t, products = [], onOpen }) {
  const ready = products.filter((p) => p.category === 'ready');
  const upper = products.filter((p) => p.category === 'upper');
  const packSize = ready[0]?.sizes?.length || 5;

  const open = (cat) => {
    haptic('medium');
    onOpen(cat);
  };

  return (
    <div className="mode-cards">
      <button className="mode-card2" onClick={() => open('ready')}>
        <span className="mode-chip">
          <Icon name="box" size={13} stroke={2.2} /> {t.modeCardWholesale}
        </span>
        <span className="mode-art cutout box">
          <img src={MODE_ART.wholesale} alt="" decoding="async" />
          <span className="mode-count">×{packSize}</span>
        </span>
        <span className="mode-info">
          <b>{t.catReady}</b>
          <span>{ready.length ? t.modelsCount(ready.length) : t.catReadyText}</span>
        </span>
        <span className="mode-go">
          <Icon name="arrow" size={16} stroke={2.4} />
        </span>
      </button>

      <button className="mode-card2 active" onClick={() => open('upper')}>
        <span className="mode-chip">Premium</span>
        <span className="mode-art upper">
          <UpperIcon />
        </span>
        <span className="mode-info">
          <b>{t.catUpper}</b>
          <span>{upper.length ? t.modelsCount(upper.length) : t.catUpperText}</span>
        </span>
        <span className="mode-go">
          <Icon name="arrow" size={16} stroke={2.4} />
        </span>
      </button>
    </div>
  );
}
