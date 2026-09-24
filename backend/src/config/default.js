require('dotenv').config();

const config = {
  port: Number(process.env.PORT || 5000),
  // Render servisning haqiqiy manzilini RENDER_EXTERNAL_URL orqali o'zi beradi.
  // Qo'lda yozilgan PUBLIC_URL xato bo'lsa ham webhook to'g'ri joyga qo'yilsin.
  publicUrl: (
    process.env.RENDER_EXTERNAL_URL ||
    process.env.PUBLIC_URL ||
    'http://localhost:5000'
  ).replace(/\/$/, ''),
  miniappUrl: (process.env.MINIAPP_URL || 'http://localhost:5173').replace(/\/$/, ''),
  // Admin panel manzili — ADMIN_CHAT_IDS dagi odamlarga botda alohida tugma bo'lib chiqadi
  adminUrl: (process.env.ADMIN_URL || 'https://asf-admin-ten.vercel.app').replace(/\/$/, ''),

  bot: {
    token: process.env.BOT_TOKEN || '',
    polling: true,
    // Yangi buyurtma xabari boradigan chatlar (vergul bilan bir nechta).
    // Chat ID'ni botga /id yozib bilib olish mumkin. Guruh ID'si minus bilan boshlanadi.
    adminChatIds: (process.env.ADMIN_CHAT_IDS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },

  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'asf2025',
    jwtSecret: process.env.JWT_SECRET || 'asf-group-secret',
    tokenTtl: '30d',
  },

  company: {
    name: 'ASF GROUP',
    slogan: 'SIFAT VA ISHONCH',
    phone: process.env.COMPANY_PHONE || '+998 90 123 45 67',
    address: process.env.COMPANY_ADDRESS || 'Toshkent sh.',
  },

  // Buyurtmalar faqat O'zbekiston ichida
  regions: [
    { uz: 'Toshkent shahri', ru: 'город Ташкент' },
    { uz: 'Toshkent viloyati', ru: 'Ташкентская область' },
    { uz: 'Andijon', ru: 'Андижан' },
    { uz: 'Buxoro', ru: 'Бухара' },
    { uz: "Farg'ona", ru: 'Фергана' },
    { uz: 'Jizzax', ru: 'Джизак' },
    { uz: 'Xorazm', ru: 'Хорезм' },
    { uz: 'Namangan', ru: 'Наманган' },
    { uz: 'Navoiy', ru: 'Навои' },
    { uz: 'Qashqadaryo', ru: 'Кашкадарья' },
    { uz: "Qoraqalpog'iston", ru: 'Каракалпакстан' },
    { uz: 'Samarqand', ru: 'Самарканд' },
    { uz: 'Sirdaryo', ru: 'Сырдарья' },
    { uz: 'Surxondaryo', ru: 'Сурхандарья' },
  ],

  sizes: [39, 40, 41, 42, 43],

  categories: [
    { key: 'ready', uz: 'Tayyor oyoq kiyim', ru: 'Готовая обувь' },
    { key: 'upper', uz: 'Zagatovka', ru: 'Заготовка' },
  ],

  tags: [
    { key: 'klassik', uz: 'Klassik', ru: 'Классика' },
    { key: 'mokasin', uz: 'Mokasin', ru: 'Мокасины' },
    { key: 'loafer', uz: 'Loafer', ru: 'Лоферы' },
    { key: 'slipon', uz: 'Slip-on', ru: 'Слипоны' },
    { key: 'sport', uz: 'Sport', ru: 'Спорт' },
    { key: 'yozgi', uz: 'Yozgi', ru: 'Летние' },
    { key: 'qishki', uz: 'Qishki', ru: 'Зимние' },
  ],
};

module.exports = config;
