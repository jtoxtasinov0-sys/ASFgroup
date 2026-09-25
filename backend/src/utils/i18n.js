/** Bot xabarlari — o'zbek va rus tillarida */
const config = require('../config/default');

/** Rang kaliti → nomi ("black" → "Qora") */
const colorName = (key, lang = 'uz') => {
  const c = config.colors.find((x) => x.key === key);
  return c ? c[lang === 'ru' ? 'ru' : 'uz'] : '';
};

const PAYMENT = {
  uz: { cash: '💵 Naqd pul', click: '💳 Click' },
  ru: { cash: '💵 Наличные', click: '💳 Click' },
};

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
      `📦 Mahsulot: <b>${qtyText(order, 'komplekt', 'juft')}</b>\n` +
      `💰 Jami: <b>${fmt(order.total)} so'm</b>${order.isWholesale ? '  (optom narx ✅)' : ''}\n` +
      `💳 To'lov: ${PAYMENT.uz[order.paymentMethod] || PAYMENT.uz.cash}\n` +
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
      `📦 Товар: <b>${qtyText(order, 'компл.', 'пар')}</b>\n` +
      `💰 Итого: <b>${fmt(order.total)} сум</b>${order.isWholesale ? '  (оптовая цена ✅)' : ''}\n` +
      `💳 Оплата: ${PAYMENT.ru[order.paymentMethod] || PAYMENT.ru.cash}\n` +
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

/** Buyurtmadagi komplektlar soni (optom qatorlari) */
function orderPacks(order) {
  return (Array.isArray(order.items) ? order.items : []).reduce(
    (sum, i) => sum + (Number(i.packs) || 0),
    0
  );
}

/** "3 komplekt (15 juft)" yoki "7 juft" */
function qtyText(order, packWord, pairWord) {
  const packs = orderPacks(order);
  return packs > 0
    ? `${packs} ${packWord} (${order.totalQty} ${pairWord})`
    : `${order.totalQty} ${pairWord}`;
}

/** Mijoz yozgan matn HTML xabarni buzmasligi uchun */
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Egasi/menejerga yangi buyurtma haqida xabar */
function adminNewOrder(order) {
  const u = order.user || {};
  const tgName = [u.firstName, u.lastName].filter(Boolean).join(' ');
  const tgLink = u.telegramId
    ? `<a href="tg://user?id=${u.telegramId}">${esc(tgName || u.telegramId)}</a>` +
      (u.username ? ` (@${esc(u.username)})` : '')
    : '—';

  const items = (Array.isArray(order.items) ? order.items : [])
    .map((i, n) => {
      const sizes = i.packs
        ? `📦 <b>${i.packs} komplekt</b> (${Object.keys(i.sizes || {}).join(', ')})`
        : `🛍 Dona: ${Object.entries(i.sizes || {})
            .map(([size, count]) => `${size}×${count}`)
            .join(', ')}`;
      return (
        `${n + 1}. <b>${esc(i.name)}</b> (${esc(i.article)})` +
        (i.color ? ` — 🎨 <b>${colorName(i.color)}</b>` : '') +
        '\n' +
        `   ${sizes} — ${i.qty} juft × ${fmt(i.unitPrice)} = <b>${fmt(i.lineTotal)}</b>`
      );
    })
    .join('\n');

  return (
    `🆕 <b>Yangi ${order.isWholesale ? 'OPTOM ' : ''}buyurtma #${order.id}</b>\n\n` +
    `${items}\n\n` +
    `📦 Jami: <b>${qtyText(order, 'komplekt', 'juft')}</b>\n` +
    `💰 Summa: <b>${fmt(order.total)} so'm</b>${order.isWholesale ? '  (optom narx)' : ''}\n` +
    `💳 To'lov: <b>${PAYMENT.uz[order.paymentMethod] || PAYMENT.uz.cash}</b>\n\n` +
    `👤 Mijoz: ${esc(order.customerName)}\n` +
    `📞 Telefon: ${esc(order.phone)}\n` +
    `📍 Manzil: ${esc(order.region)}, ${esc(order.address)}\n` +
    (order.comment ? `💬 Izoh: ${esc(order.comment)}\n` : '') +
    `✈️ Telegram: ${tgLink}`
  );
}

function t(lang) {
  return T[lang === 'ru' ? 'ru' : 'uz'];
}

module.exports = { t, fmt, esc, adminNewOrder, colorName };
