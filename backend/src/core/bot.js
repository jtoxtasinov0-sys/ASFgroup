const crypto = require('crypto');
const TelegramBot = require('node-telegram-bot-api');
const config = require('../config/default');

let bot = null;

/** Webhook'ni Telegram faqat https manzilga yuboradi */
const canUseWebhook = () => /^https:\/\//.test(config.publicUrl);

/**
 * Webhook yo'li tokendan hosil qilinadi: tashqaridan topib bo'lmaydi,
 * lekin tokenning o'zi manzilda ko'rinmaydi (loglarga tushib qolmasin).
 */
function webhookPath() {
  const hash = crypto.createHash('sha256').update(config.bot.token).digest('hex');
  return `/telegram/${hash.slice(0, 32)}`;
}

/** So'rovni chindan Telegram yuborganini tekshirish uchun maxfiy kalit */
function webhookSecret() {
  return crypto.createHash('sha256').update(`asf:${config.bot.token}`).digest('hex').slice(0, 48);
}

/** Bot instansiyasini yaratadi (hali yangilanishlarni qabul qilmaydi) */
function createBot() {
  if (bot) return bot;

  if (!config.bot.token) {
    console.warn('⚠️  BOT_TOKEN topilmadi — bot ishga tushmaydi');
    return null;
  }

  bot = new TelegramBot(config.bot.token, { polling: false });

  bot.on('polling_error', (err) => {
    const msg = err?.message || String(err);
    if (msg.includes('409')) {
      console.error('⚠️  Bot boshqa joyda ham ishlayapti (409 Conflict). Eski oynani yoping.');
    } else if (msg.includes('401')) {
      console.error('⚠️  BOT_TOKEN noto\'g\'ri (401). .env faylni tekshiring.');
    } else {
      console.error('Polling xatosi:', msg);
    }
  });

  return bot;
}

/* ----------------------------------------------------------
   Nega webhook?

   Render'ning bepul rejasida servis harakatsizlikdan keyin
   uxlaydi. Polling rejimida bot Telegram'ga o'zi murojaat
   qiladi — uxlagan servis esa hech qachon murojaat qilmaydi
   va bot butunlay javob bermay qoladi.

   Webhook'da teskarisi: Telegram xabarni serverga HTTP so'rov
   qilib yuboradi va o'sha so'rov servisni uyg'otadi.

   https manzil bo'lmasa (kompyuterda ishlash) — polling.
   ---------------------------------------------------------- */

/** PUBLIC_URL Render bergan manzildan farq qilsa — ogohlantiramiz */
function warnIfPublicUrlMismatch() {
  const render = process.env.RENDER_EXTERNAL_URL?.replace(/\/$/, '');
  const manual = process.env.PUBLIC_URL?.replace(/\/$/, '');
  if (render && manual && render !== manual) {
    console.warn(
      `⚠️  PUBLIC_URL (${manual}) Render manzilidan farq qiladi — ${render} ishlatildi.\n` +
      '   Render → Environment bo\'limida PUBLIC_URL ni tuzating yoki o\'chiring.'
    );
  }
}

/** Botni yangilanishlarni qabul qilishga tayyorlaydi */
async function startBot() {
  if (!bot) return;

  warnIfPublicUrlMismatch();

  // Mini App bot tashqarisida ochilsa, mijozni shu botga yo'naltiradi
  bot
    .getMe()
    .then((me) => { config.bot.username = me.username || ''; })
    .catch(() => {});

  if (canUseWebhook()) {
    try {
      await bot.setWebHook(`${config.publicUrl}${webhookPath()}`, {
        secret_token: webhookSecret(),
      });
      console.log(`✅ Bot webhook rejasida: ${config.publicUrl}`);

      const info = await bot.getWebHookInfo().catch(() => null);
      if (info?.last_error_message) {
        console.warn(`⚠️  Oxirgi webhook xatosi: ${info.last_error_message}`);
      }
      return;
    } catch (err) {
      console.error('Webhook o\'rnatilmadi:', err?.message, '— polling rejimiga o\'tamiz');
    }
  }

  // Webhook qo'yilgan bo'lsa, polling 409 beradi — avval uni olib tashlaymiz
  try {
    await bot.deleteWebHook();
  } catch (_) { /* webhook yo'q edi */ }

  await bot.startPolling();
  console.log('✅ Bot polling rejasida');
}

/** Telegram yuborgan yangilanishni botga uzatadi (Express handler) */
function handleWebhookUpdate(req, res) {
  if (req.get('X-Telegram-Bot-Api-Secret-Token') !== webhookSecret()) {
    return res.sendStatus(403);
  }
  bot?.processUpdate(req.body);
  return res.sendStatus(200);
}

function getBot() {
  return bot;
}

/** Mijozga xabar yuborish (xato bo'lsa server yiqilmaydi) */
async function safeSend(chatId, text, options = {}) {
  if (!bot) return null;
  try {
    return await bot.sendMessage(chatId, text, { parse_mode: 'HTML', ...options });
  } catch (err) {
    console.error(`Xabar yuborilmadi (${chatId}):`, err?.message);
    return null;
  }
}

/** Yangi buyurtma xabarini ADMIN_CHAT_IDS dagi barcha chatlarga yuboradi */
async function notifyAdmins(text, options = {}) {
  const ids = config.bot.adminChatIds;
  if (!ids.length) {
    console.warn('⚠️  ADMIN_CHAT_IDS qo\'yilmagan — yangi buyurtma xabari hech kimga yuborilmadi');
    return;
  }
  await Promise.all(ids.map((id) => safeSend(id, text, options)));
}

/** Shu chat ADMIN_CHAT_IDS ro'yxatidami */
const isAdminChat = (chatId) => config.bot.adminChatIds.includes(String(chatId));

/** Admin panel tugmasini qo'yish mumkinmi (Telegram faqat https ochadi) */
const hasAdminUrl = () => /^https:\/\//.test(config.adminUrl);

/**
 * Adminning shaxsiy chatida pastki "Menu" tugmasi admin panelni ochadi.
 * Guruh ID'lari (minus bilan) uchun qo'yilmaydi — u yerda Mini App ochilmaydi.
 */
async function setAdminMenuButton(chatId) {
  if (!bot || !hasAdminUrl() || Number(chatId) <= 0) return;
  try {
    await bot.setChatMenuButton({
      chat_id: Number(chatId),
      menu_button: { type: 'web_app', text: 'Admin panel', web_app: { url: config.adminUrl } },
    });
  } catch (err) {
    console.error(`Admin menyu tugmasi o'rnatilmadi (${chatId}):`, err?.message);
  }
}

/** Telegramdagi pastki "Menu" tugmasini Mini App'ga ulaydi */
async function setMenuButton() {
  if (!bot) return;
  const url = config.miniappUrl;
  if (!/^https:\/\//.test(url)) {
    console.warn(`⚠️  MINIAPP_URL https emas (${url}) — Menu tugmasi o'rnatilmadi. ngrok manzilini .env ga yozing.`);
    return;
  }
  try {
    await bot.setChatMenuButton({
      menu_button: { type: 'web_app', text: 'Do\'kon', web_app: { url } },
    });
    console.log(`✅ Telegram Menu tugmasi ulandi: ${url}`);
  } catch (err) {
    console.error('Menu tugmasi o\'rnatilmadi:', err?.message);
  }

  // Adminlarda bu tugma admin panelni ochadi
  const admins = config.bot.adminChatIds.filter((id) => Number(id) > 0);
  await Promise.all(admins.map(setAdminMenuButton));
  if (admins.length && hasAdminUrl()) {
    console.log(`✅ Admin panel tugmasi ${admins.length} ta adminga o'rnatildi: ${config.adminUrl}`);
  }
}

module.exports = {
  createBot,
  startBot,
  getBot,
  safeSend,
  notifyAdmins,
  setMenuButton,
  setAdminMenuButton,
  isAdminChat,
  hasAdminUrl,
  webhookPath,
  handleWebhookUpdate,
};
