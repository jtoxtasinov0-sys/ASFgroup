const config = require('../config/default');
const UserModel = require('../models/User');
const ProductModel = require('../models/Product');
const OrderModel = require('../models/Order');
const StoryModel = require('../models/Story');
const { safeSend, notifyAdmins } = require('../core/bot');
const { t, adminNewOrder } = require('../utils/i18n');
const { productColors } = require('../utils/colors');
const { fileUrl, removeFile } = require('../utils/upload');
const { getPublicPayment, attachReceipt } = require('../services/payment');
const { StockError, createOrderWithStock } = require('../services/stock');

/* ---------- Yordamchi funksiyalar ---------- */

const MAX_PACKS = 100;

/** Optom narx faqat u haqiqatan arzonroq bo'lsa */
const wholesaleUnit = (product) =>
  product.wholesalePrice > 0 && product.wholesalePrice < product.price
    ? product.wholesalePrice
    : product.price;


/** Tanlangan rangdagi birinchi rasm (bo'lmasa — asosiy rasm) */
const colorImage = (product, color) =>
  (color && product.images.find((url) => product.imageColors?.[url] === color)) ||
  product.images[0] ||
  null;

/** Click to'lov sahifasi manzili (sozlanmagan bo'lsa null) */
function clickPayUrl(order) {
  const { serviceId, merchantId } = config.click;
  if (!serviceId || !merchantId) return null;
  const params = new URLSearchParams({
    service_id: serviceId,
    merchant_id: merchantId,
    amount: String(order.total),
    transaction_param: String(order.id),
  });
  return `https://my.click.uz/services/pay?${params}`;
}

/**
 * Savatcha qatorlarini bazadagi haqiqiy narxlar bilan qayta hisoblaydi.
 *  - Optom: { productId, packs } — 1 komplekt = har bir razmerdan 1 juft, optom narxda
 *  - Dona:  { productId, sizes: { "40": 2 } } — dona narxda
 */
function buildOrderItems(cartItems, products) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const items = [];
  let total = 0;
  let isWholesale = false;

  for (const raw of cartItems) {
    const product = byId.get(Number(raw.productId));
    if (!product || !product.isActive) continue;

    const sizes = {};
    let qty = 0;
    let packs = 0;

    if (raw.packs !== undefined && raw.packs !== null) {
      packs = Math.min(MAX_PACKS, Math.floor(Number(raw.packs)));
      if (!Number.isFinite(packs) || packs <= 0 || !product.sizes.length) continue;
      for (const s of product.sizes) sizes[s] = packs;
      qty = packs * product.sizes.length;
    } else {
      // Razmerlar: faqat mahsulotda mavjud razmerlar
      for (const [size, count] of Object.entries(raw.sizes || {})) {
        const s = Number(size);
        const c = Math.floor(Number(count));
        if (!product.sizes.includes(s) || !Number.isFinite(c) || c <= 0) continue;
        sizes[s] = c;
        qty += c;
      }
      if (qty === 0) continue;
    }

    // Rang — faqat shu mahsulotda bor ranglardan
    const colors = productColors(product);
    const color = colors.includes(raw.color) ? raw.color : colors.length ? colors[0] : null;

    const wholesale = packs > 0;
    const unitPrice = wholesale ? wholesaleUnit(product) : product.price;
    if (wholesale) isWholesale = true;

    const lineTotal = unitPrice * qty;
    total += lineTotal;

    items.push({
      productId: product.id,
      article: product.article,
      name: product.name,
      nameRu: product.nameRu,
      image: colorImage(product, color),
      ...(color ? { color } : {}),
      category: product.category,
      mode: wholesale ? 'wholesale' : 'retail',
      ...(wholesale ? { packs } : {}),
      unitPrice,
      basePrice: product.price,
      wholesaleApplied: wholesale && unitPrice < product.price,
      sizes,
      qty,
      lineTotal,
    });
  }

  const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
  return { items, total, totalQty, isWholesale };
}

async function priceCart(cartItems) {
  const products = await ProductModel.findManyByIds(cartItems.map((i) => i.productId));
  return buildOrderItems(cartItems, products);
}

/** Omborda yetmagan mahsulotlar haqida mijoz tilida xabar */
function shortageMessage(shortages, lang) {
  const ru = lang === 'ru';
  const lines = shortages.map((s) => {
    const name = `${(ru && s.nameRu) || s.name} (${s.article})`;
    if (s.size) {
      return ru
        ? `${name}, размер ${s.size}: осталось ${s.left} пар`
        : `${name}, ${s.size}-razmer: ${s.left} juft qoldi`;
    }
    return ru ? `${name}: осталось ${s.left} компл.` : `${name}: ${s.left} komplekt qoldi`;
  });
  const head = ru ? 'На складе недостаточно товара:' : 'Omborda yetarli emas:';
  const tail = ru ? 'Уменьшите количество в корзине.' : 'Savatchadagi sonni kamaytiring.';
  return `${head}\n${lines.join('\n')}\n${tail}`;
}

/* ---------- Controllerlar ---------- */

const cartController = {
  /** Ilova sozlamalari: kategoriyalar, viloyatlar, razmerlar */
  async getConfig(_req, res, next) {
    try {
      res.json({
        ok: true,
        data: {
          company: config.company,
          categories: config.categories,
          tags: config.tags,
          regions: config.regions,
          sizes: config.sizes,
          colors: config.colors,
          clickEnabled: Boolean(config.click.serviceId && config.click.merchantId),
          botUsername: config.bot.username || process.env.BOT_USERNAME || '',
          payment: await getPublicPayment(),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /** Foydalanuvchini ro'yxatdan o'tkazadi / profilini qaytaradi */
  async me(req, res, next) {
    try {
      const user = await UserModel.findOrCreate(req.tgUser);
      res.json({ ok: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  /** Profilni yangilash: telefon, til, onboarding ko'rilgani */
  async updateProfile(req, res, next) {
    try {
      const { phone, lang, seenIntro } = req.body || {};
      const data = {};
      if (typeof phone === 'string' && phone.trim()) data.phone = phone.trim();
      if (lang === 'uz' || lang === 'ru') data.lang = lang;
      if (typeof seenIntro === 'boolean') data.seenIntro = seenIntro;

      await UserModel.findOrCreate(req.tgUser);
      const user = await UserModel.update(req.tgUser.id, data);
      res.json({ ok: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  /** Katalog */
  async getProducts(req, res, next) {
    try {
      const { category, tag, search } = req.query;
      const products = await ProductModel.findPublic({ category, tag, search });
      res.json({ ok: true, data: products });
    } catch (err) {
      next(err);
    }
  },

  async getProduct(req, res, next) {
    try {
      const product = await ProductModel.findById(req.params.id);
      if (!product || !product.isActive) {
        return res.status(404).json({ ok: false, message: 'Mahsulot topilmadi' });
      }
      res.json({ ok: true, data: product });
    } catch (err) {
      next(err);
    }
  },

  /** Storylar */
  async getStories(_req, res, next) {
    try {
      const stories = await StoryModel.findPublic();
      res.json({ ok: true, data: stories });
    } catch (err) {
      next(err);
    }
  },

  /** Savatchani serverda hisoblash (narxlar faqat bazadan olinadi) */
  async calculate(req, res, next) {
    try {
      const cartItems = Array.isArray(req.body?.items) ? req.body.items : [];
      if (!cartItems.length) {
        return res.json({
          ok: true,
          data: { items: [], total: 0, totalQty: 0, isWholesale: false },
        });
      }

      const result = await priceCart(cartItems);
      res.json({ ok: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  /** Buyurtma berish */
  async createOrder(req, res, next) {
    try {
      const { items: cartItems, customerName, phone, region, address, comment } = req.body || {};
      // Kartaga o'tkazma faqat admin karta kiritgan bo'lsa
      const payment = await getPublicPayment();
      const asked = req.body?.paymentMethod;
      // Click bilan shartnoma (merchant) bo'lmasa — Click orqali ham shu kartaga
      // o'tkaziladi, shuning uchun chek yuborish jarayoni ishlasin
      const clickDirect = Boolean(config.click.serviceId && config.click.merchantId);
      let paymentMethod = 'cash';
      if (asked === 'click') paymentMethod = !clickDirect && payment.enabled ? 'card' : 'click';
      if (asked === 'card' && payment.enabled) paymentMethod = 'card';

      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({ ok: false, message: 'Savatcha bosh' });
      }
      if (!customerName || !customerName.trim()) {
        return res.status(400).json({ ok: false, message: 'Ismingizni kiriting' });
      }
      if (!phone || !phone.trim()) {
        return res.status(400).json({ ok: false, message: 'Telefon raqamingizni kiriting' });
      }
      if (!region || !region.trim()) {
        return res.status(400).json({ ok: false, message: 'Viloyatni tanlang' });
      }
      if (!address || !address.trim()) {
        return res.status(400).json({ ok: false, message: 'Manzilni kiriting' });
      }

      // Yetkazib berish faqat O'zbekiston hududida
      if (!config.regions.some((r) => r.uz === region || r.ru === region)) {
        return res.status(400).json({
          ok: false,
          message: 'Yetkazib berish faqat Ozbekiston hududida amalga oshiriladi',
        });
      }

      const { items, total, totalQty: realQty, isWholesale } = await priceCart(cartItems);

      if (!items.length) {
        return res.status(400).json({ ok: false, message: 'Savatchadagi mahsulotlar topilmadi' });
      }

      const user = await UserModel.findOrCreate(req.tgUser);

      // Ombordan ayirish va buyurtmani saqlash — bitta tranzaksiyada
      let order;
      try {
        order = await createOrderWithStock({
          userId: user.id,
          items,
          total,
          totalQty: realQty,
          isWholesale,
          customerName: customerName.trim(),
          phone: phone.trim(),
          region: region.trim(),
          address: address.trim(),
          comment: comment && comment.trim() ? comment.trim() : null,
          paymentMethod,
        });
      } catch (err) {
        if (!(err instanceof StockError)) throw err;
        return res.status(409).json({
          ok: false,
          code: 'OUT_OF_STOCK',
          message: shortageMessage(err.shortages, user.lang),
        });
      }

      // Telefon raqamini profilga saqlab qo'yamiz
      if (!user.phone) {
        UserModel.update(user.telegramId, { phone: phone.trim() }).catch(() => {});
      }

      // Botdan mijozga tasdiq xabari
      const lang = t(user.lang);
      // Kartaga o'tkazmada — karta raqami va to'lanadigan summa ham yoziladi
      safeSend(user.telegramId, lang.orderOk(order, paymentMethod === 'card' ? payment : null));

      // Egasi/menejerlarga yangi buyurtma haqida xabar
      notifyAdmins(adminNewOrder(order), { disable_web_page_preview: true });

      const payUrl = paymentMethod === 'click' ? clickPayUrl(order) : null;
      res.status(201).json({
        ok: true,
        data: { ...order, payUrl, payment: paymentMethod === 'card' ? payment : undefined },
      });
    } catch (err) {
      next(err);
    }
  },

  /** Kartaga o'tkazma chekini yuklash (Mini App'dan) */
  async uploadReceipt(req, res, next) {
    const url = req.file ? fileUrl('receipts', req.file.filename) : null;
    try {
      if (!url) return res.status(400).json({ ok: false, message: 'Chek rasmini tanlang' });

      const order = await OrderModel.findById(req.params.id);
      if (!order || order.user?.telegramId !== String(req.tgUser.id)) {
        removeFile(url);
        return res.status(404).json({ ok: false, message: 'Buyurtma topilmadi' });
      }
      if (order.paymentStatus === 'paid') {
        removeFile(url);
        return res.status(400).json({ ok: false, message: "Bu buyurtma allaqachon to'langan" });
      }

      const updated = await attachReceipt(order, url, { filePath: req.file.path });
      res.json({
        ok: true,
        data: { id: updated.id, paymentStatus: updated.paymentStatus, receiptUrl: updated.receiptUrl },
      });
    } catch (err) {
      removeFile(url);
      next(err);
    }
  },

  /** Mening buyurtmalarim */
  async myOrders(req, res, next) {
    try {
      const orders = await OrderModel.findByTelegramId(req.tgUser.id);
      res.json({ ok: true, data: orders });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = cartController;
