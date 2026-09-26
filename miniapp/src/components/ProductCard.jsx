import { imageUrl } from '../lib/api';
import { frameOf, frameStyle } from '../lib/frame';
import { discountPercent, money, wholesaleUnit } from '../lib/format';
import { pick } from '../lib/i18n';
import { haptic } from '../lib/telegram';
import { packsLeft, pairsLeft, soldOut } from '../lib/stock';
import PriceTag, { OldPrice } from './PriceTag';

/** Kartochkadagi qoldiq: optomda komplekt, donada jami juftlar (hisoblanmasa — null) */
function stockLeft(product, isWholesale) {
  if (isWholesale) return packsLeft(product);
  if (!product.stockPairs) return null;
  return product.sizes.reduce((sum, size) => sum + pairsLeft(product, size), 0);
}

export default function ProductCard({ product, lang, t, mode, inCart, onOpen, onQuickAdd }) {
  const currency = t.sum;
  const isWholesale = mode === 'wholesale';
  const discount = isWholesale ? 0 : discountPercent(product);
  const unitPrice = isWholesale ? wholesaleUnit(product) : product.price;
  const out = soldOut(product, mode);
  const left = stockLeft(product, isWholesale);

  return (
    <div className="card" onClick={() => onOpen(product)}>
      <div className={`card-img${out ? ' sold-out' : ''}`}>
        <img
          src={imageUrl(product.images[0])}
          alt={pick(product, 'name', lang)}
          loading="lazy"
          style={frameStyle(frameOf(product, product.images[0]))}
        />
        {discount > 0 && !out && <span className="sale-badge">−{discount}%</span>}
        {out && <span className="soldout-badge">{t.soldOut}</span>}
        {!out && (
        <button
          className={`card-add${inCart ? ' added' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            haptic('medium');
            onQuickAdd(product);
          }}
          aria-label={t.addToCart}
        >
          {inCart ? '✓' : '+'}
        </button>
        )}
      </div>

      <div className="card-body">
        <div className="card-name">{pick(product, 'name', lang)}</div>
        <div className="card-art">{product.article}</div>

        <div className="price-row">
          <PriceTag value={unitPrice} currency={currency} sale={discount > 0} />
          {discount > 0 && <OldPrice value={product.oldPrice} currency={currency} />}
        </div>
        {left !== null && !out && (
          <div className={`card-stock${left < 5 ? ' low' : ''}`}>
            {isWholesale ? t.packsLeftShort(left) : t.pairsLeftShort(left)}
          </div>
        )}
        {isWholesale && (
          <div className="card-pack">
            1 {t.pack} ({product.sizes.length} {t.pair}): <b>{money(unitPrice * product.sizes.length)}</b>
          </div>
        )}
      </div>
    </div>
  );
}
