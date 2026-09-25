import { useEffect, useMemo, useState } from 'react';
import { api, imageUrl } from '../lib/api';
import { colorImage, colorLabel, effectiveColor } from '../lib/colors';
import { frameOf, frameStyle } from '../lib/frame';
import { money, wholesaleUnit } from '../lib/format';
import { pick } from '../lib/i18n';
import { itemQty } from '../lib/store';
import { haptic } from '../lib/telegram';
import PriceTag, { OldPrice } from '../components/PriceTag';

/**
 * Server javob bermasa (uxlab yotgan yoki ulanish yo'q) savatcha bo'sh
 * ko'rinib qolmasin — xuddi server kabi mahalliy hisoblaymiz.
 * Buyurtma narxi baribir serverda qayta tekshiriladi.
 */
function localCalc(cartItems, productMap) {
  const items = [];
  let total = 0;
  let isWholesale = false;
  for (const item of cartItems) {
    const product = productMap.get(item.productId);
    if (!product) continue;
    const qty = itemQty(item, product);
    if (qty === 0) continue;
    const wholesale = item.mode === 'wholesale';
    const unitPrice = wholesale ? wholesaleUnit(product) : product.price;
    if (wholesale) isWholesale = true;
    total += unitPrice * qty;
    const color = effectiveColor(product, item.color);
    items.push({
      productId: product.id,
      mode: item.mode,
      ...(color ? { color } : {}),
      unitPrice,
      qty,
      lineTotal: unitPrice * qty,
      wholesaleApplied: wholesale && unitPrice < product.price,
    });
  }
  const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
  return { items, total, totalQty, isWholesale };
}

export default function Cart({
  t,
  lang,
  cartItems,
  products,
  onChangeSize,
  onChangePacks,
  onRemove,
  onCheckout,
  goCatalog,
}) {
  const [serverCalc, setCalc] = useState(null);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  // Narxlarni har doim serverda qayta hisoblaymiz
  useEffect(() => {
    let cancelled = false;
    if (cartItems.length === 0) {
      setCalc(null);
      return undefined;
    }
    api
      .calculate(cartItems)
      .then((data) => {
        if (!cancelled) setCalc({ cartItems, data });
      })
      .catch(() => {
        if (!cancelled) setCalc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [cartItems]);

  if (cartItems.length === 0) {
    return (
      <div className="page">
        <div className="center">
          <div className="emoji">🛒</div>
          <b style={{ fontSize: 17 }}>{t.cartEmpty}</b>
          <span className="muted">{t.cartEmptyText}</span>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} onClick={goCatalog}>
            {t.goCatalog}
          </button>
        </div>
      </div>
    );
  }

  // Server javobi joriy savatchaga tegishli bo'lsagina ishlatiladi
  const calc =
    serverCalc?.cartItems === cartItems ? serverCalc.data : localCalc(cartItems, productMap);
  const totalQty = calc.totalQty;
  const lineOf = (item) => {
    const color = effectiveColor(productMap.get(item.productId), item.color);
    return calc.items.find(
      (i) =>
        i.productId === item.productId &&
        (i.mode || 'retail') === item.mode &&
        (i.color || null) === color
    );
  };

  // Eski narxga nisbatan qancha tejaladi (chegirmadagi dona mahsulotlar)
  const savedOf = (line) => {
    if (line.mode === 'wholesale') return 0;
    const old = productMap.get(line.productId)?.oldPrice || 0;
    return old > line.unitPrice ? (old - line.unitPrice) * line.qty : 0;
  };
  const saved = calc.items.reduce((sum, line) => sum + savedOf(line), 0);

  const wholesaleItems = cartItems.filter((item) => item.mode === 'wholesale');
  const retailItems = cartItems.filter((item) => item.mode !== 'wholesale');
  const totalPacks = wholesaleItems.reduce((sum, item) => sum + item.packs, 0);

  const renderItem = (item) => {
    const product = productMap.get(item.productId);
    if (!product) return null;
    const line = lineOf(item);
    const isWholesale = item.mode === 'wholesale';
    const color = effectiveColor(product, item.color);
    const thumb = colorImage(product, color);

    return (
      <div className="cart-item" key={item.key}>
        <div className="cart-thumb">
          <img src={imageUrl(thumb)} alt="" style={frameStyle(frameOf(product, thumb), 1)} />
        </div>

        <div className="cart-info">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{pick(product, 'name', lang)}</div>
              <div className="card-art">
                {product.article}
                {color && ` · 🎨 ${colorLabel(color, lang)}`}
              </div>
            </div>
            <button
              className="muted"
              style={{ fontSize: 18, lineHeight: 1, padding: '0 2px' }}
              onClick={() => {
                haptic();
                onRemove(item.key);
              }}
              aria-label={t.remove}
            >
              ×
            </button>
          </div>

          {isWholesale ? (
            <div className="cart-sizes">
              <span className="chip">
                <button onClick={() => onChangePacks(item.key, -1)}>−</button>
                <b>{item.packs}</b> {t.pack}
                <button onClick={() => onChangePacks(item.key, 1)}>+</button>
              </span>
              <span className="muted" style={{ fontSize: 11, alignSelf: 'center' }}>
                {product.sizes.join('·')} × {item.packs} = {itemQty(item, product)} {t.pair}
              </span>
            </div>
          ) : (
            <div className="cart-sizes">
              {Object.entries(item.sizes).map(([size, qty]) => (
                <span className="chip" key={size}>
                  <b>{size}</b>
                  <button onClick={() => onChangeSize(item.key, size, -1)}>−</button>
                  {qty}
                  <button onClick={() => onChangeSize(item.key, size, 1)}>+</button>
                </span>
              ))}
            </div>
          )}

          <div className="price-row">
            <PriceTag
              value={line ? line.lineTotal : 0}
              currency={t.sum}
              sale={Boolean(line && savedOf(line))}
            />
            {line && savedOf(line) > 0 && (
              <OldPrice value={line.lineTotal + savedOf(line)} currency={t.sum} />
            )}
            {line && (
              <span className="muted" style={{ fontSize: 11 }}>
                {money(line.unitPrice)} × {line.qty}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="wrap" style={{ paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}>
        <h1 className="h1">{t.cartTitle}</h1>

        {wholesaleItems.length > 0 && (
          <>
            <h2 className="h2 cart-group">{t.wholesaleSection}</h2>
            {wholesaleItems.map(renderItem)}
          </>
        )}

        {retailItems.length > 0 && (
          <>
            <h2 className="h2 cart-group">{t.retailSection}</h2>
            {retailItems.map(renderItem)}
          </>
        )}

        <div className="summary">
          <div className="summary-row">
            <span className="muted">{t.itemsCount}</span>
            <b>
              {totalPacks > 0 && `${totalPacks} ${t.pack} · `}
              {totalQty} {t.pair}
            </b>
          </div>
          {saved > 0 && (
            <div className="summary-row" style={{ color: 'var(--red)' }}>
              <span>{t.discount}</span>
              <b>
                −{money(saved)} {t.sum}
              </b>
            </div>
          )}
          <div className="summary-row total">
            <span>{t.total}</span>
            <span>
              {money(calc.total)} {t.sum}
            </span>
          </div>
        </div>

        {calc.isWholesale && <div className="notice ok">{t.wholesaleOn}</div>}

        <div className="notice warn">
          <span>🇺🇿</span>
          <span>{t.onlyUz}</span>
        </div>

        <button
          className="btn"
          style={{ marginTop: 16 }}
          disabled={!calc.items.length}
          onClick={onCheckout}
        >
          {t.checkout}
        </button>
      </div>
    </div>
  );
}
