import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { haptic } from '../lib/telegram';

const MAX_SCALE = 4;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Mahsulot rasmini butun ekranda, kesilmagan holda ko'rsatadi.
 * Ikki barmoq bilan kattalashtirish, ikki marta bosish — 2.5x,
 * chapga / o'ngga surish — keyingi / oldingi rasm.
 */
export default function PhotoViewer({ images, index, onIndex, onClose }) {
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [swipe, setSwipe] = useState(0);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const lastTap = useRef(0);
  const count = images.length;

  useEffect(() => {
    setView({ s: 1, x: 0, y: 0 });
    setSwipe(0);
  }, [index]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && index < count - 1) onIndex(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, count, onIndex, onClose]);

  const go = (next) => {
    if (next < 0 || next >= count) return;
    haptic();
    onIndex(next);
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];

    if (pts.length === 2) {
      gesture.current = { type: 'pinch', d: dist(pts[0], pts[1]), s: view.s };
    } else if (pts.length === 1) {
      gesture.current = {
        type: view.s > 1 ? 'pan' : 'swipe',
        sx: e.clientX,
        sy: e.clientY,
        vx: view.x,
        vy: view.y,
        moved: false,
      };
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;

    if (g.type === 'pinch') {
      const pts = [...pointers.current.values()];
      if (pts.length < 2) return;
      const s = clamp((g.s * dist(pts[0], pts[1])) / g.d, 1, MAX_SCALE);
      setView((prev) => (s === 1 ? { s: 1, x: 0, y: 0 } : { ...prev, s }));
      return;
    }

    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) g.moved = true;

    if (g.type === 'pan') setView((prev) => ({ ...prev, x: g.vx + dx, y: g.vy + dy }));
    else setSwipe(dx);
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size > 0) {
      // Ikki barmoqdan bittasi ko'tarildi — qolgani bilan surishni davom ettiramiz
      const [p] = [...pointers.current.values()];
      gesture.current = { type: 'pan', sx: p.x, sy: p.y, vx: view.x, vy: view.y, moved: true };
      return;
    }
    gesture.current = null;
    if (!g) return;

    if (g.type === 'swipe') {
      setSwipe(0);
      if (swipe < -60) go(index + 1);
      else if (swipe > 60) go(index - 1);
    }

    // Ikki marta bosish — kattalashtirish / asl holatga qaytarish
    if (!g.moved && g.type !== 'pinch') {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        lastTap.current = 0;
        setView((prev) => (prev.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 }));
      } else {
        lastTap.current = now;
      }
    }
  };

  return createPortal(
    <div className="photo-viewer">
      <div className="photo-viewer-top">
        {count > 1 ? (
          <span>
            {index + 1} / {count}
          </span>
        ) : (
          <span />
        )}
        <button className="photo-viewer-close" onClick={onClose} aria-label="close">
          ×
        </button>
      </div>

      <div
        className="photo-viewer-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          src={images[index]}
          alt=""
          draggable={false}
          style={{
            transform: `translate(${view.x + swipe}px, ${view.y}px) scale(${view.s})`,
            transition: gesture.current ? 'none' : 'transform 0.2s ease',
          }}
        />
      </div>

      {count > 1 && (
        <>
          <button
            className="photo-viewer-nav prev"
            disabled={index === 0}
            onClick={() => go(index - 1)}
            aria-label="prev"
          >
            ‹
          </button>
          <button
            className="photo-viewer-nav next"
            disabled={index === count - 1}
            onClick={() => go(index + 1)}
            aria-label="next"
          >
            ›
          </button>
          <div className="photo-viewer-dots">
            {images.map((src, i) => (
              <span key={src} className={i === index ? 'on' : ''} />
            ))}
          </div>
        </>
      )}
    </div>,
    document.body
  );
}
