const config = require('../config/default');
const UserModel = require('../models/User');
const ProductModel = require('../models/Product');
const OrderModel = require('../models/Order');
const StoryModel = require('../models/Story');
const { safeSend, notifyAdmins } = require('../core/bot');
const { t, adminNewOrder } = require('../utils/i18n');

/* ---------- Yordamchi funksiyalar ---------- */

/** Savatcha qatorlarini bazadagi haqiqiy narxlar bilan qayta hisoblaydi */
function buildOrderItems(cartItems, products, totalQty) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const items = [];
  let total = 0;
  let isWholesale = false;

  for (const raw of cartItems) {
    const product = byId.get(Number(raw.productId));
    if (!product || !product.isActive) continue;

    // Razmerlar: { "40": 2, "41": 3 } — faqat mahsulotda mavjud razmerlar
    const sizes = {};
    let qty = 0;
    for (const [size, count] of Object.entries(raw.sizes || {})) {
      const s = Number(size);
      const c = Math.floor(Number(count));
      if (!product.sizes.includes(s) || !Number.isFinite(c) || c <= 0) continue;
      sizes[s] = c;
      qty += c;
    }
    if (qty === 0) continue;

    // Optom narx: buyurtmadagi umumiy juft soni shu mahsulot minimumidan oshsa
    const wholesale = totalQty >= product.wholesaleMin && product.wholesalePrice < product.price;
    const unitPrice = wholesale ? product.wholesalePrice : product.price;
    if (wholesale) isWholesale = true;

    const lineTotal = unitPrice * qty;
    total += lineTotal;

    items.push({
      productId: product.id,
      article: product.article,
      name: product.name,
      nameRu: product.nameRu,
      image: product.images[0] || null,
      category: product.category,
      unitPrice,
      basePrice: product.price,
      wholesaleApplied: wholesale,
      sizes,
      qty,
      lineTotal,
    });
  }

  return { items, total, isWholesale };
}

/** Savatchadagi umumiy juft sonini sanaydi */
function countTotalQty(cartItems) {
  let total = 0;
  for (const raw of cartItems || []) {
    for (const count of Object.values(raw.sizes || {})) {
      const c = Math.floor(Number(count));
      if (Number.isFinite(c) && c > 0) total += c;
    }
  }
  return total;
}

/* ---------- Controllerlar ---------- */

const cartController = {
  /** Ilova sozlamalari: kategoriyalar, viloyatlar, razmerlar */
  getConfig(_req, res) {
    res.json({
      ok: true,
      data: {
        company: config.company,
        categories: config.categories,
        tags: config.tags,
        regions: config.regions,
        sizes: config.sizes,
        botUsername: config.bot.username || process.env.BOT_USERNAME || '',
      },
    });
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

      const products = await ProductModel.findManyByIds(cartItems.map((i) => i.productId));
      const totalQty = countTotalQty(cartItems);
      const result = buildOrderItems(cartItems, products, totalQty);

      res.json({ ok: true, data: { ...result, totalQty } });
    } catch (err) {
      next(err);
    }
  },

  /** Buyurtma berish */
  async createOrder(req, res, next) {
    try {
      const { items: cartItems, customerName, phone, region, address, comment } = req.body || {};

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

      const products = await ProductModel.findManyByIds(cartItems.map((i) => i.productId));
      const totalQty = countTotalQty(cartItems);
      const { items, total, isWholesale } = buildOrderItems(cartItems, products, totalQty);

      if (!items.length) {
        return res.status(400).json({ ok: false, message: 'Savatchadagi mahsulotlar topilmadi' });
      }

      const realQty = items.reduce((sum, i) => sum + i.qty, 0);
      const user = await UserModel.findOrCreate(req.tgUser);

      const order = await OrderModel.create({
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
      });

      // Telefon raqamini profilga saqlab qo'yamiz
      if (!user.phone) {
        UserModel.update(user.telegramId, { phone: phone.trim() }).catch(() => {});
      }

      // Botdan mijozga tasdiq xabari
      const lang = t(user.lang);
      safeSend(user.telegramId, lang.orderOk(order));

      // Egasi/menejerlarga yangi buyurtma haqida xabar
      notifyAdmins(adminNewOrder(order), { disable_web_page_preview: true });

      res.status(201).json({ ok: true, data: order });
    } catch (err) {
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
