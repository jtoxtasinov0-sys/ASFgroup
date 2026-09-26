const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { prisma } = require('../database/connection');

const ROOT = path.join(__dirname, '..', '..', 'uploads');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
const mimeOf = (file) => MIME[path.extname(file).toLowerCase()] || 'image/jpeg';

/** "/uploads/products/x.jpg" → diskdagi to'liq yo'l (uploads papkasidan chiqib ketmasin) */
function localPath(url) {
  if (!url || !url.startsWith('/uploads/')) return null;
  const abs = path.join(ROOT, url.replace('/uploads/', ''));
  return abs.startsWith(ROOT + path.sep) ? abs : null;
}

/**
 * Yuklangan faylni bazaga ham yozadi. Render diski har deploy'da tozalanadi —
 * shunda rasm yo'qolmaydi va kerak bo'lganda bazadan tiklanadi.
 */
async function storeFile(url) {
  const abs = localPath(url);
  if (!abs || !fs.existsSync(abs)) return;
  try {
    const data = fs.readFileSync(abs);
    await prisma.storedFile.upsert({
      where: { path: url },
      create: { path: url, mime: mimeOf(abs), data },
      update: { mime: mimeOf(abs), data },
    });
  } catch (err) {
    console.error(`Rasm bazaga saqlanmadi (${url}):`, err?.message);
  }
}

/** Rasm diskda bo'lmasa — bazadan tiklaydi. Diskdagi yo'lni qaytaradi (topilmasa null) */
async function ensureLocalFile(url) {
  const abs = localPath(url);
  if (!abs) return null;
  if (fs.existsSync(abs)) return abs;
  try {
    const row = await prisma.storedFile.findUnique({ where: { path: url } });
    if (!row) return null;
    ensureDir(path.dirname(abs));
    fs.writeFileSync(abs, Buffer.from(row.data));
    return abs;
  } catch (err) {
    console.error(`Rasm bazadan tiklanmadi (${url}):`, err?.message);
    return null;
  }
}

/** Galereyadan rasm yuklash (mahsulot, story, chek, rassilka uchun) */
function makeUploader(folder) {
  const dest = path.join(ROOT, folder);
  ensureDir(dest);

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
      // Tasodifiy nom — chek rasmlarining manzilini taxmin qilib bo'lmasin
      const safe = `custom-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      cb(null, safe);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 12 * 1024 * 1024 }, // 12 MB
    fileFilter: (_req, file, cb) => {
      if (/^image\/(jpeg|png|webp|jpg|gif)$/.test(file.mimetype)) return cb(null, true);
      cb(new Error('Faqat rasm fayllari qabul qilinadi (jpg, png, webp)'));
    },
  });

  // Diskka tushgan fayllarni bazaga ham yozib qo'yadi
  const persist = async (req, _res, next) => {
    const files = [...(req.files || []), ...(req.file ? [req.file] : [])];
    await Promise.all(files.map((f) => storeFile(fileUrl(folder, f.filename))));
    next();
  };

  return {
    array: (field, max) => [upload.array(field, max), persist],
    single: (field) => [upload.single(field), persist],
  };
}

/** Yuklangan fayldan public URL yasaydi */
function fileUrl(folder, filename) {
  return `/uploads/${folder}/${filename}`;
}

/** Diskdan va bazadan rasmni o'chiradi (faqat o'zimiz yuklagan custom-* fayllarni) */
function removeFile(url) {
  try {
    const abs = localPath(url);
    if (!abs || !path.basename(abs).startsWith('custom-')) return;
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
    prisma.storedFile.deleteMany({ where: { path: url } }).catch(() => {});
  } catch (_) { /* jim o'tkazamiz */ }
}

module.exports = {
  makeUploader,
  fileUrl,
  removeFile,
  storeFile,
  ensureLocalFile,
  mimeOf,
  UPLOAD_ROOT: ROOT,
};
