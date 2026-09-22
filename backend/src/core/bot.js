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

/** Botni yangilanishlarni qabul qilishga tayyorlaydi */
async function startBot() {
  if (!bot) return;

  if (canUseWebhook()) {
    try {
      await bot.setWebHook(`${config.publicUrl}${webhookPath()}`, {
        secret_token: webhookSecret(),
      });
      console.log(`✅ Bot webhook rejasida: ${config.publicUrl}`);
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
}

module.exports = {
  createBot,
  startBot,
  getBot,
  safeSend,
  setMenuButton,
  webhookPath,
  handleWebhookUpdate,
};
