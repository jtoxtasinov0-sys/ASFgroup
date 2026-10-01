import { useEffect, useRef, useState } from 'react';
import { imageUrl } from '../lib/api';
import { retryImage } from '../lib/image';
import { haptic } from '../lib/telegram';
import Icon from './Icon';

/** Bosh sahifadagi "Maxsus taklif" bannerlari — surib almashtiriladi, o'zi ham aylanadi */
export default function OfferCarousel({ t, slides, onAction }) {
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);
  const touched = useRef(false);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const timer = setInterval(() => {
      const track = trackRef.current;
      // Mijoz o'zi surayotgan bo'lsa — avtomatik aylanish to'xtaydi
      if (!track || touched.current) return;
      const next = (Math.round(track.scrollLeft / track.clientWidth) + 1) % slides.length;
      track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const onScroll = () => {
    const track = trackRef.current;
    if (track) setIndex(Math.round(track.scrollLeft / track.clientWidth));
  };

  if (!slides.length) return null;

  return (
    <div className="offers">
      <div
        className="offers-track"
        ref={trackRef}
        onScroll={onScroll}
        onTouchStart={() => {
          touched.current = true;
        }}
      >
        {slides.map((slide, i) => (
          <div key={slide.key} className={`offer offer-${i % 3}`}>
            <div className="offer-glow" aria-hidden="true" />
            <div className="offer-text">
              <span className="offer-label">{t.offerLabel}</span>
              <h3>{slide.title}</h3>
              <p>{slide.text}</p>
              <button
                className="offer-btn"
                onClick={() => {
                  haptic('medium');
                  onAction(slide.category);
                }}
              >
                {t.heroBtn}
                <Icon name="arrow" size={15} stroke={2.4} />
              </button>
            </div>
            {slide.cutout ? (
              <div className="offer-art">
                <span className="offer-ring" aria-hidden="true" />
                <img className="cutout" src={slide.cutout} alt="" decoding="async" />
              </div>
            ) : (
              slide.image && (
                <div className="offer-art">
                  <span className="offer-ring" aria-hidden="true" />
                  <img
                    src={imageUrl(slide.image, 480)}
                    alt=""
                    loading={i === 0 ? 'eager' : 'lazy'}
                    onError={retryImage}
                  />
                </div>
              )
            )}
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="offer-dots" aria-hidden="true">
          {slides.map((slide, i) => (
            <span key={slide.key} className={i === index ? 'on' : ''} />
          ))}
        </div>
      )}
    </div>
  );
}
