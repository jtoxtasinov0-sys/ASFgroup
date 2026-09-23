import { useEffect, useMemo, useState } from 'react';
import { imageUrl } from '../lib/api';
import { pick } from '../lib/i18n';
import { discountPercent, money, wholesaleUnit } from '../lib/format';
import { MAX_PACKS } from '../lib/store';
import { haptic, notifySuccess } from '../lib/telegram';
import PriceTag, { OldPrice } from './PriceTag';

const PACK_PRESETS = [1, 2, 3, 5, 10, 20, 50, 100];

export default function ProductSheet({
  product,
  lang,
  t,
  mode,
  initialSizes,
  initialPacks,
  onClose,
  onAdd,
  onSetPacks,
}) {
  const isWholesale = mode === 'wholesale';
  const [sizes, setSizes] = useState(initialSizes || {});
  // Maydon vaqtincha bo'sh bo'lishi mumkin (yangi son yozilayotganda)
  const [packInput, setPackInput] = useState(String(initialPacks || 1));
  const packs = Math.min(MAX_PACKS, Math.max(0, Math.floor(Number(packInput) || 0)));
  const [photo, setPhoto] = useState(0);
  const discount = isWholesale ? 0 : discountPercent(product);
  const unitPrice = isWholesale ? wholesaleUnit(product) : product.price;

  useEffect(() => {
    setSizes(initialSizes || {});
    setPackInput(String(initialPacks || 1));
    setPhoto(0);
  }, [product.id, initialSizes, initialPacks]);

  const qty = useMemo(
    () =>
      isWholesale
        ? packs * product.sizes.length
        : Object.values(sizes).reduce((sum, n) => sum + Number(n || 0), 0),
    [isWholesale, packs, sizes, product.sizes.length]
  );

  const total = qty * unitPrice;

  const changePacks = (value) => {
    haptic();
    setPackInput(String(Math.min(MAX_PACKS, Math.max(1, Math.floor(Number(value) || 1)))));
  };

  const typePacks = (value) => {
    const digits = String(value).replace(/\D/g, '').slice(0, 3);
    setPackInput(digits === '' ? '' : String(Math.min(MAX_PACKS, Number(digits))));
  };

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
    if (isWholesale) onSetPacks(product.id, packs);
    else onAdd(product.id, sizes);
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
            <PriceTag value={unitPrice} currency={t.sum} big sale={discount > 0} />
            <span className="muted" style={{ fontSize: 12 }}>
              / {t.perPair}
            </span>
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

          {isWholesale ? (
            <div className="notice ok" style={{ marginTop: 10 }}>
              <span>📦</span>
              <span>
                <b>{t.packPrice}:</b> {money(unitPrice * product.sizes.length)} {t.sum}
                {unitPrice < product.price && (
                  <>
                    {' '}
                    · {t.retailOnly}: <s>{money(product.price)}</s>
                  </>
                )}
              </span>
            </div>
          ) : (
            wholesaleUnit(product) < product.price && (
              <div className="notice ok" style={{ marginTop: 10 }}>
                <span>📦</span>
                <span>
                  <b>{t.wholesale}:</b> {money(wholesaleUnit(product))} {t.sum} —{' '}
                  {t.wholesaleCheaper(money(product.price - wholesaleUnit(product)))}
                </span>
              </div>
            )
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

          {isWholesale ? (
            <div className="section" style={{ marginTop: 20 }}>
              <h3 className="h2">{t.choosePacks}</h3>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                {t.packOf(product.sizes)}
              </p>

              <div className="size-row on" style={{ marginTop: 10 }}>
                <div className="size-label">
                  {t.perPack}
                  <span>
                    = {qty} {t.pair}
                  </span>
                </div>
                <div className="stepper">
                  <button onClick={() => changePacks(packs - 1)} disabled={packs <= 1}>
                    −
                  </button>
                  <input
                    className="pack-input"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_PACKS}
                    value={packInput}
                    onChange={(e) => typePacks(e.target.value)}
                    onBlur={() => packs === 0 && changePacks(1)}
                  />
                  <button onClick={() => changePacks(packs + 1)} disabled={packs >= MAX_PACKS}>
                    +
                  </button>
                </div>
              </div>

              <div className="pack-presets">
                {PACK_PRESETS.map((n) => (
                  <button
                    key={n}
                    className={`tag${packs === n ? ' active' : ''}`}
                    onClick={() => changePacks(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <div className="pack-sizes">
                {product.sizes.map((size) => (
                  <span className="chip" key={size}>
                    <b>{size}</b> × {packs}
                  </span>
                ))}
              </div>
            </div>
          ) : (
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
          )}
        </div>

        <div className="sheet-cta">
          <button className="btn" onClick={submit} disabled={qty === 0}>
            {qty === 0 ? (
              isWholesale ? t.choosePacks : t.chooseSizes
            ) : (
              <>
                {t.addToCart} ·{' '}
                {isWholesale ? `${packs} ${t.pack} (${qty} ${t.pair})` : `${qty} ${t.pair}`} —{' '}
                {money(total)} {t.sum}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
