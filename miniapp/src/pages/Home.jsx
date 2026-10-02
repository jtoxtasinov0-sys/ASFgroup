import { useMemo } from 'react';
import { imageUrl } from '../lib/api';
import InstallHint from '../components/InstallHint';
import Stories from '../components/Stories';
import ProductCard from '../components/ProductCard';
import ModeCards, { MODE_ART, OFFER_ART } from '../components/ModeCards';
import OfferCarousel from '../components/OfferCarousel';
import Icon from '../components/Icon';
import { discountPercent } from '../lib/format';
import { retryImage } from '../lib/image';
import { cartKey } from '../lib/store';
import { effectiveColor } from '../lib/colors';

const firstImage = (list) => list.find((p) => p.images?.length)?.images[0];

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
  const onSale = useMemo(
    () => (isWholesale ? [] : products.filter((p) => discountPercent(p) > 0)),
    [products, isWholesale]
  );
  const ready = products.filter((p) => p.category === 'ready');
  const upper = products.filter((p) => p.category === 'upper');

  const slides = useMemo(() => {
    const list = [
      {
        key: 'mode',
        title: t.offerRetailTitle,
        text: t.offerRetailText,
        // Ikkala rejimda ham — bitta juft oyoq kiyim (fonsiz brend rasmi)
        cutout: MODE_ART.retail,
      },
    ];
    if (onSale.length) {
      const max = Math.max(...onSale.map(discountPercent));
      list.push({
        key: 'sale',
        title: t.offerSaleTitle.replace('{n}', max),
        text: t.offerSaleText,
        image: firstImage(onSale),
      });
    }
    const fresh = products.slice(-6).reverse();
    // Yangi kolleksiya — fonsiz zagatovka rasmi (qora, shuning uchun orqasida yorug' nur)
    list.push({ key: 'new', title: t.offerNewTitle, text: t.offerNewText, cutout: OFFER_ART.upper, dark: true });
    return list;
  }, [products, onSale, t]);

  return (
    <div className="page home">
      <div className="bg-blob" aria-hidden="true" />

      <header className="header">
        <div className="header-text">
          <div className="header-name">
            {t.helloShort}, <span>{name}</span>
          </div>
          <div className="header-hello">{t.tagline}</div>
        </div>
        <button className="lang-pill glass" onClick={() => setLang(lang === 'uz' ? 'ru' : 'uz')}>
          {lang === 'uz' ? 'UZ' : 'RU'}
        </button>
        <img className="header-logo" src="/logo.png" alt="ASF GROUP" />
      </header>

      <Stories stories={stories} lang={lang} seen={seenStories} onOpen={onOpenStory} />

      <div className="wrap">
        <InstallHint t={t} />

        {/* Savdo turi — kichik almashtirgich (donaga o'chirilgan bo'lsa — yo'q) */}
        {onSetMode && <ModeCards t={t} products={products} mode={mode} onPick={onSetMode} compact />}

        <div className="section section-top">
          <div className="section-head">
            <h2 className="h2">{t.categories}</h2>
            <button className="link" onClick={() => goCatalog()}>
              {t.seeAll} <Icon name="arrow" size={13} stroke={2.4} />
            </button>
          </div>
          <div className={`cat-grid${isWholesale ? '' : ' single'}`}>
            <button className="cat-card" onClick={() => goCatalog('ready')}>
              <span className="cat-art">
                {firstImage(ready) && (
                  <img src={imageUrl(firstImage(ready), 320)} alt="" onError={retryImage} />
                )}
              </span>
              <b>{t.catReady}</b>
              <span>{ready.length ? t.modelsCount(ready.length) : t.catReadyText}</span>
              <i className="cat-go">
                <Icon name="arrow" size={14} stroke={2.4} />
              </i>
            </button>
            {/* Donada zagatovka yo'q — tayyor oyoq kiyim kartasi to'liq enni egallaydi */}
            {isWholesale && (
              <button className="cat-card" onClick={() => goCatalog('upper')}>
                <span className="cat-art">
                  {firstImage(upper) && (
                    <img src={imageUrl(firstImage(upper), 320)} alt="" onError={retryImage} />
                  )}
                </span>
                <b>{t.catUpper}</b>
                <span>{upper.length ? t.modelsCount(upper.length) : t.catUpperText}</span>
                <i className="cat-go">
                  <Icon name="arrow" size={14} stroke={2.4} />
                </i>
              </button>
            )}
          </div>
        </div>

        <OfferCarousel t={t} slides={slides} onAction={() => goCatalog()} />

        {onSale.length > 0 && (
          <div className="section">
            <div className="section-head">
              <h2 className="h2">{t.saleTitle}</h2>
            </div>
            <div className="grid">
              {onSale.map((product, i) => (
                <ProductCard
                  key={product.id}
                  index={i}
                  priority={i < 2}
                  product={product}
                  lang={lang}
                  t={t}
                  mode={mode}
                  inCart={Boolean(cart[cartKey(mode, product.id, effectiveColor(product, null))])}
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
