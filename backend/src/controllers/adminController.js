const crypto = require('crypto');
const config = require('../config/default');
const ProductModel = require('../models/Product');
const OrderModel = require('../models/Order');
const StoryModel = require('../models/Story');
const UserModel = require('../models/User');
const { signAdminToken } = require('../middlewares/auth.middleware');
const { fileUrl, removeFile } = require('../utils/upload');
const { safeSend } = require('../core/bot');
const { t } = require('../utils/i18n');

/* ---------- Yordamchi ---------- */

const toInt = (v, fallback = 0) => {
  const raw = String(v ?? '').replace(/\s/g, '');
  if (raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : fallback;
};

/** Parollarni uzunligini ham oshkor qilmaydigan tarzda taqqoslaydi */
const samePassword = (given, expected) => {
  const a = crypto.createHash('sha256').update(String(given ?? '')).digest();
  const b = crypto.createHash('sha256').update(String(expected ?? '')).digest();
  return crypto.timingSafeEqual(a, b);
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

/** Mahsulot maydonlarini forma ma'lumotidan yig'adi */
function buildProductData(body, uploadedUrls, existing) {
  const keepImages = toArray(body.images).filter((u) => typeof u === 'string');
  const images = [...keepImages, ...uploadedUrls];

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
      const orders = await OrderModel.findAll({ status: req.query.status });
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

      const order = await OrderModel.updateStatus(req.params.id, status);

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

  async deleteOrder(req, res, next) {
    try {
      await OrderModel.remove(req.params.id);
      res.json({ ok: true });
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
