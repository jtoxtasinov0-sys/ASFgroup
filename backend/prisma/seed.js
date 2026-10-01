/**
 * ASF GROUP — mahsulotlar katalogi.
 * Ishga tushirish:  npm run db:seed   (Render'da har deploy'da avtomatik)
 *
 * Katalog: prisma/catalog/products.json + prisma/catalog/images/*.jpg
 *
 * Katalog bazaga faqat BIR MARTA yoziladi (CATALOG_VERSION). Shundan keyin
 * Admin paneldagi o'zgarishlaringiz (narx, nom, o'chirilgan mahsulotlar)
 * keyingi deploy'larda qayta yozilib ketmaydi.
 *
 * Yozilganda:
 *  - katalogda yo'q eski mahsulotlarning hammasi o'chiriladi
 *    (buyurtmalar tarixi saqlanadi — u mahsulot nusxasini o'zida saqlaydi);
 *  - rasmlar Admin paneldagi kabi yuklanadi: siqiladi va bazaga zaxiralanadi;
 *  - tayyor oyoq kiyimning dona narxi — RETAIL_PRICE, optom narx — katalogdagidek;
 *  - zagatovka donaga sotilmaydi (faqat optom).
 *
 * Katalogni qayta yozish kerak bo'lsa:  SEED_FORCE=1 npm run db:seed
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { prisma } = require('../src/database/connection');
const { storeFile, fileUrl, UPLOAD_ROOT } = require('../src/utils/upload');

const CATALOG_VERSION = 'asf-2026-10';
const CATALOG_KEY = 'catalogVersion';
const RETAIL_PRICE = 350000;

const CATALOG_DIR = path.join(__dirname, 'catalog');
const IMAGES_DIR = path.join(CATALOG_DIR, 'images');

/**
 * Katalog rasmini Admin paneldagi kabi yuklaydi: uploads/products/custom-*.jpg
 * ga yozadi va storeFile orqali siqib, bazaga zaxiralaydi.
 * Nomi rasm tarkibidan olinadi — qayta ishga tushsa, xuddi shu manzil chiqadi.
 */
async function uploadImage(file) {
  const src = path.join(IMAGES_DIR, file);
  const data = fs.readFileSync(src);
  const hash = crypto.createHash('sha1').update(data).digest('hex').slice(0, 16);
  const ext = (path.extname(file) || '.jpg').toLowerCase();
  const name = `custom-${hash}${ext}`;
  const dest = path.join(UPLOAD_ROOT, 'products', name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, data);
  const url = fileUrl('products', name);
  await storeFile(url);
  const stored = await prisma.storedFile.count({ where: { path: url } });
  if (!stored) throw new Error(`Rasm bazaga saqlanmadi: ${file}`);
  return url;
}

function toProduct(raw, index, urlOf) {
  const images = raw.images.map(urlOf);
  const imageColors = Object.fromEntries(
    Object.entries(raw.imageColors || {}).map(([src, color]) => [urlOf(src), color])
  );
  const isReady = raw.category === 'ready';
  return {
    article: raw.article,
    name: raw.name,
    nameRu: raw.nameRu || null,
    description: raw.description || null,
    descriptionRu: raw.descriptionRu || null,
    category: isReady ? 'ready' : 'upper',
    tag: null,
    color: raw.color || null,
    colorRu: raw.colorRu || null,
    material: raw.material || null,
    materialRu: raw.materialRu || null,
    images,
    imageFrames: {},
    imageColors,
    colorArticles: raw.colorArticles || {},
    // Zagatovka donaga sotilmaydi — dona narxi optom narxga teng turadi
    price: isReady ? RETAIL_PRICE : raw.wholesalePrice,
    oldPrice: null,
    wholesalePrice: raw.wholesalePrice,
    wholesaleMin: raw.wholesaleMin || 10,
    sizes: raw.sizes,
    inStock: raw.inStock !== false,
    isActive: raw.isActive !== false,
    sortOrder: index,
  };
}

async function main() {
  const force = process.env.SEED_FORCE === '1';
  const marker = await prisma.setting.findUnique({ where: { key: CATALOG_KEY } });
  if (marker?.value === CATALOG_VERSION && !force) {
    console.log(`🌱 Katalog (${CATALOG_VERSION}) allaqachon yozilgan — tegilmadi.`);
    return;
  }

  const catalog = JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, 'products.json'), 'utf8'));

  console.log('🖼  Rasmlar yuklanmoqda...');
  const urls = new Map();
  for (const raw of catalog) {
    for (const src of raw.images) {
      if (urls.has(src)) continue;
      urls.set(src, await uploadImage(path.basename(src)));
    }
  }
  console.log(`   ✓ ${urls.size} ta rasm bazaga saqlandi`);
  const urlOf = (src) => urls.get(src);

  const products = catalog.map((raw, i) => toProduct(raw, i, urlOf));
  const articles = products.map((p) => p.article);

  console.log('🌱 Mahsulotlar yozilmoqda...');
  const removed = await prisma.$transaction(async (tx) => {
    const { count } = await tx.product.deleteMany({ where: { article: { notIn: articles } } });
    for (const product of products) {
      await tx.product.upsert({
        where: { article: product.article },
        update: product,
        create: product,
      });
    }
    await tx.setting.upsert({
      where: { key: CATALOG_KEY },
      update: { value: CATALOG_VERSION },
      create: { key: CATALOG_KEY, value: CATALOG_VERSION },
    });
    return count;
  }, { timeout: 60000 });

  const ready = products.filter((p) => p.category === 'ready').length;
  const upper = products.length - ready;

  console.log('\n══════════════════════════════════');
  console.log(`🗑  Eski mahsulotlar o'chirildi : ${removed} ta`);
  console.log(`✅ Tayyor oyoq kiyim         : ${ready} ta  (dona ${RETAIL_PRICE.toLocaleString('ru-RU')} so'm)`);
  console.log(`✅ Zagatovka (faqat optom)   : ${upper} ta`);
  console.log('══════════════════════════════════\n');
}

main()
  .catch((err) => {
    console.error('❌ Seed xatosi:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
