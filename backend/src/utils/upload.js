const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { prisma } = require('../database/connection');

// sharp bo'lmasa ham server ishlayveradi — faqat rasmlar siqilmaydi
let sharp = null;
try {
  sharp = require('sharp');
  sharp.cache(false);
} catch (_) {
  console.warn('⚠️  sharp topilmadi — rasmlar siqilmasdan saqlanadi');
}

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

/** Rasm eni/bo'yi shu chegaradan oshmaydi — Mini App uchun yetarli, fayl esa yengil */
const MAX_SIDE = 1600;
/** Shundan kichik fayllar qayta siqilmaydi */
const OPTIMIZE_MIN_BYTES = 300 * 1024;

/**
 * Telefondan kelgan katta rasmni (5-10 MB) kichraytiradi: max 1600px, sifat ~82%.
 * Format va kengaytma o'zgarmaydi, shuning uchun manzil (URL) ham o'zgarmaydi.
 * Natija kichikroq bo'lsagina qaytaradi, aks holda null.
 */
async function optimizeBuffer(input, file) {
  if (!sharp || input.length < OPTIMIZE_MIN_BYTES) return null;
  const ext = path.extname(file).toLowerCase();
  if (ext === '.gif') return null;
  try {
    // Allaqachon kichraytirilgan rasm har deploy'da qayta siqilib, sifati tushmasin
    const meta = await sharp(input, { failOn: 'none' }).metadata();
    const side = Math.max(meta.width || 0, meta.height || 0);
    if (side && side <= MAX_SIDE && input.length < 1024 * 1024) return null;

    let img = sharp(input, { failOn: 'none' })
      .rotate() // telefon EXIF burilishini rasmga "yopishtiradi"
      .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true });
    if (ext === '.png') img = img.png({ compressionLevel: 9, palette: true, quality: 85 });
    else if (ext === '.webp') img = img.webp({ quality: 80 });
    else img = img.jpeg({ quality: 82, mozjpeg: true, progressive: true });
    const out = await img.toBuffer();
    return out.length < input.length ? out : null;
  } catch (err) {
    console.error(`Rasm siqilmadi (${path.basename(file)}):`, err?.message);
    return null;
  }
}

/** Faylni to'liq yozib bo'lgach almashtiradi — yarim yozilgan rasm berilib qolmasin */
function writeAtomic(abs, data) {
  ensureDir(path.dirname(abs));
  const tmp = `${abs}.${process.pid}-${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, abs);
}

/** Diskdagi faylni joyida siqadi */
async function optimizeFile(abs) {
  try {
    const out = await optimizeBuffer(fs.readFileSync(abs), abs);
    if (out) writeAtomic(abs, out);
  } catch (_) { /* asl fayl qoladi */ }
}

/**
 * Yuklangan faylni bazaga ham yozadi. Render diski har deploy'da tozalanadi —
 * shunda rasm yo'qolmaydi va kerak bo'lganda bazadan tiklanadi.
 */
async function storeFile(url) {
  const abs = localPath(url);
  if (!abs || !fs.existsSync(abs)) return;
  await optimizeFile(abs);
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

// Bir rasm bir vaqtda ko'p so'ralsa — bazaga faqat bitta so'rov ketadi
const restoring = new Map();

/** Rasm diskda bo'lmasa — bazadan tiklaydi. Diskdagi yo'lni qaytaradi (topilmasa null) */
async function ensureLocalFile(url) {
  const abs = localPath(url);
  if (!abs) return null;
  if (fs.existsSync(abs)) return abs;
  if (!restoring.has(abs)) {
    restoring.set(abs, restoreFromDb(url, abs).finally(() => restoring.delete(abs)));
  }
  return restoring.get(abs);
}

async function restoreFromDb(url, abs) {
  try {
    const row = await prisma.storedFile.findUnique({ where: { path: url } });
    if (!row) return null;
    writeAtomic(abs, Buffer.from(row.data));
    return abs;
  } catch (err) {
    console.error(`Rasm bazadan tiklanmadi (${url}):`, err?.message);
    return null;
  }
}

/**
 * Server ishga tushganda (fonda): bazadagi barcha rasmlarni diskka tiklaydi va
 * avval siqilmay yuklangan og'ir rasmlarni kichraytiradi. Shunda deploy'dan
 * keyingi birinchi ochilishda ham rasmlar darhol, tez beriladi.
 */
async function warmUpFiles() {
  let rows;
  try {
    rows = await prisma.storedFile.findMany({ select: { path: true } });
  } catch (err) {
    console.error('Rasmlar ro\'yxati olinmadi:', err?.message);
    return;
  }
  let restored = 0;
  let optimized = 0;
  for (const { path: url } of rows) {
    const abs = localPath(url);
    if (!abs) continue;
    try {
      const row = await prisma.storedFile.findUnique({ where: { path: url } });
      if (!row) continue;
      const data = Buffer.from(row.data);
      const out = await optimizeBuffer(data, abs);
      if (out) {
        await prisma.storedFile.update({ where: { path: url }, data: { data: out } });
        optimized += 1;
      }
      const onDisk = fs.existsSync(abs);
      if (out || !onDisk) {
        writeAtomic(abs, out || data);
        if (!onDisk) restored += 1;
      }
    } catch (err) {
      console.error(`Rasm tayyorlanmadi (${url}):`, err?.message);
    }
  }
  if (restored || optimized) {
    console.log(`🖼  Rasmlar: ${restored} ta tiklandi, ${optimized} ta siqildi`);
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
  warmUpFiles,
  mimeOf,
  UPLOAD_ROOT: ROOT,
};
