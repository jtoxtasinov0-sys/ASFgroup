const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const config = require('../config/default');
const { ensureLocalFile, mimeOf } = require('../utils/upload');

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

/**
 * Rasm manzilini Telegram qabul qiladigan ko'rinishga keltiradi:
 * serverdagi fayl (diskda bo'lmasa — bazadagi zaxiradan tiklanadi) yoki https manzil.
 * Topilmasa — null.
 */
async function photoSource(image) {
  if (!image) return null;
  if (/^https:\/\//.test(image)) return { url: image };
  const file = await ensureLocalFile(image);
  return file ? { file } : null;
}

/** Telegram rasm ostidagi matn chegarasi (HTML teglarsiz hisoblanadi) */
const CAPTION_MAX = 1024;
const visibleLength = (html) =>
  html.replace(/<[^>]+>/g, '').replace(/&(lt|gt|amp);/g, ' ').length;

/** Bitta rasmni media ko'rinishiga keltiradi (fayl bo'lsa — oqim) */
async function photoMedia(image, fileIds) {
  if (fileIds.has(image)) return { media: fileIds.get(image) };
  const src = await photoSource(image);
  if (!src) return null;
  if (!src.file) return { media: src.url };
  return {
    media: fs.createReadStream(src.file),
    fileOptions: {
      filename: path.basename(src.file),
      contentType: mimeOf(src.file),
    },
  };
}

/** Yuborilgan xabar(lar)dagi rasm ID'larini eslab qoladi — keyingi adminga qayta yuklamaslik uchun */
function rememberFileIds(images, sent, fileIds) {
  const messages = Array.isArray(sent) ? sent : [sent];
  messages.forEach((m, n) => {
    const id = m?.photo?.[m.photo.length - 1]?.file_id;
    if (id && images[n]) fileIds.set(images[n], id);
  });
}

/**
 * Yangi buyurtma: mahsulot rasmi(lar)i va ostida BITTA to'liq buyurtma xabari.
 * Bir nechta mahsulot bo'lsa — albom. Matn juda uzun bo'lsa (1024 belgidan ko'p) —
 * rasmlar, keyin alohida matn. Rasm yuborilmasa — faqat matn.
 */
async function notifyAdminsWithPhotos(images, text, options = {}) {
  const ids = config.bot.adminChatIds;
  if (!ids.length) {
    console.warn('⚠️  ADMIN_CHAT_IDS qo\'yilmagan — yangi buyurtma xabari hech kimga yuborilmadi');
    return;
  }
  if (!bot) return;

  const unique = [...new Set(images.filter(Boolean))].slice(0, 10);
  const captionFits = visibleLength(text) <= CAPTION_MAX;
  const fileIds = new Map();

  for (const chatId of ids) {
    const list = (
      await Promise.all(unique.map(async (image) => ({ image, item: await photoMedia(image, fileIds) })))
    ).filter((p) => p.item);

    if (!list.length) {
      await safeSend(chatId, text, options);
      continue;
    }

    const caption = captionFits ? { caption: text, parse_mode: 'HTML' } : {};
    try {
      let sent;
      if (list.length === 1) {
        const { media, fileOptions } = list[0].item;
        sent = await bot.sendPhoto(chatId, media, caption, fileOptions);
      } else {
        const media = list.map((p, n) => ({ type: 'photo', ...p.item, ...(n === 0 ? caption : {}) }));
        sent = await bot.sendMediaGroup(chatId, media);
      }
      rememberFileIds(list.map((p) => p.image), sent, fileIds);
      if (!captionFits) await safeSend(chatId, text, options);
    } catch (err) {
      console.error(`Adminga buyurtma rasmi yuborilmadi (${chatId}):`, err?.message);
      await safeSend(chatId, text, options);
    }
  }
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

  // Adminlarda bu tugma admin panelni ochadi (ADMIN_CHAT_IDS + botda /admin qilganlar)
  let dbAdmins = [];
  try {
    // eslint-disable-next-line global-require
    const UserModel = require('../models/User');
    dbAdmins = (await UserModel.listAdmins()).map((u) => u.telegramId);
  } catch (_) { /* baza tayyor bo'lmasa — faqat ADMIN_CHAT_IDS */ }
  const admins = [...new Set([...config.bot.adminChatIds, ...dbAdmins])].filter((id) => Number(id) > 0);
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
  notifyAdminsWithPhotos,
  setMenuButton,
  setAdminMenuButton,
  isAdminChat,
  hasAdminUrl,
  webhookPath,
  handleWebhookUpdate,
};
