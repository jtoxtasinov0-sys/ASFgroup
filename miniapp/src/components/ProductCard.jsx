import { imageUrl } from '../lib/api';
import { pick } from '../lib/i18n';
import { haptic } from '../lib/telegram';
import PriceTag, { OldPrice } from './PriceTag';

export default function ProductCard({ product, lang, t, inCart, onOpen, onQuickAdd }) {
  const currency = t.sum;

  return (
    <div className="card" onClick={() => onOpen(product)}>
      <div className="card-img">
        <img src={imageUrl(product.images[0])} alt={pick(product, 'name', lang)} loading="lazy" />
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
      </div>

      <div className="card-body">
        <div className="card-name">{pick(product, 'name', lang)}</div>
        <div className="card-art">{product.article}</div>

        <div className="price-row">
          {product.oldPrice ? <OldPrice value={product.oldPrice} currency={currency} /> : null}
          <PriceTag value={product.price} currency={currency} sale={Boolean(product.oldPrice)} />
        </div>
      </div>
    </div>
  );
}
