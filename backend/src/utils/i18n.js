/** Bot xabarlari — o'zbek va rus tillarida */
const T = {
  uz: {
    welcome: (name) =>
      `Assalomu alaykum, <b>${name}</b>! 👋\n\n` +
      `<b>ASF GROUP</b> — poyabzal ishlab chiqarish korxonasi.\n` +
      `<i>Sifat va ishonch</i>\n\n` +
      `Bizda:\n` +
      `👞 Tayyor oyoq kiyim\n` +
      `🧵 Zagatovka (poyabzal ustki qismi)\n` +
      `📏 Razmerlar: 39–43\n` +
      `📦 Donaga va optomga\n\n` +
      `Katalogni ko'rish uchun pastdagi tugmani bosing 👇`,
    openShop: '🛍 Do\'konni ochish',
    contact: '📞 Bog\'lanish',
    langBtn: '🌐 Til / Язык',
    langChoose: 'Tilni tanlang / Выберите язык:',
    langSaved: '✅ Til o\'zgartirildi: O\'zbekcha',
    contactInfo: (c) =>
      `<b>ASF GROUP</b>\n<i>${c.slogan}</i>\n\n` +
      `📞 Telefon: ${c.phone}\n📍 Manzil: ${c.address}\n\n` +
      `Optom buyurtmalar uchun bevosita bog'laning.`,
    orderOk: (order) =>
      `✅ <b>Buyurtmangiz muvaffaqiyatli qabul qilindi!</b>\n\n` +
      `🧾 Buyurtma raqami: <b>#${order.id}</b>\n` +
      `📦 Mahsulot: <b>${order.totalQty} juft</b>\n` +
      `💰 Jami: <b>${fmt(order.total)} so'm</b>${order.isWholesale ? '  (optom narx ✅)' : ''}\n` +
      `📍 Manzil: ${order.region}, ${order.address}\n` +
      `📞 Telefon: ${order.phone}\n\n` +
      `Menejerimiz tez orada siz bilan bog'lanadi 👞`,
    statusChanged: (order, label) =>
      `🔔 <b>#${order.id}</b> raqamli buyurtmangiz holati: <b>${label}</b>`,
    statuses: {
      new: '🆕 Yangi',
      confirmed: '✅ Tasdiqlandi',
      delivered: '📦 Yetkazildi',
      cancelled: '❌ Bekor qilindi',
    },
    fallback: 'Do\'konni ochish uchun pastdagi tugmadan foydalaning 👇',
  },

  ru: {
    welcome: (name) =>
      `Здравствуйте, <b>${name}</b>! 👋\n\n` +
      `<b>ASF GROUP</b> — обувная фабрика.\n` +
      `<i>Качество и доверие</i>\n\n` +
      `У нас есть:\n` +
      `👞 Готовая обувь\n` +
      `🧵 Заготовка (верх обуви)\n` +
      `📏 Размеры: 39–43\n` +
      `📦 В розницу и оптом\n\n` +
      `Нажмите кнопку ниже, чтобы открыть каталог 👇`,
    openShop: '🛍 Открыть магазин',
    contact: '📞 Связаться',
    langBtn: '🌐 Til / Язык',
    langChoose: 'Tilni tanlang / Выберите язык:',
    langSaved: '✅ Язык изменён: Русский',
    contactInfo: (c) =>
      `<b>ASF GROUP</b>\n<i>Качество и доверие</i>\n\n` +
      `📞 Телефон: ${c.phone}\n📍 Адрес: ${c.address}\n\n` +
      `По оптовым заказам свяжитесь напрямую.`,
    orderOk: (order) =>
      `✅ <b>Ваш заказ успешно принят!</b>\n\n` +
      `🧾 Номер заказа: <b>#${order.id}</b>\n` +
      `📦 Товар: <b>${order.totalQty} пар</b>\n` +
      `💰 Итого: <b>${fmt(order.total)} сум</b>${order.isWholesale ? '  (оптовая цена ✅)' : ''}\n` +
      `📍 Адрес: ${order.region}, ${order.address}\n` +
      `📞 Телефон: ${order.phone}\n\n` +
      `Наш менеджер свяжется с вами в ближайшее время 👞`,
    statusChanged: (order, label) =>
      `🔔 Статус заказа <b>#${order.id}</b>: <b>${label}</b>`,
    statuses: {
      new: '🆕 Новый',
      confirmed: '✅ Подтверждён',
      delivered: '📦 Доставлен',
      cancelled: '❌ Отменён',
    },
    fallback: 'Используйте кнопку ниже, чтобы открыть магазин 👇',
  },
};

function fmt(n) {
  return new Intl.NumberFormat('ru-RU').format(Number(n) || 0);
}

function t(lang) {
  return T[lang === 'ru' ? 'ru' : 'uz'];
}

module.exports = { t, fmt };
