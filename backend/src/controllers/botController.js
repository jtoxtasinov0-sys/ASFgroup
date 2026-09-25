const config = require('../config/default');
const UserModel = require('../models/User');
const OrderModel = require('../models/Order');
const { t, esc } = require('../utils/i18n');
const { samePassword } = require('../utils/password');
const { canDecide, attachReceipt, setPaymentStatus, saveTelegramFile } = require('../services/payment');

const PAY_LABEL = {
  paid: "✅ TO'LOV TASDIQLANDI",
  rejected: '❌ CHEK RAD ETILDI',
};
const { isAdminChat, hasAdminUrl, setAdminMenuButton } = require('../core/bot');

/** Mini App https manzilida bo'lsagina web_app tugmasini qo'yish mumkin */
const isHttps = () => /^https:\/\//.test(config.miniappUrl);

/**
 * Admin panelni ochadigan tugma — faqat shaxsiy chatda va faqat adminlarga:
 * ADMIN_CHAT_IDS da yozilganlar yoki botda /admin PAROL qilganlar.
 */
const showAdminButton = (chatId, user) =>
  chatId > 0 && hasAdminUrl() && (isAdminChat(chatId) || Boolean(user?.isAdmin));

const adminButtonMarkup = () => ({
  inline_keyboard: [[{ text: '🛠 Admin panel', web_app: { url: config.adminUrl } }]],
});

// Parolni taxmin qilishga urinishlarni cheklash: 1 soatda 5 ta xato
const failedTries = new Map();
const tooManyTries = (chatId) => {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const tries = (failedTries.get(chatId) || []).filter((ts) => ts > hourAgo);
  failedTries.set(chatId, tries);
  return tries.length >= 5;
};

/** Asosiy klaviatura */
function mainKeyboard(lang, chatId, user) {
  const L = t(lang);
  const rows = [];

  if (isHttps()) {
    rows.push([{ text: L.openShop, web_app: { url: config.miniappUrl } }]);
  }
  if (showAdminButton(chatId, user)) {
    rows.push([{ text: '🛠 Admin panel', web_app: { url: config.adminUrl } }]);
  }
  rows.push([{ text: L.contact, callback_data: 'contact' }, { text: L.langBtn, callback_data: 'lang' }]);

  return { inline_keyboard: rows };
}

const botController = {
  /** /start */
  async onStart(bot, msg) {
    const user = await UserModel.findOrCreate(msg.from);
    const L = t(user.lang);
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'mijoz';

    await bot.sendMessage(msg.chat.id, L.welcome(name), {
      parse_mode: 'HTML',
      reply_markup: mainKeyboard(user.lang, msg.chat.id, user),
    });

    // Admin uchun pastki "Menu" tugmasi ham admin panelni ochsin
    if (showAdminButton(msg.chat.id, user)) await setAdminMenuButton(msg.chat.id);

    if (!isHttps()) {
      await bot.sendMessage(
        msg.chat.id,
        'ℹ️ Do\'kon hozircha sozlanmoqda. ngrok manzilini .env faylga qo\'ygach, ' +
          'do\'kon tugmasi shu yerda paydo bo\'ladi.'
      );
    }
  },

  /** Inline tugmalar */
  async onCallback(bot, query) {
    if (query.data && query.data.startsWith('pay:')) {
      return botController.onPaymentDecision(bot, query);
    }

    const chatId = query.message.chat.id;
    const user = await UserModel.findOrCreate(query.from);
    const data = query.data;

    if (data === 'contact') {
      const L = t(user.lang);
      await bot.sendMessage(chatId, L.contactInfo(config.company), { parse_mode: 'HTML' });
    }

    if (data === 'lang') {
      await bot.sendMessage(chatId, t(user.lang).langChoose, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🇺🇿 O'zbekcha", callback_data: 'set_lang:uz' },
              { text: '🇷🇺 Русский', callback_data: 'set_lang:ru' },
            ],
          ],
        },
      });
    }

    if (data && data.startsWith('set_lang:')) {
      const lang = data.split(':')[1] === 'ru' ? 'ru' : 'uz';
      await UserModel.update(user.telegramId, { lang });
      const L = t(lang);
      await bot.sendMessage(chatId, L.langSaved, {
        parse_mode: 'HTML',
        reply_markup: mainKeyboard(lang, chatId, user),
      });
    }

    await bot.answerCallbackQuery(query.id).catch(() => {});
  },

  /** Admin chekni tasdiqlaydi yoki rad etadi: pay:ok:12 | pay:no:12 */
  async onPaymentDecision(bot, query) {
    const [, action, id] = query.data.split(':');

    if (!(await canDecide(query.from.id))) {
      return bot.answerCallbackQuery(query.id, {
        text: "Sizda bu amal uchun ruxsat yo'q",
        show_alert: true,
      });
    }

    const current = await OrderModel.findById(id);
    if (!current) {
      return bot.answerCallbackQuery(query.id, { text: 'Buyurtma topilmadi', show_alert: true });
    }

    // Boshqa admin allaqachon hal qilgan bo'lsa — qayta o'zgartirmaymiz
    let order = current;
    if (current.paymentStatus === 'pending') {
      order = await setPaymentStatus(id, action === 'ok' ? 'paid' : 'rejected');
    }

    const label = PAY_LABEL[order.paymentStatus] || order.paymentStatus;
    const who = query.from.username ? `@${query.from.username}` : query.from.first_name || 'admin';
    // Telegram caption'ni oddiy matn qilib qaytaradi — HTML uchun qayta ekranlaymiz
    const original = (query.message.caption || query.message.text || '').replace(
      /\n*Chekni tekshirib.*$/s,
      ''
    );
    const caption = `${esc(original)}\n\n<b>${label}</b> — ${esc(who)}`;

    const target = { chat_id: query.message.chat.id, message_id: query.message.message_id };
    const edit = query.message.photo || query.message.document
      ? bot.editMessageCaption(caption, { ...target, parse_mode: 'HTML' })
      : bot.editMessageText(caption, { ...target, parse_mode: 'HTML' });
    await edit.catch(() => {});

    await bot
      .answerCallbackQuery(query.id, {
        text: current.paymentStatus === 'pending' ? label : `Avvalroq hal qilingan: ${label}`,
      })
      .catch(() => {});
  },

  /** Mijoz kartaga o'tkazma chekini botga rasm qilib yuboradi */
  async onReceipt(bot, msg) {
    const user = await UserModel.findOrCreate(msg.from);
    const L = t(user.lang);

    const photo = msg.photo?.[msg.photo.length - 1];
    const doc = msg.document;
    if (!photo && !(doc && /^image\//.test(doc.mime_type || ''))) {
      return bot.sendMessage(msg.chat.id, L.receiptNotImage);
    }

    const order = await OrderModel.findLatestUnpaid(user.telegramId);
    if (!order) {
      return bot.sendMessage(msg.chat.id, L.noUnpaidOrder, {
        reply_markup: mainKeyboard(user.lang, msg.chat.id, user),
      });
    }

    const fileId = photo ? photo.file_id : doc.file_id;
    let receiptUrl = null;
    try {
      receiptUrl = await saveTelegramFile(bot, fileId);
    } catch (err) {
      console.error('Chek fayli saqlanmadi:', err?.message);
    }

    await attachReceipt(order, receiptUrl, { fileId, kind: photo ? 'photo' : 'document' });
  },

  /** Telefon raqami yuborilganda */
  async onContact(bot, msg) {
    const user = await UserModel.findOrCreate(msg.from);
    await UserModel.update(user.telegramId, { phone: msg.contact.phone_number });
    await bot.sendMessage(
      msg.chat.id,
      user.lang === 'ru' ? '✅ Номер сохранён' : '✅ Raqamingiz saqlandi',
      { reply_markup: mainKeyboard(user.lang, msg.chat.id, user) }
    );
  },

  /** /id — chat ID'ni ko'rsatadi (ADMIN_CHAT_IDS ga yozish uchun) */
  async onId(bot, msg) {
    const isAdmin = config.bot.adminChatIds.includes(String(msg.chat.id));
    await bot.sendMessage(
      msg.chat.id,
      `🆔 Chat ID: <code>${msg.chat.id}</code>\n\n` +
        (isAdmin
          ? '✅ Bu chat yangi buyurtmalar haqida xabar oladi.'
          : 'Yangi buyurtmalar haqida xabar olish uchun shu raqamni serverdagi ' +
            '<code>ADMIN_CHAT_IDS</code> sozlamasiga yozing.\n\n' +
            'Admin panel tugmasi kerak bo\'lsa: <code>/admin PAROL</code>'),
      { parse_mode: 'HTML' }
    );
  },

  /**
   * /admin — admin panel tugmasi.
   * /admin PAROL — admin panel paroli to'g'ri bo'lsa, shu odam admin bo'ladi
   * (Render'da ADMIN_CHAT_IDS ni o'zgartirmasdan). Parolli xabar o'chiriladi.
   */
  async onAdmin(bot, msg, match) {
    const chatId = msg.chat.id;
    if (chatId <= 0) {
      await bot.sendMessage(chatId, 'Bu buyruq faqat botning shaxsiy chatida ishlaydi.');
      return;
    }
    if (!hasAdminUrl()) {
      await bot.sendMessage(chatId, '⚠️ Serverda ADMIN_URL https manzil emas — tugma qo\'yib bo\'lmaydi.');
      return;
    }

    let user = await UserModel.findOrCreate(msg.from);
    const password = (match?.[2] || '').trim();

    if (password) {
      // Parol chatda qolib ketmasin
      bot.deleteMessage(chatId, msg.message_id).catch(() => {});

      if (tooManyTries(chatId)) {
        await bot.sendMessage(chatId, '⛔ Juda ko\'p urinish. 1 soatdan keyin qayta urinib ko\'ring.');
        return;
      }
      if (!samePassword(password, config.admin.password)) {
        failedTries.get(chatId).push(Date.now());
        await bot.sendMessage(chatId, '❌ Parol noto\'g\'ri. Admin panelga kiradigan parolni yozing.');
        return;
      }
      failedTries.delete(chatId);
      user = await UserModel.update(user.telegramId, { isAdmin: true });
    }

    if (!showAdminButton(chatId, user)) {
      await bot.sendMessage(
        chatId,
        '🔐 Admin bo\'lish uchun shunday yozing:\n<code>/admin PAROL</code>\n\n' +
          'PAROL — admin panelga kiradigan parol. Xabar darhol o\'chiriladi.',
        { parse_mode: 'HTML' }
      );
      return;
    }

    await setAdminMenuButton(chatId);
    await bot.sendMessage(
      chatId,
      (password ? '✅ Siz admin bo\'ldingiz.\n\n' : '') +
        '🛠 Admin panelga kirish uchun pastdagi tugmani bosing. ' +
        'Endi /start xabarida ham bu tugma chiqadi.',
      { reply_markup: adminButtonMarkup() }
    );
  },

  /** Boshqa har qanday xabar */
  async onFallback(bot, msg) {
    const user = await UserModel.findOrCreate(msg.from);
    await bot.sendMessage(msg.chat.id, t(user.lang).fallback, {
      reply_markup: mainKeyboard(user.lang, msg.chat.id, user),
    });
  },
};

module.exports = botController;
