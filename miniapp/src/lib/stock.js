/**
 * Ombor qoldig'i (serverdagi `services/stock.js` bilan bir xil qoida):
 *  - stockPacks — optom uchun komplektlar
 *  - stockPairs — dona savdo uchun razmer bo'yicha juftlar
 * null — hisoblanmaydi (cheklov yo'q).
 */

/** Qolgan komplektlar (null — cheksiz) */
export const packsLeft = (product) =>
  product?.stockPacks === null || product?.stockPacks === undefined
    ? null
    : Math.max(0, product.stockPacks);

/** Shu razmerdan qolgan juftlar (null — cheksiz) */
export const pairsLeft = (product, size) =>
  product?.stockPairs ? Math.max(0, Math.floor(Number(product.stockPairs[size]) || 0)) : null;

/** Tanlangan savdo turida umuman qolmaganmi */
export function soldOut(product, mode) {
  if (mode === 'wholesale') return packsLeft(product) === 0;
  if (!product?.stockPairs) return false;
  return (product.sizes || []).every((size) => pairsLeft(product, size) === 0);
}

/**
 * Savatchaning boshqa qatorlarida (shu modelning boshqa ranglari) band qilingan miqdor.
 * Optom — komplektlar soni, dona — { size: juftlar }.
 */
export function usedElsewhere(cartItems, productId, mode, exceptKey) {
  let packs = 0;
  const pairs = {};
  for (const item of cartItems) {
    if (item.key === exceptKey || item.productId !== productId || item.mode !== mode) continue;
    if (mode === 'wholesale') packs += Number(item.packs) || 0;
    else {
      for (const [size, n] of Object.entries(item.sizes || {})) {
        pairs[size] = (pairs[size] || 0) + Number(n);
      }
    }
  }
  return { packs, pairs };
}

/** Qatorga yana qancha qo'shish mumkin: komplekt uchun (Infinity — cheksiz) */
export function maxPacks(product, cartItems, exceptKey) {
  const left = packsLeft(product);
  if (left === null) return Infinity;
  return Math.max(0, left - usedElsewhere(cartItems, product.id, 'wholesale', exceptKey).packs);
}

/** Razmer uchun eng ko'p juft (Infinity — cheksiz) */
export function maxPairs(product, size, cartItems, exceptKey) {
  const left = pairsLeft(product, size);
  if (left === null) return Infinity;
  return Math.max(0, left - (usedElsewhere(cartItems, product.id, 'retail', exceptKey).pairs[size] || 0));
}
