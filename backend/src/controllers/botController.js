const config = require('../config/default');
const UserModel = require('../models/User');
const { t } = require('../utils/i18n');
const { isAdminChat, hasAdminUrl, setAdminMenuButton } = require('../core/bot');

/** Mini App https manzilida bo'lsagina web_app tugmasini qo'yish mumkin */
const isHttps = () => /^https:\/\//.test(config.miniappUrl);

/** Admin panelni ochadigan tugma — faqat ADMIN_CHAT_IDS dagi shaxsiy chatlarda */
const showAdminButton = (chatId) => chatId > 0 && isAdminChat(chatId) && hasAdminUrl();

/** Asosiy klaviatura */
function mainKeyboard(lang, chatId) {
  const L = t(lang);
  const rows = [];

  if (isHttps()) {
    rows.push([{ text: L.openShop, web_app: { url: config.miniappUrl } }]);
  }
  if (showAdminButton(chatId)) {
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
      reply_markup: mainKeyboard(user.lang, msg.chat.id),
    });

    // Admin uchun pastki "Menu" tugmasi ham admin panelni ochsin
    if (showAdminButton(msg.chat.id)) await setAdminMenuButton(msg.chat.id);

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
        reply_markup: mainKeyboard(lang, chatId),
      });
    }

    await bot.answerCallbackQuery(query.id).catch(() => {});
  },

  /** Telefon raqami yuborilganda */
  async onContact(bot, msg) {
    const user = await UserModel.findOrCreate(msg.from);
    await UserModel.update(user.telegramId, { phone: msg.contact.phone_number });
    await bot.sendMessage(
      msg.chat.id,
      user.lang === 'ru' ? '✅ Номер сохранён' : '✅ Raqamingiz saqlandi',
      { reply_markup: mainKeyboard(user.lang, msg.chat.id) }
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
            '<code>ADMIN_CHAT_IDS</code> sozlamasiga yozing.'),
      { parse_mode: 'HTML' }
    );
  },

  /** /admin — admin panel tugmasi (faqat ADMIN_CHAT_IDS dagilar uchun) */
  async onAdmin(bot, msg) {
    if (!showAdminButton(msg.chat.id)) {
      await bot.sendMessage(
        msg.chat.id,
        'Bu buyruq faqat adminlar uchun. Chat ID\'ingizni /id orqali bilib, ' +
          'serverdagi <code>ADMIN_CHAT_IDS</code> ga yozing.',
        { parse_mode: 'HTML' }
      );
      return;
    }
    await setAdminMenuButton(msg.chat.id);
    await bot.sendMessage(msg.chat.id, '🛠 Admin panelga kirish uchun pastdagi tugmani bosing.', {
      reply_markup: {
        inline_keyboard: [[{ text: '🛠 Admin panel', web_app: { url: config.adminUrl } }]],
      },
    });
  },

  /** Boshqa har qanday xabar */
  async onFallback(bot, msg) {
    const user = await UserModel.findOrCreate(msg.from);
    await bot.sendMessage(msg.chat.id, t(user.lang).fallback, {
      reply_markup: mainKeyboard(user.lang, msg.chat.id),
    });
  },
};

module.exports = botController;
