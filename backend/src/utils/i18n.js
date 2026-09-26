/** Bot xabarlari — o'zbek va rus tillarida */
const { colorInfo } = require('./colors');

/** Rang kaliti → nomi ("black" → "Qora", "Qizil#c62828" → "Qizil") */
const colorName = (key, lang = 'uz') => {
  const c = colorInfo(key);
  return c ? c[lang === 'ru' ? 'ru' : 'uz'] : '';
};

const PAYMENT = {
  uz: { cash: '💵 Naqd pul', click: '💳 Click', card: "🏦 Kartaga o'tkazma" },
  ru: { cash: '💵 Наличные', click: '💳 Click', card: '🏦 Перевод на карту' },
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
    orderOk: (order, pay) =>
      `✅ <b>Buyurtmangiz muvaffaqiyatli qabul qilindi!</b>\n\n` +
      `🧾 Buyurtma raqami: <b>#${order.id}</b>\n` +
      `📦 Mahsulot: <b>${qtyText(order, 'komplekt', 'juft')}</b>\n` +
      `💰 Jami: <b>${fmt(order.total)} so'm</b>${order.isWholesale ? '  (optom narx ✅)' : ''}\n` +
      `💳 To'lov: ${PAYMENT.uz[order.paymentMethod] || PAYMENT.uz.cash}\n` +
      `📍 Manzil: ${esc(order.region)}, ${esc(order.address)}\n` +
      `📞 Telefon: ${esc(order.phone)}\n\n` +
      (pay
        ? `💳 <b>To'lov uchun karta (${pay.typeLabel}):</b>\n` +
          `<code>${pay.cardFormatted}</code>\n` +
          `👤 Qabul qiluvchi: <b>${esc(pay.cardHolder)}</b>\n` +
          `💰 To'lanadigan summa: <b>${fmt(order.total)} so'm</b>\n\n` +
          `📸 To'lovni qilgach, <b>chek rasmini shu chatga yuboring</b> ` +
          `(yoki do'kondagi "Chek rasmini yuklash" tugmasi orqali). ` +
          `Admin tasdiqlagach buyurtmangiz jo'natiladi.`
        : `Menejerimiz tez orada siz bilan bog'lanadi 👞`),
    receiptReceived: (order) =>
      `🧾 <b>#${order.id}</b> buyurtma uchun chek qabul qilindi.\n` +
      `Admin tekshirib tasdiqlagach, sizga xabar beramiz ⏳`,
    paymentPaid: (order) =>
      `✅ <b>#${order.id}</b> buyurtmangiz uchun to'lov tasdiqlandi!\nTez orada jo'natamiz 👞`,
    paymentRejected: (order) =>
      `❌ <b>#${order.id}</b> buyurtmangiz uchun yuborilgan chek tasdiqlanmadi.\n` +
      `To'lovni tekshirib, chek rasmini shu chatga qaytadan yuboring yoki biz bilan bog'laning.`,
    noUnpaidOrder:
      "Sizda kartaga to'lov kutilayotgan buyurtma yo'q. Avval do'kondan buyurtma bering 👇",
    receiptNotImage: "Iltimos, chekni rasm (foto) ko'rinishida yuboring 📸",
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
    orderOk: (order, pay) =>
      `✅ <b>Ваш заказ успешно принят!</b>\n\n` +
      `🧾 Номер заказа: <b>#${order.id}</b>\n` +
      `📦 Товар: <b>${qtyText(order, 'компл.', 'пар')}</b>\n` +
      `💰 Итого: <b>${fmt(order.total)} сум</b>${order.isWholesale ? '  (оптовая цена ✅)' : ''}\n` +
      `💳 Оплата: ${PAYMENT.ru[order.paymentMethod] || PAYMENT.ru.cash}\n` +
      `📍 Адрес: ${esc(order.region)}, ${esc(order.address)}\n` +
      `📞 Телефон: ${esc(order.phone)}\n\n` +
      (pay
        ? `💳 <b>Карта для оплаты (${pay.typeLabel}):</b>\n` +
          `<code>${pay.cardFormatted}</code>\n` +
          `👤 Получатель: <b>${esc(pay.cardHolder)}</b>\n` +
          `💰 Сумма к оплате: <b>${fmt(order.total)} сум</b>\n\n` +
          `📸 После оплаты <b>отправьте фото чека в этот чат</b> ` +
          `(или через кнопку «Загрузить фото чека» в магазине). ` +
          `После подтверждения администратором заказ будет отправлен.`
        : `Наш менеджер свяжется с вами в ближайшее время 👞`),
    receiptReceived: (order) =>
      `🧾 Чек по заказу <b>#${order.id}</b> получен.\n` +
      `Сообщим, как только администратор подтвердит оплату ⏳`,
    paymentPaid: (order) =>
      `✅ Оплата заказа <b>#${order.id}</b> подтверждена!\nСкоро отправим 👞`,
    paymentRejected: (order) =>
      `❌ Чек по заказу <b>#${order.id}</b> не подтверждён.\n` +
      `Проверьте оплату и отправьте фото чека в этот чат ещё раз или свяжитесь с нами.`,
    noUnpaidOrder:
      'У вас нет заказов, ожидающих оплаты картой. Сначала оформите заказ в магазине 👇',
    receiptNotImage: 'Пожалуйста, отправьте чек в виде фото 📸',
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

/** Adminga: to'lov qilindimi yoki yo'qmi */
function paymentStatusLine(order) {
  const cash = (order.paymentMethod || 'cash') === 'cash';
  switch (order.paymentStatus) {
    case 'paid':
      return '✅ <b>To\'lov qilindi</b> (tasdiqlangan)';
    case 'pending':
      return '🧾 <b>To\'lov bo\'ldi — chekni tekshiring</b>';
    case 'rejected':
      return '❌ <b>To\'lov rad etilgan</b> — chek to\'g\'ri kelmadi';
    default:
      return cash
        ? '⏳ <b>To\'lov hali qilinmadi</b> — naqd, mahsulot topshirilganda olinadi'
        : '⏳ <b>To\'lov hali qilinmadi</b> — mijoz chek yuborishi kutilmoqda';
  }
}

/** Buyurtma qatoridagi rang nomi (rasmga rang belgilanmagan bo'lsa — shuni aytadi) */
const itemColorText = (i) => (i.color && colorName(i.color)) || 'belgilanmagan';

/** Adminga: mahsulot rasmi ostidagi ma'lumot */
function adminOrderItemCaption(order, i, n) {
  const sizes = i.packs
    ? `📦 <b>${i.packs} komplekt</b> (${Object.keys(i.sizes || {}).join(', ')})`
    : `🛍 Dona: ${Object.entries(i.sizes || {})
        .map(([size, count]) => `${size}×${count}`)
        .join(', ')}`;
  return (
    `🧾 Buyurtma #${order.id} — ${n + 1}-mahsulot\n\n` +
    `👟 <b>${esc(i.name)}</b>\n` +
    `🔖 Artikul: <b>${esc(i.article)}</b>\n` +
    `🎨 Rang: <b>${esc(itemColorText(i))}</b>\n` +
    `${sizes}\n` +
    `🔢 ${i.qty} juft × ${fmt(i.unitPrice)} = <b>${fmt(i.lineTotal)} so'm</b>`
  );
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
        `${n + 1}. <b>${esc(i.name)}</b> (${esc(i.article)})\n` +
        `   🎨 Rang: <b>${esc(itemColorText(i))}</b>\n` +
        `   ${sizes} — ${i.qty} juft × ${fmt(i.unitPrice)} = <b>${fmt(i.lineTotal)}</b>`
      );
    })
    .join('\n');

  return (
    `🆕 <b>Yangi ${order.isWholesale ? 'OPTOM ' : ''}buyurtma #${order.id}</b>\n\n` +
    `${items}\n\n` +
    `📦 Jami: <b>${qtyText(order, 'komplekt', 'juft')}</b>\n` +
    `💰 Summa: <b>${fmt(order.total)} so'm</b>${order.isWholesale ? '  (optom narx)' : ''}\n` +
    `💳 To'lov: <b>${PAYMENT.uz[order.paymentMethod] || PAYMENT.uz.cash}</b>\n` +
    `${paymentStatusLine(order)}\n\n` +
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

module.exports = {
  t,
  fmt,
  esc,
  adminNewOrder,
  adminOrderItemCaption,
  colorName,
  paymentStatusLine,
};
