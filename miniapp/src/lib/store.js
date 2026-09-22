import { useCallback, useEffect, useMemo, useState } from 'react';

const CART_KEY = 'asf_cart_v1';
const LANG_KEY = 'asf_lang';
const INTRO_KEY = 'asf_seen_intro';

/* ---------- localStorage yordamchilari ---------- */

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) { /* private rejim */ }
};

/* ---------- Savatcha ---------- */

/**
 * Savatcha ko'rinishi:
 * { "12": { productId: 12, sizes: { "40": 2, "41": 3 } } }
 */
export function useCart() {
  const [cart, setCart] = useState(() => read(CART_KEY, {}));

  useEffect(() => write(CART_KEY, cart), [cart]);

  const addItem = useCallback((productId, sizes) => {
    const clean = {};
    for (const [size, qty] of Object.entries(sizes || {})) {
      const n = Math.floor(Number(qty));
      if (n > 0) clean[size] = n;
    }
    setCart((prev) => {
      const next = { ...prev };
      if (Object.keys(clean).length === 0) {
        delete next[productId];
      } else {
        next[productId] = { productId: Number(productId), sizes: clean };
      }
      return next;
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, []);

  const changeSize = useCallback((productId, size, delta) => {
    setCart((prev) => {
      const item = prev[productId];
      if (!item) return prev;
      const current = Number(item.sizes[size] || 0);
      const nextQty = Math.max(0, current + delta);

      const sizes = { ...item.sizes };
      if (nextQty === 0) delete sizes[size];
      else sizes[size] = nextQty;

      const next = { ...prev };
      if (Object.keys(sizes).length === 0) delete next[productId];
      else next[productId] = { ...item, sizes };
      return next;
    });
  }, []);

  const clear = useCallback(() => setCart({}), []);

  // useMemo muhim: `items` identifikatori o'zgarmasa, Savatcha sahifasi
  // narxni qayta-qayta so'ramaydi (cheksiz sikl oldini oladi)
  const items = useMemo(() => Object.values(cart), [cart]);

  const totalQty = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Object.values(item.sizes).reduce((a, b) => a + Number(b), 0),
        0
      ),
    [items]
  );

  return { cart, items, totalQty, addItem, removeItem, changeSize, clear };
}

/* ---------- Til ---------- */

export function useLang() {
  const [lang, setLangState] = useState(() => read(LANG_KEY, null));

  const setLang = useCallback((value) => {
    const next = value === 'ru' ? 'ru' : 'uz';
    setLangState(next);
    write(LANG_KEY, next);
  }, []);

  return [lang, setLang];
}

/* ---------- Onboarding ---------- */

export const hasSeenIntro = () => read(INTRO_KEY, false) === true;
export const markIntroSeen = () => write(INTRO_KEY, true);
