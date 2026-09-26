import { useEffect, useMemo, useRef, useState } from 'react';
import { imageUrl } from '../lib/api';
import { pick } from '../lib/i18n';
import { discountPercent, money, wholesaleUnit } from '../lib/format';
import { MAX_PACKS, cartKey } from '../lib/store';
import { maxPacks, maxPairs, packsLeft, pairsLeft } from '../lib/stock';
import { haptic, notifySuccess } from '../lib/telegram';
import { colorLabel, effectiveColor, productColors } from '../lib/colors';
import { frameOf, frameStyle } from '../lib/frame';
import PriceTag, { OldPrice } from './PriceTag';
import PhotoViewer from './PhotoViewer';

const PACK_PRESETS = [1, 2, 3, 5, 10, 20, 50, 100];

export default function ProductSheet({
  product,
  lang,
  t,
  mode,
  cartLine,
  cartItems = [],
  onClose,
  onAdd,
  onSetPacks,
}) {
  const isWholesale = mode === 'wholesale';
  const colors = productColors(product);
  const imageColorOf = (i) => product.imageColors?.[product.images[i]] || null;

  // Boshlang'ich rang — birinchi rasmning rangi (yoki mavjud birinchi rang)
  const startColor = () => effectiveColor(product, imageColorOf(0));
  const [color, setColor] = useState(startColor);
  const line = cartLine(mode, color);

  const [sizes, setSizes] = useState(line?.sizes || {});
  // Maydon vaqtincha bo'sh bo'lishi mumkin (yangi son yozilayotganda)
  const [packInput, setPackInput] = useState(String(line?.packs || 1));
  // Ombor: shu qatorga qancha qo'shish mumkin (boshqa ranglar savatchada band qilgani hisobga olinadi)
  const lineKey = cartKey(mode, product.id, color);
  const packCap = Math.min(MAX_PACKS, maxPacks(product, cartItems, lineKey));
  const pairCap = (size) => maxPairs(product, size, cartItems, lineKey);
  const packsTracked = packsLeft(product) !== null;
  const packs = Math.min(packCap, Math.max(0, Math.floor(Number(packInput) || 0)));
  const [photo, setPhoto] = useState(0);
  const [viewer, setViewer] = useState(false);
  const trackRef = useRef(null);
  const discount = isWholesale ? 0 : discountPercent(product);
  const unitPrice = isWholesale ? wholesaleUnit(product) : product.price;

  // Boshqa mahsulot ochildi — hammasi boshidan
  useEffect(() => {
    const c = startColor();
    const saved = cartLine(mode, c);
    setColor(c);
    setSizes(saved?.sizes || {});
    setPackInput(String(saved?.packs || 1));
    setPhoto(0);
    setViewer(false);
    if (trackRef.current) trackRef.current.scrollLeft = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, mode]);

  // Rang almashdi — shu rang savatchada bo'lsa, o'sha miqdorlar ko'rsatiladi
  const pickColorState = (c) => {
    if (c === color) return;
    setColor(c);
    const saved = cartLine(mode, c);
    if (saved) {
      setSizes(saved.sizes || {});
      setPackInput(String(saved.packs || 1));
    }
  };

  /** Karuselni i-rasmga suradi */
  const goTo = (i, smooth = true) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  };

  // Rasm surilganda — joriy rasm va (rasmning rangi bo'lsa) rang yangilanadi
  const onTrackScroll = () => {
    const el = trackRef.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i === photo) return;
    setPhoto(i);
    const c = imageColorOf(i);
    if (c) pickColorState(c);
  };

  // Rang tugmasi — shu rangdagi birinchi rasmga o'tadi
  const selectColor = (c) => {
    haptic();
    pickColorState(c);
    const i = product.images.findIndex((url) => product.imageColors?.[url] === c);
    if (i >= 0) goTo(i);
  };

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
    setPackInput(String(Math.min(packCap, Math.max(1, Math.floor(Number(value) || 1)))));
  };

  const typePacks = (value) => {
    const digits = String(value).replace(/\D/g, '').slice(0, 3);
    setPackInput(digits === '' ? '' : String(Math.min(packCap, Number(digits))));
  };

  const change = (size, delta) => {
    haptic();
    setSizes((prev) => {
      const next = { ...prev };
      const value = Math.min(pairCap(size), Math.max(0, Number(next[size] || 0) + delta));
      if (value === 0) delete next[size];
      else next[size] = value;
      return next;
    });
  };

  const submit = () => {
    if (qty === 0) return;
    notifySuccess();
    if (isWholesale) onSetPacks(product.id, packs, color);
    else {
      // Ombordagidan ko'p bo'lsa (savatchadagi eski qator) — qoldiqqacha kamaytiriladi
      const capped = Object.fromEntries(
        Object.entries(sizes).map(([size, n]) => [size, Math.min(Number(n), pairCap(size))])
      );
      onAdd(product.id, capped, color);
    }
    onClose();
  };

  const details = [
    [t.article, product.article],
    // Rang tugmalari bo'lsa, matndagi rang takrorlanmaydi
    [t.color, colors.length ? null : pick(product, 'color', lang)],
    [t.material, pick(product, 'material', lang)],
  ].filter(([, value]) => value);

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-handle" />

        <div className="sheet-scroll">
          {/* Rasmlar: chapga / o'ngga surib almashtiriladi, bosilsa butun ekranda ochiladi */}
          <div className="sheet-photo">
            <div className="photo-track" ref={trackRef} onScroll={onTrackScroll}>
              {product.images.map((src, i) => (
                <button
                  key={src}
                  className="photo-slide"
                  onClick={() => {
                    haptic();
                    setViewer(true);
                  }}
                >
                  <img
                    src={imageUrl(src)}
                    alt={pick(product, 'name', lang)}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    draggable={false}
                    style={frameStyle(frameOf(product, src))}
                  />
                </button>
              ))}
            </div>
            <span className="sheet-photo-zoom" aria-hidden="true">
              ⤢
            </span>
            {product.images.length > 1 && (
              <div className="photo-dots" aria-hidden="true">
                {product.images.map((src, i) => (
                  <span key={src} className={i === photo ? 'on' : ''} />
                ))}
              </div>
            )}
          </div>

          {product.images.length > 1 && (
            <div className="tags" style={{ padding: '10px 0 0' }}>
              {product.images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => goTo(i)}
                  style={{
                    flex: '0 0 auto',
                    width: 54,
                    height: 54,
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: i === photo ? '2px solid var(--navy)' : '1px solid var(--line)',
                    padding: 0,
                    position: 'relative',
                    background: 'var(--bg-soft)',
                  }}
                >
                  <img
                    src={imageUrl(src)}
                    alt=""
                    style={frameStyle(frameOf(product, src), 1)}
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

          {colors.length > 0 && (
            <div className="section" style={{ marginTop: 20 }}>
              <h3 className="h2">
                {t.chooseColor}: <span className="color-current">{colorLabel(color, lang)}</span>
              </h3>
              <div className="color-options">
                {colors.map((c) => (
                  <button
                    key={c.key}
                    className={`color-option${c.key === color ? ' active' : ''}`}
                    onClick={() => selectColor(c.key)}
                    aria-pressed={c.key === color}
                  >
                    <span className="color-dot" style={{ background: c.hex }} />
                    {c[lang === 'ru' ? 'ru' : 'uz']}
                  </button>
                ))}
              </div>
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

          {isWholesale ? (
            <div className="section" style={{ marginTop: 20 }}>
              <h3 className="h2">{t.choosePacks}</h3>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                {t.packOf(product.sizes)}
              </p>
              {packsTracked && (
                <div className={`stock-note${packsLeft(product) === 0 ? ' out' : packsLeft(product) < 5 ? ' low' : ''}`}>
                  📦 {packsLeft(product) === 0 ? t.soldOut : t.packsLeft(packsLeft(product))}
                </div>
              )}

              <div className="size-row on" style={{ marginTop: 10 }}>
                <div className="size-label">
                  {t.perPack}
                  <span>
                    = {qty} {t.pair}
                  </span>
                </div>
                <div className="stepper">
                  <button onClick={() => changePacks(packs - 1)} disabled={packs <= 1 || packCap === 0}>
                    −
                  </button>
                  <input
                    className="pack-input"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={packCap}
                    disabled={packCap === 0}
                    value={packInput}
                    onChange={(e) => typePacks(e.target.value)}
                    onBlur={() => packs === 0 && changePacks(1)}
                  />
                  <button onClick={() => changePacks(packs + 1)} disabled={packs >= packCap}>
                    +
                  </button>
                </div>
              </div>

              <div className="pack-presets">
                {PACK_PRESETS.filter((n) => n <= packCap).map((n) => (
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
                  const cap = pairCap(size);
                  const left = pairsLeft(product, size);
                  const out = left === 0;
                  return (
                    <div
                      key={size}
                      className={`size-row${value > 0 ? ' on' : ''}${out && value === 0 ? ' out' : ''}`}
                    >
                      <div className="size-label">
                        {size}
                        <span>{t.pair}</span>
                        {left !== null && (
                          <em className={`size-stock${out ? ' out' : left < 5 ? ' low' : ''}`}>
                            {out ? t.sizeSoldOut : t.pairsLeftShort(left)}
                          </em>
                        )}
                      </div>
                      <div className="stepper">
                        <button onClick={() => change(size, -1)} disabled={value === 0}>
                          −
                        </button>
                        <b>{value}</b>
                        <button onClick={() => change(size, 1)} disabled={value >= cap}>
                          +
                        </button>
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
              isWholesale ? (packCap === 0 ? t.soldOut : t.choosePacks) : t.chooseSizes
            ) : (
              <>
                {t.addToCart} ·{' '}
                {color && colors.length > 1 ? `${colorLabel(color, lang)}, ` : ''}
                {isWholesale ? `${packs} ${t.pack} (${qty} ${t.pair})` : `${qty} ${t.pair}`} —{' '}
                {money(total)} {t.sum}
              </>
            )}
          </button>
        </div>
      </div>
      {viewer && (
        <PhotoViewer
          images={product.images.map(imageUrl)}
          index={photo}
          onIndex={(i) => {
            setPhoto(i);
            goTo(i, false);
          }}
          onClose={() => setViewer(false)}
        />
      )}
    </>
  );
}
