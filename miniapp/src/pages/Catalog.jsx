import { useMemo, useState } from 'react';
import ProductCard from '../components/ProductCard';
import { cartKey } from '../lib/store';
import { haptic } from '../lib/telegram';

export default function Catalog({
  t,
  lang,
  products,
  config,
  category,
  setCategory,
  mode,
  onChangeMode,
  cart,
  onOpenProduct,
  onQuickAdd,
}) {
  const [tag, setTag] = useState('all');
  const [search, setSearch] = useState('');

  const categories = config?.categories || [];
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
      <div className="wrap" style={{ paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <h1 className="h1">{t.navCatalog}</h1>
          <button
            className={`mode-pill${mode === 'wholesale' ? ' wholesale' : ''}`}
            onClick={onChangeMode}
          >
            {mode === 'wholesale' ? t.modeBadgeWholesale : t.modeBadgeRetail} ⇄
          </button>
        </div>
        <input
          style={{ marginTop: 12 }}
          placeholder={t.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
            {filtered.map((product) => (
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
        )}
      </div>
    </div>
  );
}
