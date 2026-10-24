import { useEffect } from 'react';

/**
 * Oyna (mahsulot, buyurtma) ochiq paytda orqadagi sahifa surilmasin.
 * iPhone'da body'ga `overflow: hidden` yetmaydi — body joyida "qotiriladi",
 * oyna yopilgach sahifa o'sha joyiga qaytadi.
 */

let locks = 0;
let savedY = 0;

function lock() {
  locks += 1;
  if (locks > 1) return;
  savedY = window.scrollY;
  const { style } = document.body;
  style.position = 'fixed';
  style.top = `-${savedY}px`;
  style.left = '0';
  style.right = '0';
  style.overflow = 'hidden';
}

function unlock() {
  if (locks === 0) return;
  locks -= 1;
  if (locks > 0) return;
  const { style } = document.body;
  style.position = '';
  style.top = '';
  style.left = '';
  style.right = '';
  style.overflow = '';
  window.scrollTo(0, savedY);
}

/** Komponent ekranda turgan paytda orqa sahifani qotiradi */
export function useScrollLock() {
  useEffect(() => {
    lock();
    return unlock;
  }, []);
}
