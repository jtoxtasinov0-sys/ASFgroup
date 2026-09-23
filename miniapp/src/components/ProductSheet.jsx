import { useEffect, useMemo, useState } from 'react';
import { imageUrl } from '../lib/api';
import { pick } from '../lib/i18n';
import { discountPercent, money } from '../lib/format';
import { haptic, notifySuccess } from '../lib/telegram';
import PriceTag, { OldPrice } from './PriceTag';

export default function ProductSheet({ product, lang, t, initialSizes, onClose, onAdd }) {
  const [sizes, setSizes] = useState(initialSizes || {});
  const [photo, setPhoto] = useState(0);
  const discount = discountPercent(product);

  useEffect(() => {
    setSizes(initialSizes || {});
    setPhoto(0);
  }, [product.id, initialSizes]);

  const qty = useMemo(
    () => Object.values(sizes).reduce((sum, n) => sum + Number(n || 0), 0),
    [sizes]
  );

  const total = qty * product.price;

  const change = (size, delta) => {
    haptic();
    setSizes((prev) => {
      const next = { ...prev };
      const value = Math.max(0, Number(next[size] || 0) + delta);
      if (value === 0) delete next[size];
      else next[size] = value;
      return next;
    });
  };

  const submit = () => {
    if (qty === 0) return;
    notifySuccess();
    onAdd(product.id, sizes);
    onClose();
  };

  const details = [
    [t.article, product.article],
    [t.color, pick(product, 'color', lang)],
    [t.material, pick(product, 'material', lang)],
  ].filter(([, value]) => value);

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-handle" />

        <div className="sheet-scroll">
          <div className="sheet-photo">
            <img
              src={imageUrl(product.images[photo] || product.images[0])}
              alt={pick(product, 'name', lang)}
            />
          </div>

          {product.images.length > 1 && (
            <div className="tags" style={{ padding: '10px 0 0' }}>
              {product.images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setPhoto(i)}
                  style={{
                    flex: '0 0 auto',
                    width: 54,
                    height: 54,
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: i === photo ? '2px solid var(--navy)' : '1px solid var(--line)',
                    padding: 0,
                  }}
                >
                  <img
                    src={imageUrl(src)}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </button>
              ))}
            </div>
          )}

          <h2 className="h1" style={{ marginTop: 16 }}>
            {pick(product, 'name', lang)}
          </h2>

          <div className="price-row" style={{ marginTop: 8 }}>
            <PriceTag value={product.price} currency={t.sum} big sale={discount > 0} />
            {discount > 0 && (
              <>
                <OldPrice value={product.oldPrice} currency={t.sum} />
                <span className="sale-chip">−{discount}%</span>
              </>
            )}
          </div>
          {discount > 0 && (
            <div className="sale-save">
              🔥 {t.youSave}: <b>{money(product.oldPrice - product.price)} {t.sum}</b>
            </div>
          )}

          {product.wholesalePrice < product.price && (
            <div className="notice ok" style={{ marginTop: 10 }}>
              <span>📦</span>
              <span>
                <b>{t.wholesale}:</b> {money(product.wholesalePrice)} {t.sum} —{' '}
                {t.wholesaleFrom(product.wholesaleMin)}
              </span>
            </div>
          )}

          <div className="section" style={{ marginTop: 20 }}>
            <h3 className="h2">{t.composition}</h3>
            <ul className="bullets">
              {details.map(([label, value]) => (
                <li key={label}>
                  <b>{label}:</b> {value}
                </li>
              ))}
              {pick(product, 'description', lang) ? (
                <li>{pick(product, 'description', lang)}</li>
              ) : null}
              <li>
                <b>{t.chooseSizes.replace(':', '')}:</b> {product.sizes.join(' · ')}
              </li>
            </ul>
          </div>

          <div className="section" style={{ marginTop: 20 }}>
            <h3 className="h2">{t.chooseSizes}</h3>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {t.sizeHint}
            </p>

            <div className="sizes">
              {product.sizes.map((size) => {
                const value = Number(sizes[size] || 0);
                return (
                  <div key={size} className={`size-row${value > 0 ? ' on' : ''}`}>
                    <div className="size-label">
                      {size}
                      <span>{t.pair}</span>
                    </div>
                    <div className="stepper">
                      <button onClick={() => change(size, -1)} disabled={value === 0}>
                        −
                      </button>
                      <b>{value}</b>
                      <button onClick={() => change(size, 1)}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="sheet-cta">
          <button className="btn" onClick={submit} disabled={qty === 0}>
            {qty === 0 ? (
              t.chooseSizes
            ) : (
              <>
                {t.addToCart} · {qty} {t.pair} — {money(total)} {t.sum}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
