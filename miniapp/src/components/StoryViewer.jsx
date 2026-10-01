import { useEffect, useRef, useState } from 'react';
import { imageUrl } from '../lib/api';
import { money } from '../lib/format';
import { pick } from '../lib/i18n';
import { haptic } from '../lib/telegram';
import { retryImage } from '../lib/image';
import Icon from './Icon';

/** Bitta story necha ms ko'rinadi — chiziq animatsiyasi bilan bir xil (CSS: barFill) */
const DURATION = 5000;
/** Shuncha pastga surilsa — story yopiladi */
const CLOSE_DRAG = 110;

export default function StoryViewer({ stories, startIndex, lang, t, products = [], onClose, onSeen, onProduct }) {
  const [index, setIndex] = useState(startIndex);
  const [paused, setPaused] = useState(false);
  const [drag, setDrag] = useState(0);
  const [closing, setClosing] = useState(false);
  const touch = useRef(null);
  // Uzoq bosib turilgan bo'lsa (pauza), qo'yib yuborish "keyingisi" deb sanalmaydi
  const held = useRef(false);
  const story = stories[index];

  useEffect(() => {
    if (story) onSeen(story.id);
  }, [story, onSeen]);

  // Keyingi storyning rasmi oldindan yuklanib turadi — almashganda kutilmaydi
  useEffect(() => {
    const nextStory = stories[index + 1];
    if (nextStory) new Image().src = imageUrl(nextStory.image);
  }, [index, stories]);

  if (!story) return null;

  const src = imageUrl(story.image);
  const product = story.productId ? products.find((p) => p.id === Number(story.productId)) : null;

  const close = () => {
    setClosing(true);
    setTimeout(onClose, 220);
  };

  const prev = () => {
    haptic();
    if (index > 0) setIndex(index - 1);
    else close();
  };

  const next = () => {
    if (index < stories.length - 1) setIndex(index + 1);
    else close();
  };

  /* Bosib turganda — to'xtaydi; pastga sursa — yopiladi */
  const onTouchStart = (e) => {
    touch.current = { y: e.touches[0].clientY, x: e.touches[0].clientX, at: Date.now() };
    setPaused(true);
  };

  const onTouchMove = (e) => {
    if (!touch.current) return;
    const dy = e.touches[0].clientY - touch.current.y;
    setDrag(Math.max(0, dy));
  };

  const onTouchEnd = () => {
    const wasDrag = drag;
    held.current = Date.now() - (touch.current?.at || 0) > 300;
    touch.current = null;
    setPaused(false);
    setDrag(0);
    if (wasDrag > CLOSE_DRAG) close();
  };

  // Uzoq bosib turilgan yoki surilgan bo'lsa — bu "keyingisi" bosish emas
  const tap = (fn) => () => {
    if (held.current) {
      held.current = false;
      return;
    }
    fn();
  };

  return (
    <div
      className={`viewer${closing ? ' closing' : ''}${paused ? ' paused' : ''}`}
      style={
        drag
          ? { transform: `translateY(${drag}px) scale(${1 - drag / 1600})`, borderRadius: Math.min(drag / 3, 28) }
          : undefined
      }
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="viewer-body" key={story.id}>
        {/* Rasm nisbati ekranga to'g'ri kelmasa, bo'sh joyni o'sha rasmning
            xiralashtirilgan nusxasi to'ldiradi — qora chiziqlar chiqmaydi */}
        <div className="viewer-bg" style={{ backgroundImage: `url("${src}")` }} />
        <img className="viewer-img" src={src} alt={pick(story, 'title', lang)} onError={retryImage} />
        <div className="viewer-zone left" onClick={tap(prev)} />
        <div className="viewer-zone right" onClick={tap(() => { haptic(); next(); })} />
      </div>

      <div className="viewer-bars">
        {stories.map((s, i) => (
          <div key={s.id} className="viewer-bar">
            <span
              key={i === index ? `run-${s.id}` : s.id}
              className={i < index ? 'done' : i === index ? 'run' : ''}
              style={i === index ? { animationDuration: `${DURATION}ms` } : undefined}
              onAnimationEnd={i === index ? next : undefined}
            />
          </div>
        ))}
      </div>

      <div className="viewer-top">
        <img src="/logo.png" alt="" />
        <div className="viewer-who">
          <b>ASF GROUP</b>
          <span>{t.tagline}</span>
        </div>
        <button className="viewer-close" onClick={close} aria-label={t.close}>
          ×
        </button>
      </div>

      <div className="viewer-cta" key={`cta-${story.id}`}>
        {product ? (
          <button className="viewer-product" onClick={() => onProduct(story.productId)}>
            <img src={imageUrl(product.images[0], 160)} alt="" onError={retryImage} />
            <span className="viewer-product-text">
              <b>{pick(product, 'name', lang)}</b>
              <span>
                {money(product.price)} {t.sum}
              </span>
            </span>
            <span className="viewer-product-go">
              <Icon name="arrow" size={18} stroke={2.4} />
            </span>
          </button>
        ) : story.productId ? (
          <button className="viewer-link" onClick={() => onProduct(story.productId)}>
            {pick(story, 'title', lang)}
            <Icon name="arrow" size={16} stroke={2.4} />
          </button>
        ) : (
          <div className="viewer-caption">{pick(story, 'title', lang)}</div>
        )}
      </div>
    </div>
  );
}
