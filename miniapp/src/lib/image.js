import { imageUrl } from './api';

/**
 * Telefondan olingan katta rasmni yuklashdan oldin kichraytiradi (JPEG, max 1600px).
 * Chekdagi yozuvlar o'qiladigan darajada qoladi, yuklash esa tezlashadi.
 * Kichraytirib bo'lmasa — asl fayl qaytariladi.
 */
export async function compressImage(file, maxSide = 1600, quality = 0.85) {
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    URL.revokeObjectURL(url);

    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) return file;
    return new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
  } catch (_) {
    return file;
  }
}

/**
 * <img onError={retryImage}> — rasm yuklanmay qolsa qayta so'raydi.
 * Render'ning bepul serveri uxlab qolgan bo'lsa, uyg'onishi 30-60 soniya oladi —
 * ilova esa katalogni keshdan darhol ko'rsatadi. Shuning uchun ~1 daqiqa davomida
 * oraliqni uzaytirib urinamiz, kartochkada "?" belgisi qolib ketmaydi.
 */
const RETRY_DELAYS = [1500, 3000, 6000, 10000, 15000, 25000];

function bustedSrc(img, n) {
  const src = img.src.replace(/([?&])r=\d+&?/, '$1').replace(/[?&]$/, '');
  return `${src}${src.includes('?') ? '&' : '?'}r=${n}`;
}

export function retryImage(e) {
  const img = e.currentTarget;
  const tries = Number(img.dataset.retry || 0);
  if (tries >= RETRY_DELAYS.length || !img.src || img.src.startsWith('blob:')) return;
  img.dataset.retry = String(tries + 1);
  clearTimeout(img._retryTimer);
  img._retryTimer = setTimeout(() => {
    if (img.isConnected) img.src = bustedSrc(img, tries + 1);
  }, RETRY_DELAYS[tries]);
}

/**
 * Server javob bera boshlaganda (katalog yangilangach) chaqiriladi:
 * yuklanmay qolgan rasmlarni kutib o'tirmay darhol qayta so'raydi.
 */
export function reloadBrokenImages() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('img').forEach((img) => {
    const broken = img.complete && img.naturalWidth === 0 && img.src && !img.src.startsWith('blob:');
    if (!broken) return;
    clearTimeout(img._retryTimer);
    img.dataset.retry = '0';
    img.src = bustedSrc(img, Date.now() % 100000);
  });
}

/* ----------------------------------------------------------
   Ilova ochilishi bilan (onboarding / tanlov ekrani ko'rinib
   turganda) rasmlar fonda yuklab olinadi. Bosh sahifa va katalog
   ochilganda ular brauzer keshidan darhol chiqadi.
   URL'lar komponentlardagi bilan bir xil bo'lishi shart (eni ham).
   ---------------------------------------------------------- */
const preloaded = new Set();
const preloadRefs = [];

function preload(src) {
  if (!src || preloaded.has(src)) return;
  preloaded.add(src);
  const img = new Image();
  img.decoding = 'async';
  // Server uxlab yotgan bo'lsa — keyingi chaqiruvda (yangi katalog kelganda) qayta urinamiz
  img.onerror = () => preloaded.delete(src);
  img.src = src;
  // GC rasmni yuklanish tugamasdan tashlab yubormasin
  preloadRefs.push(img);
}

export function preloadImages({ products = [], stories = [] } = {}) {
  const withImg = products.filter((p) => p.images?.length);
  // Avval birinchi ko'rinadiganlar: tanlov kartochkalari, storylar, birinchi kartochkalar
  withImg.slice(0, 4).forEach((p) => preload(imageUrl(p.images[0], 320)));
  stories.forEach((s) => preload(imageUrl(s.image, 320)));
  withImg.forEach((p) => preload(imageUrl(p.images[0], 480)));
  withImg.forEach((p) => preload(imageUrl(p.images[0], 320)));
}
