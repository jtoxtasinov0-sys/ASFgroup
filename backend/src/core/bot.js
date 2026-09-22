const TelegramBot = require('node-telegram-bot-api');
const config = require('../config/default');

let bot = null;

/** Bot instansiyasini yaratadi (polling rejimida — localhost uchun qulay) */
function createBot() {
  if (bot) return bot;

  if (!config.bot.token) {
    console.warn('⚠️  BOT_TOKEN topilmadi — bot ishga tushmaydi');
    return null;
  }

  bot = new TelegramBot(config.bot.token, { polling: true });

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

module.exports = { createBot, getBot, safeSend, setMenuButton };
