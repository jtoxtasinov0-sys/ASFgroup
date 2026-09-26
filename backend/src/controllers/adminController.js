const { Prisma } = require('@prisma/client');
const config = require('../config/default');
const ProductModel = require('../models/Product');
const OrderModel = require('../models/Order');
const StoryModel = require('../models/Story');
const UserModel = require('../models/User');
const { signAdminToken, verifyInitData } = require('../middlewares/auth.middleware');
const { fileUrl, removeFile } = require('../utils/upload');
const { safeSend } = require('../core/bot');
const { startBroadcast, broadcastStatus } = require('../core/broadcast');
const { t } = require('../utils/i18n');
const { samePassword } = require('../utils/password');
const { cleanColor } = require('../utils/colors');
const SettingModel = require('../models/Setting');
const {
  cleanCount,
  cleanPairs,
  changeOrderStatus,
  removeOrderWithStock,
  restoreOpenOrders,
} = require('../services/stock');
const {
  CARD_TYPES,
  onlyDigits,
  getPaymentSettings,
  setPaymentStatus,
} = require('../services/payment');

/* ---------- Yordamchi ---------- */

/** Sozlamalar sahifasi uchun: karta + donaga savdo holati */
async function adminSettings() {
  const [payment, retailEnabled] = await Promise.all([
    getPaymentSettings(),
    SettingModel.isRetailEnabled(),
  ]);
  return { ...payment, retailEnabled };
}

const toInt = (v, fallback = 0) => {
  const raw = String(v ?? '').replace(/\s/g, '');
  if (raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : fallback;
};


const toBool = (v, fallback = true) => {
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v === 'boolean') return v;
  return v === 'true' || v === '1' || v === 1;
};

/** Formdan kelgan ro'yxatni massivga aylantiradi (JSON matn yoki massiv) */
const toArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return v.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
};

const clampNum = (v, min, max, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n * 1000) / 1000)) : fallback;
};

/**
 * Bitta rasm ko'rinishi: r — eni/bo'yi nisbati, z — kattalik (1 = ramkani to'ldiradi),
 * x/y — ko'rinadigan qism (%). Sozlanmagan bo'lsa null.
 */
const toFrame = (raw) => {
  if (!raw || typeof raw !== 'object' || !Number(raw.r)) return null;
  return {
    r: clampNum(raw.r, 0.05, 20, 1),
    z: clampNum(raw.z, 1, 10, 1),
    x: clampNum(raw.x, 0, 100, 50),
    y: clampNum(raw.y, 0, 100, 50),
  };
};

/**
 * Rasm ko'rinishlari xaritasi { url: frame }.
 * `imageFrames` — [...saqlangan rasmlar, ...yangi fayllar] tartibidagi ro'yxat.
 * Eski admin panel yubormasa, saqlangan rasmlarning avvalgi sozlamasi qoladi.
 */
function buildFrames(body, keepImages, uploadedUrls, existing) {
  const oldFrames = (existing && existing.imageFrames) || {};
  const frames = {};

  if (body.imageFrames === undefined) {
    keepImages.forEach((url) => {
      if (oldFrames[url]) frames[url] = oldFrames[url];
    });
    return frames;
  }

  const list = toArray(body.imageFrames);
  [...keepImages, ...uploadedUrls].forEach((url, i) => {
    const frame = toFrame(list[i]);
    if (frame) frames[url] = frame;
  });
  return frames;
}

/**
 * Rasm ranglari xaritasi { url: "black" | "Qizil#c62828" }. `imageColors` — [...saqlangan, ...yangi] tartibida.
 * Eski admin panel yubormasa, saqlangan rasmlarning avvalgi rangi qoladi.
 */
function buildColors(body, keepImages, uploadedUrls, existing) {
  const colors = {};

  if (body.imageColors === undefined) {
    const old = (existing && existing.imageColors) || {};
    keepImages.forEach((url) => {
      const c = cleanColor(old[url]);
      if (c) colors[url] = c;
    });
    return colors;
  }

  const list = toArray(body.imageColors);
  [...keepImages, ...uploadedUrls].forEach((url, i) => {
    const c = cleanColor(list[i]);
    if (c) colors[url] = c;
  });
  return colors;
}

/** Mahsulot maydonlarini forma ma'lumotidan yig'adi */
function buildProductData(body, uploadedUrls, existing) {
  const keepImages = toArray(body.images).filter((u) => typeof u === 'string');
  const images = [...keepImages, ...uploadedUrls];
  const imageFrames = buildFrames(body, keepImages, uploadedUrls, existing);
  const imageColors = buildColors(body, keepImages, uploadedUrls, existing);

  const price = toInt(body.price, existing ? existing.price : 0);
  const wholesaleRaw = toInt(body.wholesalePrice, 0);

  const data = {
    article: String(body.article || '').trim(),
    name: String(body.name || '').trim(),
    nameRu: body.nameRu ? String(body.nameRu).trim() : null,
    description: body.description ? String(body.description).trim() : null,
    descriptionRu: body.descriptionRu ? String(body.descriptionRu).trim() : null,
    category: body.category === 'upper' ? 'upper' : 'ready',
    tag: body.tag ? String(body.tag).trim() : null,
    color: body.color ? String(body.color).trim() : null,
    colorRu: body.colorRu ? String(body.colorRu).trim() : null,
    material: body.material ? String(body.material).trim() : null,
    materialRu: body.materialRu ? String(body.materialRu).trim() : null,
    images,
    imageFrames,
    imageColors,
    price,
    // Eski narx faqat hozirgi narxdan qimmat bo'lsa ma'noga ega (chegirma)
    oldPrice: toInt(body.oldPrice, 0) > price ? toInt(body.oldPrice, 0) : null,
    wholesalePrice: wholesaleRaw > 0 ? wholesaleRaw : price,
    wholesaleMin: Math.max(1, toInt(body.wholesaleMin, 10)),
    sizes: toArray(body.sizes).map((s) => toInt(s, 0)).filter((s) => s > 0),
    inStock: toBool(body.inStock, true),
    isActive: toBool(body.isActive, true),
    sortOrder: toInt(body.sortOrder, 0),
  };

  if (!data.sizes.length) data.sizes = config.sizes;
  return data;
}

/* ---------- Controller ---------- */

const adminController = {
  /* ===== Kirish ===== */
  /**
   * Kirish faqat parol bilan — login so'ralmaydi.
   * Parol yagona maxfiy ma'lumot bo'lgani uchun taqqoslash vaqt bo'yicha
   * bir xil davom etadi (parolni belgima-belgi topishning oldini oladi).
   */
  login(req, res) {
    const { password } = req.body || {};

    if (samePassword(password, config.admin.password)) {
      const { username } = config.admin;
      return res.json({ ok: true, data: { token: signAdminToken(username), username } });
    }
    return res.status(401).json({ ok: false, message: 'Parol notogri' });
  },

  /**
   * Telegram ichidan kirish: admin panel botdagi tugma orqali ochilganda
   * Telegram imzolagan initData keladi. Foydalanuvchi ADMIN_CHAT_IDS da bo'lsa,
   * parolsiz kiritamiz. Eski (1 kundan oshgan) initData qabul qilinmaydi.
   */
  async telegramLogin(req, res, next) {
    try {
      const initData = String(req.body?.initData || '');
      const user = verifyInitData(initData);
      const authDate = Number(new URLSearchParams(initData).get('auth_date')) || 0;
      const fresh = Date.now() / 1000 - authDate < 24 * 60 * 60;

      let allowed = Boolean(user && fresh && config.bot.adminChatIds.includes(String(user.id)));
      if (user && fresh && !allowed) {
        // Botda /admin PAROL orqali admin bo'lganlar
        const dbUser = await UserModel.findByTelegramId(user.id);
        allowed = Boolean(dbUser?.isAdmin);
      }

      if (!allowed) {
        return res.status(403).json({ ok: false, message: 'Telegram orqali kirish ruxsat etilmagan' });
      }
      const { username } = config.admin;
      return res.json({ ok: true, data: { token: signAdminToken(username), username } });
    } catch (err) {
      return next(err);
    }
  },

  me(req, res) {
    res.json({ ok: true, data: { username: req.admin.username } });
  },

  /* ===== Boshqaruv paneli ===== */
  async dashboard(_req, res, next) {
    try {
      const [orderStats, productCount, userCount] = await Promise.all([
        OrderModel.stats(),
        ProductModel.count(),
        UserModel.count(),
      ]);
      res.json({
        ok: true,
        data: { ...orderStats, productCount, userCount },
      });
    } catch (err) {
      next(err);
    }
  },

  /* ===== Buyurtmalar ===== */
  async listOrders(req, res, next) {
    try {
      const orders = await OrderModel.findAll({
        status: req.query.status,
        paymentStatus: req.query.payment,
      });
      res.json({ ok: true, data: orders });
    } catch (err) {
      next(err);
    }
  },

  async updateOrderStatus(req, res, next) {
    try {
      const allowed = ['new', 'confirmed', 'delivered', 'cancelled'];
      const { status } = req.body || {};
      if (!allowed.includes(status)) {
        return res.status(400).json({ ok: false, message: 'Notogri holat' });
      }

      // Bekor qilinsa — tovar omborga qaytadi, qayta tiklansa — yana ayiriladi
      const order = await changeOrderStatus(req.params.id, status);
      if (!order) return res.status(404).json({ ok: false, message: 'Topilmadi' });

      // Mijozga holat o'zgargani haqida xabar
      if (order.user) {
        const lang = t(order.user.lang);
        const label = lang.statuses[status] || status;
        safeSend(order.user.telegramId, lang.statusChanged(order, label));
      }

      res.json({ ok: true, data: order });
    } catch (err) {
      next(err);
    }
  },

  /** Kartaga o'tkazmani tasdiqlash / rad etish */
  async updatePaymentStatus(req, res, next) {
    try {
      const { paymentStatus } = req.body || {};
      if (!['paid', 'rejected', 'unpaid'].includes(paymentStatus)) {
        return res.status(400).json({ ok: false, message: "Notogri to'lov holati" });
      }
      const order = await setPaymentStatus(req.params.id, paymentStatus);
      if (!order) return res.status(404).json({ ok: false, message: 'Topilmadi' });
      res.json({ ok: true, data: order });
    } catch (err) {
      next(err);
    }
  },

  async deleteOrder(req, res, next) {
    try {
      const existing = await OrderModel.findById(req.params.id);
      if (existing?.receiptUrl) removeFile(existing.receiptUrl);
      await removeOrderWithStock(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },

  /** Barcha buyurtmalarni tozalash (statistika 0 ga tushadi, raqamlar #1 dan boshlanadi) */
  async clearOrders(req, res, next) {
    try {
      if ((req.body || {}).confirm !== 'TOZALASH') {
        return res.status(400).json({ ok: false, message: 'Tasdiqlash uchun TOZALASH deb yozing' });
      }
      // Yetkazilmagan buyurtmalardagi tovar omborga qaytadi
      await restoreOpenOrders();
      const receipts = await OrderModel.clearAll();
      receipts.forEach(removeFile);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },

  /* ===== Sozlamalar: kartaga o'tkazma uchun karta + donaga savdo ===== */
  async getSettings(_req, res, next) {
    try {
      res.json({ ok: true, data: await adminSettings() });
    } catch (err) {
      next(err);
    }
  },

  async updateSettings(req, res, next) {
    try {
      const body = req.body || {};
      const cardNumber = onlyDigits(body.cardNumber);
      const cardHolder = String(body.cardHolder || '').trim();
      const cardType = CARD_TYPES[body.cardType] ? body.cardType : '';

      if (cardNumber) {
        if (cardNumber.length !== 16) {
          return res
            .status(400)
            .json({ ok: false, message: "Karta raqami 16 ta raqamdan iborat bo'lishi kerak" });
        }
        if (!cardType) {
          return res.status(400).json({ ok: false, message: 'Karta turini tanlang: Uzcard yoki Humo' });
        }
        if (!cardHolder) {
          return res.status(400).json({ ok: false, message: 'Karta egasining ismini kiriting' });
        }
      }

      await SettingModel.setMany({ cardNumber, cardHolder, cardType });
      res.json({ ok: true, data: await adminSettings() });
    } catch (err) {
      next(err);
    }
  },

  /** Donaga savdoni vaqtincha o'chirish / yoqish (optom doim ishlaydi) */
  async updateSales(req, res, next) {
    try {
      const { retailEnabled } = req.body || {};
      if (typeof retailEnabled !== 'boolean') {
        return res.status(400).json({ ok: false, message: "retailEnabled noto'g'ri" });
      }
      await SettingModel.setMany({ retailEnabled });
      res.json({ ok: true, data: await adminSettings() });
    } catch (err) {
      next(err);
    }
  },

  /* ===== Mahsulotlar (CRUD) ===== */
  async listProducts(_req, res, next) {
    try {
      const products = await ProductModel.findAll();
      res.json({ ok: true, data: products });
    } catch (err) {
      next(err);
    }
  },

  async getProduct(req, res, next) {
    try {
      const product = await ProductModel.findById(req.params.id);
      if (!product) return res.status(404).json({ ok: false, message: 'Topilmadi' });
      res.json({ ok: true, data: product });
    } catch (err) {
      next(err);
    }
  },

  async createProduct(req, res, next) {
    try {
      const uploaded = (req.files || []).map((f) => fileUrl('products', f.filename));
      const data = buildProductData(req.body, uploaded, null);

      if (!data.article) return res.status(400).json({ ok: false, message: 'Artikul kiriting' });
      if (!data.name) return res.status(400).json({ ok: false, message: 'Mahsulot nomini kiriting' });
      if (!data.price) return res.status(400).json({ ok: false, message: 'Narxni kiriting' });
      if (!data.images.length) return res.status(400).json({ ok: false, message: 'Kamida 1 ta rasm qoshing' });

      const product = await ProductModel.create(data);
      res.status(201).json({ ok: true, data: product });
    } catch (err) {
      if (err.code === 'P2002') {
        return res.status(400).json({ ok: false, message: 'Bu artikul allaqachon mavjud' });
      }
      next(err);
    }
  },

  async updateProduct(req, res, next) {
    try {
      const existing = await ProductModel.findById(req.params.id);
      if (!existing) return res.status(404).json({ ok: false, message: 'Topilmadi' });

      const uploaded = (req.files || []).map((f) => fileUrl('products', f.filename));
      const data = buildProductData(req.body, uploaded, existing);

      if (!data.images.length) {
        return res.status(400).json({ ok: false, message: 'Kamida 1 ta rasm qoshing' });
      }

      // Olib tashlangan rasmlarni diskdan ham o'chiramiz
      existing.images
        .filter((url) => !data.images.includes(url))
        .forEach(removeFile);

      const product = await ProductModel.update(req.params.id, data);
      res.json({ ok: true, data: product });
    } catch (err) {
      if (err.code === 'P2002') {
        return res.status(400).json({ ok: false, message: 'Bu artikul allaqachon mavjud' });
      }
      next(err);
    }
  },

  /**
   * Ombor: { stockPacks: 12, stockPairs: { "40": 5 } }.
   * Bo'sh qiymat — hisoblanmaydi (cheklov yo'q). Yuborilmagan maydon o'zgarmaydi.
   */
  async updateStock(req, res, next) {
    try {
      const existing = await ProductModel.findById(req.params.id);
      if (!existing) return res.status(404).json({ ok: false, message: 'Topilmadi' });

      const body = req.body || {};
      const data = {};
      if ('stockPacks' in body) data.stockPacks = cleanCount(body.stockPacks);
      if ('stockPairs' in body) data.stockPairs = cleanPairs(body.stockPairs, existing.sizes);
      // Prisma'da Json maydonni tozalash uchun maxsus qiymat kerak
      if (data.stockPairs === null) data.stockPairs = Prisma.DbNull;

      const product = await ProductModel.update(req.params.id, data);
      res.json({ ok: true, data: product });
    } catch (err) {
      next(err);
    }
  },

  async deleteProduct(req, res, next) {
    try {
      const existing = await ProductModel.findById(req.params.id);
      if (existing) existing.images.forEach(removeFile);
      await ProductModel.remove(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },

  /* ===== Storylar ===== */
  async listStories(_req, res, next) {
    try {
      const stories = await StoryModel.findAll();
      res.json({ ok: true, data: stories });
    } catch (err) {
      next(err);
    }
  },

  async createStory(req, res, next) {
    try {
      const uploaded = (req.files || []).map((f) => fileUrl('stories', f.filename));
      const image = uploaded[0] || (req.body.image ? String(req.body.image).trim() : '');

      if (!image) return res.status(400).json({ ok: false, message: 'Story rasmini yuklang' });
      if (!req.body.title) return res.status(400).json({ ok: false, message: 'Sarlavha kiriting' });

      const story = await StoryModel.create({
        title: String(req.body.title).trim(),
        titleRu: req.body.titleRu ? String(req.body.titleRu).trim() : null,
        image,
        productId: req.body.productId ? toInt(req.body.productId, 0) || null : null,
        isActive: toBool(req.body.isActive, true),
        sortOrder: toInt(req.body.sortOrder, 0),
      });

      res.status(201).json({ ok: true, data: story });
    } catch (err) {
      next(err);
    }
  },

  async updateStory(req, res, next) {
    try {
      const existing = await StoryModel.findById(req.params.id);
      if (!existing) return res.status(404).json({ ok: false, message: 'Topilmadi' });

      const uploaded = (req.files || []).map((f) => fileUrl('stories', f.filename));
      const image = uploaded[0] || (req.body.image ? String(req.body.image).trim() : existing.image);

      if (uploaded[0] && existing.image !== uploaded[0]) removeFile(existing.image);

      const story = await StoryModel.update(req.params.id, {
        title: req.body.title ? String(req.body.title).trim() : existing.title,
        titleRu: req.body.titleRu ? String(req.body.titleRu).trim() : existing.titleRu,
        image,
        productId: req.body.productId ? toInt(req.body.productId, 0) || null : null,
        isActive: toBool(req.body.isActive, existing.isActive),
        sortOrder: toInt(req.body.sortOrder, existing.sortOrder),
      });

      res.json({ ok: true, data: story });
    } catch (err) {
      next(err);
    }
  },

  async deleteStory(req, res, next) {
    try {
      const existing = await StoryModel.findById(req.params.id);
      if (existing) removeFile(existing.image);
      await StoryModel.remove(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },

  /* ===== Mijozlar ===== */
  /* ===== Rassilka ===== */
  async broadcastInfo(_req, res, next) {
    try {
      const users = await UserModel.count();
      res.json({ ok: true, data: { users, ...broadcastStatus() } });
    } catch (err) {
      next(err);
    }
  },

  async broadcast(req, res, next) {
    const photoPath = req.files?.[0]?.path;
    try {
      const text = String(req.body?.text || '').trim();
      const limit = photoPath ? 1024 : 4096; // Telegram cheklovi: rasm izohi / oddiy xabar
      if (!text && !photoPath) {
        return res.status(400).json({ ok: false, message: 'Xabar matnini yozing yoki rasm qo\'shing' });
      }
      if (text.length > limit) {
        return res.status(400).json({
          ok: false,
          message: `Matn juda uzun: ${text.length} belgi (ko'pi bilan ${limit})`,
        });
      }
      const data = await startBroadcast({
        text,
        photoPath,
        withButton: toBool(req.body?.withButton, true),
        testOnly: toBool(req.body?.testOnly, false),
      });
      res.json({ ok: true, data });
    } catch (err) {
      if (photoPath) require('fs').promises.unlink(photoPath).catch(() => {});
      if (err?.message && !err.code) return res.status(400).json({ ok: false, message: err.message });
      next(err);
    }
  },

  async listUsers(_req, res, next) {
    try {
      const users = await UserModel.list();
      res.json({ ok: true, data: users });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = adminController;
