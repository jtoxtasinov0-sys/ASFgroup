import { haptic } from '../lib/telegram';

/** Ilovaga kirganda: optom yoki donaga (optom — asosiy) */
export default function ModeSelect({ t, lang, setLang, onPick }) {
  const pick = (value) => {
    haptic('medium');
    onPick(value);
  };

  return (
    <div className="mode-page">
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="lang-pill" onClick={() => setLang(lang === 'uz' ? 'ru' : 'uz')}>
          {lang === 'uz' ? 'UZ' : 'RU'}
        </button>
      </div>

      <img className="mode-logo" src="/logo.png" alt="ASF GROUP" />
      <h1>{t.modeTitle}</h1>
      <p className="muted">{t.modeText}</p>

      <button className="mode-card main" onClick={() => pick('wholesale')}>
        <span className="mode-emoji">📦</span>
        <span className="mode-text">
          <b>
            {t.modeWholesale}
            {t.modeWholesaleSub && <small className="mode-sub"> {t.modeWholesaleSub}</small>}
          </b>
          <span>{t.modeWholesaleText}</span>
        </span>
        <span className="mode-arrow">→</span>
      </button>

      <button className="mode-card" onClick={() => pick('retail')}>
        <span className="mode-emoji">🛍</span>
        <span className="mode-text">
          <b>{t.modeRetail}</b>
          <span>{t.modeRetailText}</span>
        </span>
        <span className="mode-arrow">→</span>
      </button>
    </div>
  );
}
