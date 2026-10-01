import { imageUrl } from '../lib/api';
import { retryImage } from '../lib/image';
import { haptic } from '../lib/telegram';
import Icon from './Icon';

/** Rasm uchun mahsulotlar: avval tayyor oyoq kiyim, keyin qolganlari */
function pickImages(products, count) {
  const ready = products.filter((p) => p.category !== 'upper' && p.images?.length);
  const list = ready.length >= count ? ready : products.filter((p) => p.images?.length);
  return list.slice(0, count).map((p) => imageUrl(p.images[0], 320));
}

/**
 * Optom / Donaga tanlov kartochkalari:
 * optomda — bir nechta juft (komplekt), donada — bitta juft oyoq kiyim
 */
export default function ModeCards({ t, products = [], mode, onPick, large = false }) {
  const pack = pickImages(products, 3);
  const single = pickImages(products.slice(3), 1)[0] || pack[0] || '/pair.jpg';
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
        <span className="mode-art pack">
          {(pack.length ? pack : ['/pair.jpg', '/pair.jpg', '/pair.jpg']).map((src, i) => (
            <img key={i} src={src} alt="" className={`pack-${i}`} onError={retryImage} />
          ))}
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
        <span className="mode-art single">
          <img src={single} alt="" onError={retryImage} />
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
