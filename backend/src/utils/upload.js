const path = require('path');
const fs = require('fs');
const multer = require('multer');

const ROOT = path.join(__dirname, '..', '..', 'uploads');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Galereyadan rasm yuklash (mahsulot yoki story uchun) */
function makeUploader(folder) {
  const dest = path.join(ROOT, folder);
  ensureDir(dest);

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
      const safe = `custom-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
      cb(null, safe);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 12 * 1024 * 1024 }, // 12 MB
    fileFilter: (_req, file, cb) => {
      if (/^image\/(jpeg|png|webp|jpg|gif)$/.test(file.mimetype)) return cb(null, true);
      cb(new Error('Faqat rasm fayllari qabul qilinadi (jpg, png, webp)'));
    },
  });
}

/** Yuklangan fayldan public URL yasaydi */
function fileUrl(folder, filename) {
  return `/uploads/${folder}/${filename}`;
}

/** Diskdan rasmni o'chiradi (faqat o'zimiz yuklagan custom-* fayllarni) */
function removeFile(url) {
  try {
    if (!url || !url.startsWith('/uploads/')) return;
    const rel = url.replace('/uploads/', '');
    if (!path.basename(rel).startsWith('custom-')) return;
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (_) { /* jim o'tkazamiz */ }
}

module.exports = { makeUploader, fileUrl, removeFile, UPLOAD_ROOT: ROOT };
