/**
 * ASF GROUP — boshlang'ich ma'lumotlar.
 * Ishga tushirish:  npm run db:seed
 *
 * Narxlar: tayyor oyoq kiyim — 140 000 so'm, zagatovka — 65 000 so'm.
 * Optom narx boshida dona narxiga teng qilib qo'yilgan —
 * uni Admin paneldan har bir mahsulot uchun alohida kiritasiz.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const READY_PRICE = 140000;
const UPPER_PRICE = 65000;
const SIZES = [39, 40, 41, 42, 43];

const img = (file) => [`/uploads/products/${file}`];

/* ---------- Tayyor oyoq kiyim ---------- */
const readyProducts = [
  {
    article: 'ASF-101',
    name: 'Mokasin Klassik',
    nameRu: 'Мокасины Классик',
    tag: 'mokasin',
    color: 'Qora',
    colorRu: 'Чёрный',
    images: img('asf-101.jpg'),
    description: 'Yumshoq charm mokasin, engil taglik. Kundalik kiyish uchun qulay.',
    descriptionRu: 'Мягкие кожаные мокасины на лёгкой подошве. Удобны для повседневной носки.',
  },
  {
    article: 'ASF-102',
    name: 'Slip-on Comfort',
    nameRu: 'Слипоны Comfort',
    tag: 'slipon',
    color: 'Qora',
    colorRu: 'Чёрный',
    images: img('asf-102.jpg'),
    description: 'Rezinkali slip-on model, qalin taglik. Bog\'ichsiz, tez kiyiladi.',
    descriptionRu: 'Слипоны на резинке с толстой подошвой. Без шнурков, легко надеваются.',
  },
  {
    article: 'ASF-103',
    name: 'Derbi Ofis',
    nameRu: 'Дерби Офис',
    tag: 'klassik',
    color: 'Qora',
    colorRu: 'Чёрный',
    images: img('asf-103.jpg'),
    description: 'Klassik bog\'ichli derbi. Ish va rasmiy tadbirlar uchun.',
    descriptionRu: 'Классические дерби на шнурках. Для работы и официальных мероприятий.',
  },
  {
    article: 'ASF-104',
    name: 'Sneaker Urban',
    nameRu: 'Кроссовки Urban',
    tag: 'sport',
    color: 'Qora-oq',
    colorRu: 'Чёрно-белый',
    images: img('asf-104.jpg'),
    description: 'Sport uslubidagi krossovka, oq taglik. Kundalik yurish uchun.',
    descriptionRu: 'Кроссовки в спортивном стиле на белой подошве. Для повседневной ходьбы.',
  },
  {
    article: 'ASF-105',
    name: 'Loafer Penny',
    nameRu: 'Лоферы Penny',
    tag: 'loafer',
    color: 'Qora',
    colorRu: 'Чёрный',
    images: img('asf-105.jpg'),
    description: 'Klassik penny-loafer, ustki qismida charm lenta.',
    descriptionRu: 'Классические пенни-лоферы с кожаной перемычкой.',
  },
  {
    article: 'ASF-106',
    name: 'Mokasin Navy',
    nameRu: 'Мокасины Navy',
    tag: 'mokasin',
    color: "To'q ko'k",
    colorRu: 'Тёмно-синий',
    images: img('asf-106.jpg'),
    description: "To'q ko'k rangli mokasin, metall belgi bilan.",
    descriptionRu: 'Тёмно-синие мокасины с металлическим логотипом.',
  },
  {
    article: 'ASF-107',
    name: 'Derbi Trend',
    nameRu: 'Дерби Trend',
    tag: 'klassik',
    color: 'Qora',
    colorRu: 'Чёрный',
    images: img('asf-107.jpg'),
    description: "Qalin tagli bog'ichli model. Zamonaviy va bardoshli.",
    descriptionRu: 'Модель на шнурках с толстой подошвой. Современная и прочная.',
  },
  {
    article: 'ASF-108',
    name: 'Mokasin Kofe',
    nameRu: 'Мокасины Кофе',
    tag: 'mokasin',
    color: 'Jigarrang',
    colorRu: 'Коричневый',
    images: img('asf-108.jpg'),
    description: 'Jigarrang mokasin, protektorli taglik.',
    descriptionRu: 'Коричневые мокасины с протекторной подошвой.',
  },
  {
    article: 'ASF-109',
    name: 'Comfort Air',
    nameRu: 'Comfort Air',
    tag: 'slipon',
    color: 'Jigarrang',
    colorRu: 'Коричневый',
    images: img('asf-109.jpg'),
    description: 'Yon tomoni teshikchali, havo almashinuvi yaxshi model.',
    descriptionRu: 'Модель с перфорацией по бокам и хорошей вентиляцией.',
  },
  {
    article: 'ASF-110',
    name: 'Mokasin Zamsh',
    nameRu: 'Мокасины Замша',
    tag: 'mokasin',
    color: 'Qora',
    colorRu: 'Чёрный',
    images: img('asf-110.jpg'),
    description: 'Zamsh qo\'shimchali mokasin, yumshoq ichki qism.',
    descriptionRu: 'Мокасины с замшевой вставкой и мягкой внутренней частью.',
  },
  {
    article: 'ASF-111',
    name: 'Slip-on Sport',
    nameRu: 'Слипоны Спорт',
    tag: 'sport',
    color: 'Qora',
    colorRu: 'Чёрный',
    images: img('asf-111.jpg'),
    description: 'Sport tagli slip-on. Kun bo\'yi qulay.',
    descriptionRu: 'Слипоны на спортивной подошве. Комфортны весь день.',
  },
  {
    article: 'ASF-112',
    name: 'Velkro Klassik',
    nameRu: 'Велькро Классик',
    tag: 'klassik',
    color: 'Qora',
    colorRu: 'Чёрный',
    images: img('asf-112.jpg'),
    description: 'Velkro (lipuchka) bilan mahkamlanadi. Kiyish juda oson.',
    descriptionRu: 'Застёжка на липучке. Очень легко надевать.',
  },
  {
    article: 'ASF-113',
    name: 'Mokasin Elegant',
    nameRu: 'Мокасины Elegant',
    tag: 'mokasin',
    color: 'Qora',
    colorRu: 'Чёрный',
    images: img('asf-113.jpg'),
    description: 'Nafis chokli mokasin, yupqa taglik.',
    descriptionRu: 'Мокасины с аккуратным швом на тонкой подошве.',
  },
];

/* ---------- Zagatovka (poyabzal ustki qismi) ---------- */
const upperProducts = [
  {
    article: 'ASF-Z-01',
    name: 'Zagatovka Sport',
    nameRu: 'Заготовка Спорт',
    tag: 'sport',
    color: 'Qora',
    colorRu: 'Чёрный',
    images: img('asf-z-01.jpg'),
    description: 'Yon tomoni tekstil qo\'shimchali sport zagatovka.',
    descriptionRu: 'Спортивная заготовка с текстильной вставкой по бокам.',
  },
  {
    article: 'ASF-Z-02',
    name: 'Zagatovka Velkro',
    nameRu: 'Заготовка Велькро',
    tag: 'klassik',
    color: 'Qora',
    colorRu: 'Чёрный',
    images: img('asf-z-02.jpg'),
    description: 'Velkro bandli zagatovka, klassik shakl.',
    descriptionRu: 'Заготовка с ремешком на липучке, классическая форма.',
  },
  {
    article: 'ASF-Z-03',
    name: 'Zagatovka Tokali',
    nameRu: 'Заготовка с пряжкой',
    tag: 'klassik',
    color: 'Qora',
    colorRu: 'Чёрный',
    images: img('asf-z-03.jpg'),
    description: 'Metall tokali zagatovka, klassik monk uslubi.',
    descriptionRu: 'Заготовка с металлической пряжкой в стиле монк.',
  },
  {
    article: 'ASF-Z-04',
    name: 'Zagatovka Perforatsiya',
    nameRu: 'Заготовка Перфорация',
    tag: 'yozgi',
    color: 'Qora',
    colorRu: 'Чёрный',
    images: img('asf-z-04.jpg'),
    description: 'Teshikchali (perforatsiyali) yozgi zagatovka.',
    descriptionRu: 'Летняя заготовка с перфорацией.',
  },
  {
    article: 'ASF-Z-05',
    name: 'Zagatovka Navy',
    nameRu: 'Заготовка Navy',
    tag: 'mokasin',
    color: "To'q ko'k",
    colorRu: 'Тёмно-синий',
    images: img('asf-z-05.jpg'),
    description: "To'q ko'k mokasin zagatovkasi, metall belgi bilan.",
    descriptionRu: 'Тёмно-синяя заготовка мокасин с металлическим логотипом.',
  },
  {
    article: 'ASF-Z-06',
    name: 'Zagatovka Baland',
    nameRu: 'Заготовка Высокая',
    tag: 'qishki',
    color: 'Qora',
    colorRu: 'Чёрный',
    images: img('asf-z-06.jpg'),
    description: "Baland bo'g'inli zagatovka, ichi issiq astarli.",
    descriptionRu: 'Высокая заготовка с тёплой подкладкой.',
  },
  {
    article: 'ASF-Z-07',
    name: 'Zagatovka Premium',
    nameRu: 'Заготовка Премиум',
    tag: 'loafer',
    color: 'Qora',
    colorRu: 'Чёрный',
    images: img('asf-z-07.jpg'),
    description: 'Bezakli tokali loafer zagatovkasi.',
    descriptionRu: 'Заготовка лоферов с декоративной пряжкой.',
  },
];

/* ---------- Storylar ---------- */
const stories = [
  { title: 'Yangi kolleksiya', titleRu: 'Новая коллекция', image: '/uploads/products/asf-104.jpg', article: 'ASF-104', sortOrder: 1 },
  { title: 'Optom savdo', titleRu: 'Оптом', image: '/uploads/products/asf-101.jpg', article: 'ASF-101', sortOrder: 2 },
  { title: 'Zagatovka', titleRu: 'Заготовка', image: '/uploads/products/asf-z-01.jpg', article: 'ASF-Z-01', sortOrder: 3 },
  { title: 'Klassika', titleRu: 'Классика', image: '/uploads/products/asf-113.jpg', article: 'ASF-113', sortOrder: 4 },
];

function expand(list, category, price) {
  return list.map((p, index) => ({
    ...p,
    category,
    material: category === 'ready' ? 'Charm' : 'Charm',
    materialRu: 'Кожа',
    price,
    wholesalePrice: price, // Optom narxni Admin paneldan kiritasiz
    wholesaleMin: 10,
    sizes: SIZES,
    inStock: true,
    isActive: true,
    sortOrder: index,
  }));
}

async function main() {
  const products = [
    ...expand(readyProducts, 'ready', READY_PRICE),
    ...expand(upperProducts, 'upper', UPPER_PRICE),
  ];

  console.log('🌱 Mahsulotlar yozilmoqda...');
  for (const product of products) {
    await prisma.product.upsert({
      where: { article: product.article },
      update: product,
      create: product,
    });
    console.log(`   ✓ ${product.article} — ${product.name}`);
  }

  console.log('\n🌱 Storylar yozilmoqda...');
  const existingStories = await prisma.story.count();
  if (existingStories === 0) {
    for (const story of stories) {
      const product = await prisma.product.findUnique({ where: { article: story.article } });
      await prisma.story.create({
        data: {
          title: story.title,
          titleRu: story.titleRu,
          image: story.image,
          productId: product ? product.id : null,
          sortOrder: story.sortOrder,
          isActive: true,
        },
      });
      console.log(`   ✓ ${story.title}`);
    }
  } else {
    console.log(`   (${existingStories} ta story allaqachon bor — o'tkazib yuborildi)`);
  }

  const ready = products.filter((p) => p.category === 'ready').length;
  const upper = products.filter((p) => p.category === 'upper').length;

  console.log('\n══════════════════════════════════');
  console.log(`✅ Tayyor oyoq kiyim : ${ready} ta  (${READY_PRICE.toLocaleString('ru-RU')} so'm)`);
  console.log(`✅ Zagatovka         : ${upper} ta  (${UPPER_PRICE.toLocaleString('ru-RU')} so'm)`);
  console.log('══════════════════════════════════\n');
}

main()
  .catch((err) => {
    console.error('❌ Seed xatosi:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
