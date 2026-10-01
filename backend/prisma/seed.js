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
const { storeFile, fileUrl, removeFile, UPLOAD_ROOT } = require('../src/utils/upload');

const CATALOG_VERSION = 'asf-2026-10';
const CATALOG_KEY = 'catalogVersion';
// Muqova (birinchi rasm) tartibi katalogdagidek qilinadi — bir marta
const COVERS_VERSION = 'v1';
const COVERS_KEY = 'catalogCovers';
const RETAIL_PRICE = 350000;
// Storylar hozirgi tayyor oyoq kiyimlardan qayta yaratiladi — bir marta
const STORIES_VERSION = 'ready-2026-10';
const STORIES_KEY = 'storiesVersion';

const CATALOG_DIR = path.join(__dirname, 'catalog');
const IMAGES_DIR = path.join(CATALOG_DIR, 'images');

/**
 * Katalog rasmini Admin paneldagi kabi yuklaydi: uploads/products/custom-*.jpg
 * ga yozadi va storeFile orqali siqib, bazaga zaxiralaydi.
 * Nomi rasm tarkibidan olinadi — qayta ishga tushsa, xuddi shu manzil chiqadi.
 */
function storedName(file) {
  const data = fs.readFileSync(path.join(IMAGES_DIR, file));
  const hash = crypto.createHash('sha1').update(data).digest('hex').slice(0, 16);
  const ext = (path.extname(file) || '.jpg').toLowerCase();
  return { data, name: `custom-${hash}${ext}` };
}

async function uploadImage(file, folder = 'products') {
  const { data, name } = storedName(file);
  const dest = path.join(UPLOAD_ROOT, folder, name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, data);
  const url = fileUrl(folder, name);
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

const readCatalog = () =>
  JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, 'products.json'), 'utf8'));

/**
 * Katalog avval yozilgan bo'lsa: mahsulotning birinchi rasmi (muqova)
 * katalogdagi birinchi rasm qilinadi. Boshqa maydonlarga tegilmaydi.
 */
async function syncCovers() {
  const marker = await prisma.setting.findUnique({ where: { key: COVERS_KEY } });
  if (marker?.value === COVERS_VERSION) return;

  let changed = 0;
  for (const raw of readCatalog()) {
    const product = await prisma.product.findUnique({ where: { article: raw.article } });
    if (!product || !raw.images.length) continue;
    const cover = fileUrl('products', storedName(path.basename(raw.images[0])).name);
    if (!product.images.includes(cover) || product.images[0] === cover) continue;
    await prisma.product.update({
      where: { id: product.id },
      data: { images: [cover, ...product.images.filter((url) => url !== cover)] },
    });
    changed += 1;
  }
  await prisma.setting.upsert({
    where: { key: COVERS_KEY },
    update: { value: COVERS_VERSION },
    create: { key: COVERS_KEY, value: COVERS_VERSION },
  });
  console.log(`🖼  Muqova rasmlari yangilandi: ${changed} ta mahsulot`);
}

/**
 * Eski storylar o'chiriladi va har bir tayyor oyoq kiyim uchun yangi story yaratiladi:
 * rasm — mahsulotning ikkinchi (boshqa burchakdan) rasmi, sarlavha — model nomi,
 * story mahsulotga bog'lanadi. Rasm uploads/stories ga alohida nusxa qilinadi —
 * Admin paneldan story o'chirilsa, mahsulot rasmiga tegilmaydi.
 * Bir marta ishlaydi (STORIES_VERSION) — keyin Admin paneldagi o'zgarishlar saqlanadi.
 */
async function syncStories() {
  const marker = await prisma.setting.findUnique({ where: { key: STORIES_KEY } });
  if (marker?.value === STORIES_VERSION && process.env.SEED_FORCE !== '1') return;

  const ready = readCatalog().filter((raw) => raw.category === 'ready' && raw.images.length);
  const stories = [];
  for (const raw of ready) {
    const product = await prisma.product.findUnique({ where: { article: raw.article } });
    if (!product || !product.isActive) continue;
    const src = raw.images[1] || raw.images[0];
    stories.push({
      title: raw.name,
      titleRu: raw.nameRu || raw.name,
      image: await uploadImage(path.basename(src), 'stories'),
      productId: product.id,
      isActive: true,
      sortOrder: stories.length,
    });
  }

  const old = await prisma.story.findMany();
  await prisma.$transaction([
    prisma.story.deleteMany({}),
    prisma.story.createMany({ data: stories }),
    prisma.setting.upsert({
      where: { key: STORIES_KEY },
      update: { value: STORIES_VERSION },
      create: { key: STORIES_KEY, value: STORIES_VERSION },
    }),
  ]);
  // Eski story rasmlari — faqat stories papkasidagilar, yangi nusxalarga tegilmaydi
  const keep = new Set(stories.map((s) => s.image));
  const stale = old
    .map((story) => story.image)
    .filter((url) => url?.startsWith('/uploads/stories/') && !keep.has(url));
  stale.forEach(removeFile);
  // removeFile bazadagi zaxirani kutmasdan o'chiradi — seed tugashidan oldin aniq o'chsin
  await prisma.storedFile.deleteMany({ where: { path: { in: stale } } });
  console.log(`📸 Storylar yangilandi: ${old.length} ta eski o'chirildi, ${stories.length} ta yangi`);
}

async function main() {
  const force = process.env.SEED_FORCE === '1';
  const marker = await prisma.setting.findUnique({ where: { key: CATALOG_KEY } });
  if (marker?.value === CATALOG_VERSION && !force) {
    console.log(`🌱 Katalog (${CATALOG_VERSION}) allaqachon yozilgan — tegilmadi.`);
    await syncCovers();
    await syncStories();
    return;
  }

  const catalog = readCatalog();

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
  await syncCovers();
  await syncStories();

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
