import { haptic } from '../lib/telegram';
import Icon from './Icon';

/** Fonsiz brend rasmlari (public/ ichida) */
export const MODE_ART = {
  wholesale: '/mode-box.webp',
  retail: '/mode-shoe.webp',
};

/** "Maxsus taklif" bannerlari uchun fonsiz rasmlar */
export const OFFER_ART = {
  upper: '/offer-upper.webp',
};

/**
 * Optom / Donaga tanlov kartochkalari:
 * optomda — ASF GROUP karobkalari (komplekt), donada — bitta juft oyoq kiyim
 */
export default function ModeCards({ t, products = [], mode, onPick, large = false }) {
  const packSize = products.find((p) => p.category !== 'upper')?.sizes?.length || 5;

  const choose = (value) => {
    haptic('medium');
    onPick(value);
  };

  return (
    <div className={`mode-cards${large ? ' large' : ''}`}>
      <button
        className={`mode-card2${mode === 'wholesale' ? ' active' : ''}`}
        onClick={() => choose('wholesale')}
      >
        <span className="mode-chip">
          <Icon name="box" size={13} stroke={2.2} /> {t.modeCardWholesale}
        </span>
        <span className="mode-art cutout box">
          <img src={MODE_ART.wholesale} alt="" decoding="async" />
          <span className="mode-count">×{packSize}</span>
        </span>
        <span className="mode-info">
          <b>
            {t.modeWholesale}
            {t.modeWholesaleSub && <small className="mode-sub"> {t.modeWholesaleSub}</small>}
          </b>
          <span>{t.modeTabWholesale}</span>
        </span>
        <span className="mode-go">
          <Icon name="arrow" size={16} stroke={2.4} />
        </span>
      </button>

      <button
        className={`mode-card2${mode === 'retail' ? ' active' : ''}`}
        onClick={() => choose('retail')}
      >
        <span className="mode-chip">{t.modeCardRetail}</span>
        <span className="mode-art cutout shoe">
          <img src={MODE_ART.retail} alt="" decoding="async" />
        </span>
        <span className="mode-info">
          <b>{t.modeRetail}</b>
          <span>{t.modeTabRetail}</span>
        </span>
        <span className="mode-go">
          <Icon name="arrow" size={16} stroke={2.4} />
        </span>
      </button>
    </div>
  );
}
