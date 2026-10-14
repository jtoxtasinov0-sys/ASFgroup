import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { date, imageUrl, money } from '../lib/api';
import { colorOf } from '../lib/colors';

const TAG_LABELS = {
  klassik: 'Klassik',
  mokasin: 'Mokasin',
  loafer: 'Loafer',
  slipon: 'Slip-on',
  sport: 'Sport',
  yozgi: 'Yozgi',
  qishki: 'Qishki',
};

/** Rangli doiracha + nomi */
function ColorDot({ value }) {
  const info = colorOf(value);
  if (!info) return null;
  return (
    <span className="pv-color">
      <span className="pv-dot" style={{ background: info.hex }} />
      {info.label}
    </span>
  );
}

/**
 * Mahsulotni to'liq ko'rish: katta rasm (barmoq bilan surish, bosilsa butun
 * ekranga) va barcha ma'lumotlar.
 */
export default function ProductView({ product, onClose, onEdit }) {
  const images = product.images || [];
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const touch = useRef(null);

  const go = (step) => setIndex((i) => (i + step + images.length) % images.length);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') zoom ? setZoom(false) : onClose();
      if (images.length > 1 && e.key === 'ArrowRight') go(1);
      if (images.length > 1 && e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const swipe = {
    onTouchStart: (e) => {
      touch.current = e.touches[0].clientX;
    },
    onTouchEnd: (e) => {
      if (touch.current == null || images.length < 2) return;
      const dx = e.changedTouches[0].clientX - touch.current;
      touch.current = null;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    },
  };

  const current = images[index];
  const imageColor = product.imageColors?.[current];
  const discount =
    product.oldPrice > product.price ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const colorArticles = Object.entries(product.colorArticles || {});
  const stockPairs = Object.entries(product.stockPairs || {});

  const rows = [
    ['Artikul', <b className="mono">{product.article}</b>],
    [
      'Kategoriya',
      <span className={`badge ${product.category}`}>
        {product.category === 'ready' ? 'Tayyor oyoq kiyim' : 'Zagatovka'}
      </span>,
    ],
    product.tag && ['Teg', TAG_LABELS[product.tag] || product.tag],
    ['Nomi (uz)', product.name],
    product.nameRu && ['Nomi (ru)', product.nameRu],
    (product.color || product.colorRu) && [
      'Rang',
      [product.color, product.colorRu].filter(Boolean).join(' / '),
    ],
    (product.material || product.materialRu) && [
      'Material',
      [product.material, product.materialRu].filter(Boolean).join(' / '),
    ],
    [
      'Dona narxi',
      <>
        <b className="mono">{money(product.price)} so'm</b>
        {discount > 0 && (
          <>
            {' '}
            <span className="muted mono" style={{ textDecoration: 'line-through' }}>
              {money(product.oldPrice)}
            </span>{' '}
            <span className="badge sale">−{discount}%</span>
          </>
        )}
      </>,
    ],
    [
      'Optom narxi',
      product.wholesalePrice < product.price ? (
        <>
          <b className="mono" style={{ color: 'var(--green)' }}>
            {money(product.wholesalePrice)} so'm
          </b>{' '}
          <span className="muted">({product.wholesaleMin} juftdan)</span>
        </>
      ) : (
        <span className="muted">Dona narxi bilan bir xil</span>
      ),
    ],
    [
      'Razmerlar',
      <div className="pv-sizes">
        {product.sizes.map((s) => (
          <span key={s} className="pv-size">
            {s}
          </span>
        ))}
      </div>,
    ],
    [
      'Ombor',
      <>
        <span className={`badge ${product.inStock ? 'on' : 'off'}`}>
          {product.inStock ? 'Omborda bor' : "Omborda yo'q"}
        </span>
        {product.stockPacks != null && (
          <div className="muted" style={{ marginTop: 4 }}>
            {product.stockPacks} komplekt
          </div>
        )}
        {stockPairs.length > 0 && (
          <div className="muted mono" style={{ marginTop: 4 }}>
            {stockPairs.map(([size, n]) => `${size}: ${n}`).join(' · ')}
          </div>
        )}
      </>,
    ],
    [
      'Mini App',
      <span className={`badge ${product.isActive ? 'on' : 'off'}`}>
        {product.isActive ? "Ko'rinadi" : "Ko'rinmaydi"}
      </span>,
    ],
    colorArticles.length > 0 && [
      'Rang artikullari',
      <div className="pv-list">
        {colorArticles.map(([c, art]) => (
          <div key={c}>
            <ColorDot value={c} /> — <b className="mono">{art}</b>
          </div>
        ))}
      </div>,
    ],
    ['Tartib raqami', product.sortOrder],
    product.createdAt && ["Qo'shilgan", date(product.createdAt)],
    product.updatedAt && ['Yangilangan', date(product.updatedAt)],
  ].filter(Boolean);

  // Body'ga chiqariladi — telefonda yuqori menyu oyna ustini yopib qolmasin
  return createPortal(
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal pv">
        <div className="modal-head">
          <h2>
            {product.article} — {product.name}
          </h2>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        {current ? (
          <div className="pv-stage" {...swipe}>
            <img
              src={imageUrl(current)}
              alt={product.name}
              onClick={() => setZoom(true)}
              title="Kattalashtirish uchun bosing"
            />
            {images.length > 1 && (
              <>
                <button type="button" className="pv-nav prev" onClick={() => go(-1)}>
                  ‹
                </button>
                <button type="button" className="pv-nav next" onClick={() => go(1)}>
                  ›
                </button>
                <span className="pv-count">
                  {index + 1} / {images.length}
                </span>
              </>
            )}
            {imageColor && (
              <span className="pv-tagcolor">
                <ColorDot value={imageColor} />
              </span>
            )}
          </div>
        ) : null}

        {images.length > 1 && (
          <div className="pv-thumbs">
            {images.map((url, i) => (
              <button
                type="button"
                key={url}
                className={i === index ? 'on' : ''}
                onClick={() => setIndex(i)}
              >
                <img src={imageUrl(url)} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}

        <div className="modal-body">
          <dl className="pv-info">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          {(product.description || product.descriptionRu) && (
            <div className="pv-desc">
              {product.description && (
                <>
                  <h4>Tavsif (uz)</h4>
                  <p>{product.description}</p>
                </>
              )}
              {product.descriptionRu && (
                <>
                  <h4>Tavsif (ru)</h4>
                  <p>{product.descriptionRu}</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-line" onClick={onClose}>
            Yopish
          </button>
          <button type="button" className="btn" onClick={onEdit}>
            Tahrirlash
          </button>
        </div>
      </div>

      {zoom &&
        current &&
        createPortal(
          <div className="pv-zoom" onClick={() => setZoom(false)} {...swipe}>
            <img src={imageUrl(current)} alt={product.name} />
            <button type="button" className="pv-zoom-close" onClick={() => setZoom(false)}>
              ×
            </button>
            {images.length > 1 && (
              <span className="pv-count">
                {index + 1} / {images.length}
              </span>
            )}
          </div>,
          document.body,
        )}
    </div>,
    document.body,
  );
}
