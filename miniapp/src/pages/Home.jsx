import Stories from '../components/Stories';
import ProductCard from '../components/ProductCard';
import { discountPercent } from '../lib/format';
import { cartKey } from '../lib/store';

export default function Home({
  t,
  lang,
  setLang,
  user,
  stories,
  seenStories,
  onOpenStory,
  products,
  mode,
  onSetMode,
  cart,
  onOpenProduct,
  onQuickAdd,
  goCatalog,
}) {
  const name = user?.firstName || (lang === 'ru' ? 'Гость' : 'Mehmon');
  const isWholesale = mode === 'wholesale';
  // Chegirmalar dona narxiga tegishli — optomda ko'rsatilmaydi
  const onSale = isWholesale ? [] : products.filter((p) => discountPercent(p) > 0);
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
        {/* Savdo turi — har safar bosh sahifada ko'rinib turadi */}
        <div className="mode-switch">
          <button
            className={`mode-tab${isWholesale ? ' active' : ''}`}
            onClick={() => onSetMode('wholesale')}
          >
            <span className="mode-tab-emoji">📦</span>
            <b>
            {t.modeWholesale}
            {t.modeWholesaleSub && <small className="mode-sub"> {t.modeWholesaleSub}</small>}
          </b>
            <span>{t.modeTabWholesale}</span>
          </button>
          <button
            className={`mode-tab${!isWholesale ? ' active' : ''}`}
            onClick={() => onSetMode('retail')}
          >
            <span className="mode-tab-emoji">🛍</span>
            <b>{t.modeRetail}</b>
            <span>{t.modeTabRetail}</span>
          </button>
        </div>

        <div className="hero">
          <h2>{isWholesale ? t.wholesaleSection : t.retailSection}</h2>
          <p>{isWholesale ? t.modeWholesaleText : t.modeRetailText}</p>
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

        {onSale.length > 0 && (
          <div className="section">
            <div className="section-head">
              <h2 className="h2">{t.saleTitle}</h2>
            </div>
            <div className="grid">
              {onSale.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  lang={lang}
                  t={t}
                  mode={mode}
                  inCart={Boolean(cart[cartKey(mode, product.id)])}
                  onOpen={onOpenProduct}
                  onQuickAdd={onQuickAdd}
                />
              ))}
            </div>
          </div>
        )}

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
                  mode={mode}
                  inCart={Boolean(cart[cartKey(mode, product.id)])}
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
