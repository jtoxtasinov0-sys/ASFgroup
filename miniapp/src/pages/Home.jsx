import Stories from '../components/Stories';
import ProductCard from '../components/ProductCard';

export default function Home({
  t,
  lang,
  setLang,
  user,
  stories,
  seenStories,
  onOpenStory,
  products,
  cart,
  onOpenProduct,
  onQuickAdd,
  goCatalog,
}) {
  const name = user?.firstName || (lang === 'ru' ? 'Гость' : 'Mehmon');
  const popular = products.slice(0, 4);

  return (
    <div className="page">
      <header className="header">
        <img className="header-logo" src="/logo.png" alt="ASF GROUP" />
        <div className="header-text">
          <div className="header-hello">{t.hello}</div>
          <div className="header-name">{name} 👋</div>
        </div>
        <button className="lang-pill" onClick={() => setLang(lang === 'uz' ? 'ru' : 'uz')}>
          {lang === 'uz' ? 'UZ' : 'RU'}
        </button>
      </header>

      <Stories stories={stories} lang={lang} seen={seenStories} onOpen={onOpenStory} />

      <div className="wrap">
        <div className="hero">
          <h2>{t.heroTitle}</h2>
          <p>{t.heroText}</p>
          <button onClick={() => goCatalog()}>{t.heroBtn}</button>
        </div>

        <div className="section">
          <div className="cat-grid">
            <button className="cat-card" onClick={() => goCatalog('ready')}>
              <span className="cat-emoji">👞</span>
              <b>{t.catReady}</b>
              <span>{t.catReadyText}</span>
            </button>
            <button className="cat-card" onClick={() => goCatalog('upper')}>
              <span className="cat-emoji">🧵</span>
              <b>{t.catUpper}</b>
              <span>{t.catUpperText}</span>
            </button>
          </div>
        </div>

        {popular.length > 0 && (
          <div className="section">
            <div className="section-head">
              <h2 className="h2">{t.popular}</h2>
              <button className="link" onClick={() => goCatalog()}>
                {t.seeAll} →
              </button>
            </div>
            <div className="grid">
              {popular.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  lang={lang}
                  t={t}
                  inCart={Boolean(cart[product.id])}
                  onOpen={onOpenProduct}
                  onQuickAdd={onQuickAdd}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
