import { useCallback, useEffect, useMemo, useState } from 'react';

const CART_KEY = 'asf_cart_v2';
const CART_KEY_V1 = 'asf_cart_v1';
const MODE_KEY = 'asf_mode';
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

export const MAX_PACKS = 100;

/** Savatchadagi qator kaliti: optom va dona alohida saqlanadi */
export const cartKey = (mode, productId) => `${mode === 'wholesale' ? 'w' : 'r'}:${productId}`;

/** 1 komplekt = modeldagi har bir razmerdan bittadan */
export const packSizes = (product, packs) =>
  Object.fromEntries((product?.sizes || []).map((size) => [size, packs]));

/** Qatordagi juftlar soni (optom qatorida razmerlar mahsulotdan olinadi) */
export const itemQty = (item, product) =>
  item.mode === 'wholesale'
    ? item.packs * (product?.sizes?.length || 0)
    : Object.values(item.sizes || {}).reduce((sum, n) => sum + Number(n || 0), 0);

const clampPacks = (value) => Math.min(MAX_PACKS, Math.max(0, Math.floor(Number(value) || 0)));

/** Eski (v1) savatcha — faqat donaga edi */
function readCart() {
  const current = read(CART_KEY, null);
  if (current) return current;
  const legacy = read(CART_KEY_V1, {});
  const next = {};
  for (const item of Object.values(legacy)) {
    if (item?.productId && item.sizes) {
      next[cartKey('retail', item.productId)] = {
        productId: Number(item.productId),
        mode: 'retail',
        sizes: item.sizes,
      };
    }
  }
  return next;
}

/**
 * Savatcha ko'rinishi:
 * { "w:12": { productId: 12, mode: "wholesale", packs: 3 },
 *   "r:12": { productId: 12, mode: "retail", sizes: { "40": 2, "41": 1 } } }
 */
export function useCart() {
  const [cart, setCart] = useState(readCart);

  useEffect(() => write(CART_KEY, cart), [cart]);

  /** Dona: razmerlar bo'yicha */
  const addItem = useCallback((productId, sizes) => {
    const clean = {};
    for (const [size, qty] of Object.entries(sizes || {})) {
      const n = Math.floor(Number(qty));
      if (n > 0) clean[size] = n;
    }
    const key = cartKey('retail', productId);
    setCart((prev) => {
      const next = { ...prev };
      if (Object.keys(clean).length === 0) delete next[key];
      else next[key] = { productId: Number(productId), mode: 'retail', sizes: clean };
      return next;
    });
  }, []);

  /** Optom: komplekt soni (0 — o'chirish) */
  const setPacks = useCallback((productId, packs) => {
    const n = clampPacks(packs);
    const key = cartKey('wholesale', productId);
    setCart((prev) => {
      const next = { ...prev };
      if (n === 0) delete next[key];
      else next[key] = { productId: Number(productId), mode: 'wholesale', packs: n };
      return next;
    });
  }, []);

  const changePacks = useCallback((productId, delta) => {
    const key = cartKey('wholesale', productId);
    setCart((prev) => {
      const item = prev[key];
      if (!item) return prev;
      const n = clampPacks(item.packs + delta);
      const next = { ...prev };
      if (n === 0) delete next[key];
      else next[key] = { ...item, packs: n };
      return next;
    });
  }, []);

  const removeItem = useCallback((key) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const changeSize = useCallback((productId, size, delta) => {
    const key = cartKey('retail', productId);
    setCart((prev) => {
      const item = prev[key];
      if (!item) return prev;
      const current = Number(item.sizes[size] || 0);
      const nextQty = Math.max(0, current + delta);

      const sizes = { ...item.sizes };
      if (nextQty === 0) delete sizes[size];
      else sizes[size] = nextQty;

      const next = { ...prev };
      if (Object.keys(sizes).length === 0) delete next[key];
      else next[key] = { ...item, sizes };
      return next;
    });
  }, []);

  const clear = useCallback(() => setCart({}), []);

  // useMemo muhim: `items` identifikatori o'zgarmasa, Savatcha sahifasi
  // narxni qayta-qayta so'ramaydi (cheksiz sikl oldini oladi)
  const items = useMemo(
    () => Object.entries(cart).map(([key, item]) => ({ ...item, key })),
    [cart]
  );

  // Pastki menyudagi belgi: optom qatori — komplekt, dona qatori — juft
  const count = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          (item.mode === 'wholesale'
            ? item.packs
            : Object.values(item.sizes).reduce((a, b) => a + Number(b), 0)),
        0
      ),
    [items]
  );

  return { cart, items, count, addItem, setPacks, changePacks, removeItem, changeSize, clear };
}

/* ---------- Savdo turi (optom / dona) ---------- */

export function useMode() {
  const [mode, setModeState] = useState(() => read(MODE_KEY, null));

  const setMode = useCallback((value) => {
    const next = value === 'retail' ? 'retail' : 'wholesale';
    setModeState(next);
    write(MODE_KEY, next);
  }, []);

  return [mode, setMode];
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
