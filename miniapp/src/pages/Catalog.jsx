import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';
import ProductCard from '../components/ProductCard';
import { cartKey } from '../lib/store';
import { effectiveColor } from '../lib/colors';
import { haptic } from '../lib/telegram';

export default function Catalog({
  t,
  lang,
  products,
  config,
  category,
  setCategory,
  mode,
  focusSearch,
  onChangeMode,
  cart,
  onOpenProduct,
  onQuickAdd,
}) {
  const [tag, setTag] = useState('all');
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);

  // Pastki menyudagi "Qidiruv" bosilganda
  useEffect(() => {
    if (focusSearch) searchRef.current?.focus();
  }, [focusSearch]);

  // Donaga savdoda zagatovka yo'q — faqat optom
  const categories = (config?.categories || []).filter(
    (item) => mode !== 'retail' || item.key !== 'upper'
  );
  const tags = config?.tags || [];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (category !== 'all' && product.category !== category) return false;
      if (tag !== 'all' && product.tag !== tag) return false;
      if (!query) return true;
      return (
        String(product.name).toLowerCase().includes(query) ||
        String(product.nameRu || '').toLowerCase().includes(query) ||
        String(product.article).toLowerCase().includes(query)
      );
    });
  }, [products, category, tag, search]);

  const pickTag = (value) => {
    haptic();
    setTag(value);
  };

  return (
    <div className="page">
      <div className="bg-blob small" aria-hidden="true" />
      <div className="wrap" style={{ position: 'relative', paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <h1 className="h1">{t.navCatalog}</h1>
          {onChangeMode ? (
            <button
              className={`mode-pill${mode === 'wholesale' ? ' wholesale' : ''}`}
              onClick={onChangeMode}
            >
              {mode === 'wholesale' ? t.modeBadgeWholesale : t.modeBadgeRetail} ⇄
            </button>
          ) : (
            // Donaga savdo o'chirilgan — faqat optom, almashtirib bo'lmaydi
            <span className="mode-pill wholesale">{t.modeBadgeWholesale}</span>
          )}
        </div>
        <label className="search-box">
          <Icon name="search" size={19} />
          <input
            ref={searchRef}
            type="search"
            placeholder={t.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {/* Kategoriyalar */}
      <div className="tags" style={{ marginTop: 14 }}>
        <button
          className={`tag${category === 'all' ? ' active' : ''}`}
          onClick={() => {
            haptic();
            setCategory('all');
          }}
        >
          {t.all}
        </button>
        {categories.map((item) => (
          <button
            key={item.key}
            className={`tag${category === item.key ? ' active' : ''}`}
            onClick={() => {
              haptic();
              setCategory(item.key);
            }}
          >
            {lang === 'ru' ? item.ru : item.uz}
          </button>
        ))}
      </div>

      {/* Teglar */}
      <div className="tags" style={{ paddingBottom: 14 }}>
        <button className={`tag${tag === 'all' ? ' active' : ''}`} onClick={() => pickTag('all')}>
          {t.all}
        </button>
        {tags.map((item) => (
          <button
            key={item.key}
            className={`tag${tag === item.key ? ' active' : ''}`}
            onClick={() => pickTag(item.key)}
          >
            {lang === 'ru' ? item.ru : item.uz}
          </button>
        ))}
      </div>

      <div className="wrap">
        {filtered.length === 0 ? (
          <div className="center">
            <div className="emoji">🔍</div>
            <b>{t.nothingFound}</b>
          </div>
        ) : (
          <div className="grid">
            {filtered.map((product, i) => (
              <ProductCard
                key={product.id}
                index={i}
                priority={i < 4}
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
        )}
      </div>
    </div>
  );
}
