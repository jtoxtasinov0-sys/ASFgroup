import { useRef, useState } from 'react';
import { imageUrl } from '../lib/api';
import { flyToCart } from '../lib/fly';
import Icon from './Icon';
import { frameOf, frameStyle } from '../lib/frame';
import { discountPercent, money, wholesaleUnit } from '../lib/format';
import { pick } from '../lib/i18n';
import { haptic } from '../lib/telegram';
import { packsLeft, pairsLeft, soldOut } from '../lib/stock';
import PriceTag, { OldPrice } from './PriceTag';
import { retryImage } from '../lib/image';
import { productColors } from '../lib/colors';

/** Kartochkadagi qoldiq: optomda komplekt, donada jami juftlar (hisoblanmasa — null) */
function stockLeft(product, isWholesale) {
  if (isWholesale) return packsLeft(product);
  if (!product.stockPairs) return null;
  return product.sizes.reduce((sum, size) => sum + pairsLeft(product, size), 0);
}

export default function ProductCard({ product, lang, t, mode, inCart, onOpen, onQuickAdd, priority, index = 0 }) {
  const imgRef = useRef(null);
  const [pop, setPop] = useState(false);
  const currency = t.sum;
  const isWholesale = mode === 'wholesale';
  const discount = isWholesale ? 0 : discountPercent(product);
  const unitPrice = isWholesale ? wholesaleUnit(product) : product.price;
  const out = soldOut(product, mode);
  const left = stockLeft(product, isWholesale);
  const colors = productColors(product);

  return (
    <div
      className="card"
      // Kartochkalar ketma-ket, yengil kechikish bilan paydo bo'ladi
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      onClick={() => onOpen(product)}
    >
      <div className={`card-img${out ? ' sold-out' : ''}`}>
        <img
          ref={imgRef}
          src={imageUrl(product.images[0], 480)}
          alt={pick(product, 'name', lang)}
          // Birinchi kartochkalar darhol, qolganlari ekranga yaqinlashganda yuklanadi
          // (hammasi birdan yuklansa iPhone xotirasi to'lib, ilova oq bo'lib qoladi)
          loading={index < 8 ? 'eager' : 'lazy'}
          fetchpriority={priority ? 'high' : undefined}
          decoding="async"
          onError={retryImage}
          style={frameStyle(frameOf(product, product.images[0]))}
        />
        {discount > 0 && !out && <span className="sale-badge">−{discount}%</span>}
        {out && <span className="soldout-badge">{t.soldOut}</span>}
        {!out && (
        <button
          className={`card-add${inCart ? ' added' : ''}${pop ? ' pop' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            haptic('medium');
            if (onQuickAdd(product)) {
              flyToCart(imgRef.current, t.addedToCart);
              setPop(true);
              setTimeout(() => setPop(false), 600);
            }
          }}
          aria-label={t.addToCart}
        >
          <Icon name={inCart ? 'check' : 'plus'} size={18} stroke={2.6} />
        </button>
        )}
      </div>

      <div className="card-body">
        <div className="card-name">{pick(product, 'name', lang)}</div>
        <div className="card-meta">
          <span className="card-art">{product.article}</span>
          {colors.length > 0 && (
            <span className="card-colors" title={colors.map((c) => c[lang === 'ru' ? 'ru' : 'uz']).join(', ')}>
              {colors.map((c) => (
                <span key={c.key} className="card-color" style={{ background: c.hex }} />
              ))}
            </span>
          )}
        </div>

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
