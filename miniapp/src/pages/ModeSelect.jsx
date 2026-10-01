import ModeCards from '../components/ModeCards';

/** Ilovaga kirganda: optom yoki donaga (optom — asosiy) */
export default function ModeSelect({ t, lang, setLang, products, onPick }) {
  return (
    <div className="mode-page">
      <div className="bg-blob" aria-hidden="true" />
      <div style={{ display: 'flex', justifyContent: 'flex-end', position: 'relative' }}>
        <button className="lang-pill" onClick={() => setLang(lang === 'uz' ? 'ru' : 'uz')}>
          {lang === 'uz' ? 'UZ' : 'RU'}
        </button>
      </div>

      <img className="mode-logo" src="/logo.png" alt="ASF GROUP" />
      <div className="eyebrow center-text">ASF GROUP</div>
      <h1>{t.modeTitle}</h1>
      <p className="muted">{t.modeText}</p>

      <ModeCards t={t} products={products} mode="wholesale" onPick={onPick} large />
    </div>
  );
}
