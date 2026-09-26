const { Prisma } = require('@prisma/client');
const { prisma } = require('../database/connection');

/**
 * Ombor — ikki alohida zaxira:
 *  - stockPacks: optom uchun komplektlar soni
 *  - stockPairs: dona savdo uchun razmer bo'yicha juftlar { "40": 12 }
 * null — shu zaxira hisoblanmaydi (cheklov yo'q).
 */

const TX_OPTIONS = { timeout: 15000 };

/** Qolgan komplektlar (null — hisoblanmaydi) */
const packsLeft = (product) =>
  product.stockPacks === null || product.stockPacks === undefined
    ? null
    : Math.max(0, product.stockPacks);

/** Razmer bo'yicha juftlar xaritasi (null — hisoblanmaydi) */
const pairsMap = (product) => {
  const map = product.stockPairs;
  return map && typeof map === 'object' && !Array.isArray(map) ? map : null;
};

/** Shu razmerdan qolgan juftlar (null — hisoblanmaydi) */
const pairsLeft = (product, size) => {
  const map = pairsMap(product);
  return map ? Math.max(0, Math.floor(Number(map[size]) || 0)) : null;
};

/** Admin paneldan kelgan qiymatni tozalaydi: bo'sh — null, aks holda 0 dan katta butun son */
const cleanCount = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Math.floor(Number(String(value).replace(/\s/g, '')));
  return Number.isFinite(n) ? Math.max(0, Math.min(n, 1000000)) : null;
};

/** { "40": "12", "41": "" } -> { "40": 12 } faqat mahsulot razmerlari bo'yicha; hammasi bo'sh — null */
function cleanPairs(raw, sizes) {
  if (!raw || typeof raw !== 'object') return null;
  const map = {};
  let any = false;
  for (const size of sizes) {
    const n = cleanCount(raw[size]);
    if (n !== null) any = true;
    map[size] = n || 0;
  }
  return any ? map : null;
}

class StockError extends Error {
  constructor(shortages) {
    super('Omborda yetarli emas');
    this.shortages = shortages;
  }
}

/** Buyurtma qatorlaridan kerakli miqdor: Map(productId -> { packs, pairs: { size: n } }) */
function demand(items) {
  const need = new Map();
  for (const item of items) {
    const entry = need.get(item.productId) || { packs: 0, pairs: {} };
    if (item.mode === 'wholesale') entry.packs += item.packs || 0;
    else {
      for (const [size, count] of Object.entries(item.sizes || {})) {
        entry.pairs[size] = (entry.pairs[size] || 0) + Number(count);
      }
    }
    need.set(item.productId, entry);
  }
  return need;
}

/** Mahsulot qatorlarini tranzaksiya tugaguncha qulflaydi (bir vaqtda ikki buyurtma bo'lsa ham to'g'ri) */
async function lockProducts(tx, ids) {
  if (!ids.length) return [];
  await tx.$queryRaw`SELECT id FROM "products" WHERE id IN (${Prisma.join(ids)}) FOR UPDATE`;
  return tx.product.findMany({ where: { id: { in: ids } } });
}

/**
 * Buyurtma qatorlaridagi miqdorni omborga qaytaradi (sign = 1)
 * yoki ombordan ayiradi (sign = -1). Faqat `stockTaken` belgili qatorlar.
 */
async function moveStock(tx, items, sign) {
  const taken = (items || []).filter((i) => i.stockTaken);
  if (!taken.length) return;
  const need = demand(taken);
  const products = await lockProducts(tx, [...need.keys()]);

  for (const product of products) {
    const n = need.get(product.id);
    const data = {};
    const packs = packsLeft(product);
    if (n.packs && packs !== null) data.stockPacks = Math.max(0, packs + sign * n.packs);

    const map = pairsMap(product);
    if (map && Object.keys(n.pairs).length) {
      const next = { ...map };
      for (const [size, count] of Object.entries(n.pairs)) {
        next[size] = Math.max(0, pairsLeft(product, size) + sign * count);
      }
      data.stockPairs = next;
    }
    if (Object.keys(data).length) await tx.product.update({ where: { id: product.id }, data });
  }
}

/**
 * Buyurtmani saqlaydi va miqdorni ombordan ayiradi — hammasi bitta tranzaksiyada.
 * Omborda yetmasa StockError (shortages: [{ article, name, nameRu, size?, left }]).
 */
function createOrderWithStock(orderData) {
  return prisma.$transaction(async (tx) => {
    const need = demand(orderData.items);
    const products = await lockProducts(tx, [...need.keys()]);
    const byId = new Map(products.map((p) => [p.id, p]));

    const shortages = [];
    for (const [id, n] of need) {
      const product = byId.get(id);
      if (!product) continue;
      const base = { article: product.article, name: product.name, nameRu: product.nameRu };
      const packs = packsLeft(product);
      if (n.packs && packs !== null && n.packs > packs) shortages.push({ ...base, left: packs });
      if (pairsMap(product)) {
        for (const [size, count] of Object.entries(n.pairs)) {
          const left = pairsLeft(product, size);
          if (count > left) shortages.push({ ...base, size: Number(size), left });
        }
      }
    }
    if (shortages.length) throw new StockError(shortages);

    // Qaysi qator ombordan ayirilganini belgilaymiz — bekor qilinsa aynan shu qaytariladi
    const items = orderData.items.map((item) => {
      const product = byId.get(item.productId);
      const tracked =
        product &&
        (item.mode === 'wholesale' ? packsLeft(product) !== null : pairsMap(product) !== null);
      return tracked ? { ...item, stockTaken: true } : item;
    });

    await moveStock(tx, items, -1);
    return tx.order.create({ data: { ...orderData, items }, include: { user: true } });
  }, TX_OPTIONS);
}

/** Buyurtma holatini o'zgartiradi: bekor qilinsa — omborga qaytadi, qayta tiklansa — yana ayiriladi */
function changeOrderStatus(id, status) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "orders" WHERE id = ${Number(id)} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: Number(id) } });
    if (!order) return null;

    const wasCancelled = order.status === 'cancelled';
    const nowCancelled = status === 'cancelled';
    if (wasCancelled !== nowCancelled) await moveStock(tx, order.items, nowCancelled ? 1 : -1);

    return tx.order.update({ where: { id: order.id }, data: { status }, include: { user: true } });
  }, TX_OPTIONS);
}

/** Hali yetkazilmagan (yangi / tasdiqlangan) buyurtma o'chirilsa — tovar omborga qaytadi */
const isOpen = (order) => order.status === 'new' || order.status === 'confirmed';

function removeOrderWithStock(id) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: Number(id) } });
    if (!order) return null;
    if (isOpen(order)) await moveStock(tx, order.items, 1);
    return tx.order.delete({ where: { id: order.id } });
  }, TX_OPTIONS);
}

/** Barcha ochiq buyurtmalardagi tovarni omborga qaytaradi (buyurtmalarni tozalashdan oldin) */
function restoreOpenOrders() {
  return prisma.$transaction(async (tx) => {
    const orders = await tx.order.findMany({
      where: { status: { in: ['new', 'confirmed'] } },
      select: { items: true, status: true },
    });
    await moveStock(tx, orders.flatMap((o) => o.items || []), 1);
  }, TX_OPTIONS);
}

module.exports = {
  packsLeft,
  pairsLeft,
  pairsMap,
  cleanCount,
  cleanPairs,
  StockError,
  createOrderWithStock,
  changeOrderStatus,
  removeOrderWithStock,
  restoreOpenOrders,
};
