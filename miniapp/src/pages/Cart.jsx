import { useEffect, useMemo, useState } from 'react';
import { api, imageUrl } from '../lib/api';
import { money } from '../lib/format';
import { pick } from '../lib/i18n';
import { haptic } from '../lib/telegram';
import PriceTag from '../components/PriceTag';

export default function Cart({ t, lang, cartItems, products, onChangeSize, onRemove, onCheckout, goCatalog }) {
  const [calc, setCalc] = useState(null);
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    api
      .calculate(cartItems)
      .then((data) => {
        if (!cancelled) setCalc(data);
      })
      .catch(() => {
        if (!cancelled) setCalc(null);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
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

  const totalQty = calc?.totalQty ?? 0;

  // Optom narxgacha yana nechta juft kerak?
  const nextWholesale = (() => {
    if (calc?.isWholesale) return 0;
    const mins = cartItems
      .map((item) => productMap.get(item.productId))
      .filter((p) => p && p.wholesalePrice < p.price)
      .map((p) => p.wholesaleMin);
    if (!mins.length) return 0;
    const min = Math.min(...mins);
    return totalQty >= min ? 0 : min - totalQty;
  })();

  return (
    <div className="page">
      <div className="wrap" style={{ paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}>
        <h1 className="h1">{t.cartTitle}</h1>

        {cartItems.map((item) => {
          const product = productMap.get(item.productId);
          if (!product) return null;
          const line = calc?.items.find((i) => i.productId === item.productId);

          return (
            <div className="cart-item" key={item.productId}>
              <img className="cart-thumb" src={imageUrl(product.images[0])} alt="" />

              <div className="cart-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {pick(product, 'name', lang)}
                    </div>
                    <div className="card-art">{product.article}</div>
                  </div>
                  <button
                    className="muted"
                    style={{ fontSize: 18, lineHeight: 1, padding: '0 2px' }}
                    onClick={() => {
                      haptic();
                      onRemove(item.productId);
                    }}
                    aria-label={t.remove}
                  >
                    ×
                  </button>
                </div>

                <div className="cart-sizes">
                  {Object.entries(item.sizes).map(([size, qty]) => (
                    <span className="chip" key={size}>
                      <b>{size}</b>
                      <button onClick={() => onChangeSize(item.productId, size, -1)}>−</button>
                      {qty}
                      <button onClick={() => onChangeSize(item.productId, size, 1)}>+</button>
                    </span>
                  ))}
                </div>

                <div className="price-row">
                  <PriceTag value={line ? line.lineTotal : 0} currency={t.sum} />
                  {line?.wholesaleApplied && (
                    <span className="muted" style={{ fontSize: 11 }}>
                      {money(line.unitPrice)} × {line.qty}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div className="summary">
          <div className="summary-row">
            <span className="muted">{t.itemsCount}</span>
            <b>
              {totalQty} {t.pair}
            </b>
          </div>
          <div className="summary-row total">
            <span>{t.total}</span>
            <span>
              {busy ? '…' : money(calc?.total || 0)} {t.sum}
            </span>
          </div>
        </div>

        {calc?.isWholesale && <div className="notice ok">{t.wholesaleOn}</div>}
        {!calc?.isWholesale && nextWholesale > 0 && (
          <div className="notice">
            <span>📦</span>
            <span>{t.wholesaleHint(nextWholesale)}</span>
          </div>
        )}

        <div className="notice warn">
          <span>🇺🇿</span>
          <span>{t.onlyUz}</span>
        </div>

        <button
          className="btn"
          style={{ marginTop: 16 }}
          disabled={busy || !calc?.items.length}
          onClick={onCheckout}
        >
          {t.checkout}
        </button>
      </div>
    </div>
  );
}
