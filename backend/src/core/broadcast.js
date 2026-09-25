const fs = require('fs');
const config = require('../config/default');
const UserModel = require('../models/User');
const { getBot } = require('./bot');

/*
 * Rassilka — barcha mijozlarga (yoki sinov uchun faqat adminlarga) xabar.
 * Telegram bir botdan soniyasiga ~30 ta xabarga ruxsat beradi — shuning
 * uchun navbat bilan, har xabar orasida kichik tanaffus bilan yuboriladi.
 * Bir vaqtda faqat bitta rassilka ishlaydi.
 */

const DELAY_MS = 45; // ~22 xabar / soniya

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let state = {
  running: false,
  total: 0,
  sent: 0,
  failed: 0,
  blocked: 0,
  testOnly: false,
  startedAt: null,
  finishedAt: null,
  preview: '',
};

const status = () => ({ ...state });

/** Kimlarga yuboriladi: hamma mijozlar yoki (sinov) faqat adminlar */
async function recipients(testOnly) {
  if (testOnly) {
    const dbAdmins = (await UserModel.listAdmins()).map((u) => u.telegramId);
    return [...new Set([...config.bot.adminChatIds, ...dbAdmins])].filter((id) => Number(id) > 0);
  }
  return UserModel.allTelegramIds();
}

/** Bitta xabar; 429 (juda tez) bo'lsa kutib, bir marta qayta urinadi */
async function sendOne(bot, chatId, payload, attempt = 0) {
  try {
    if (payload.photo) {
      return await bot.sendPhoto(chatId, payload.photo(), {
        caption: payload.text || undefined,
        reply_markup: payload.markup,
      });
    }
    return await bot.sendMessage(chatId, payload.text, {
      reply_markup: payload.markup,
      disable_web_page_preview: false,
    });
  } catch (err) {
    const code = err?.response?.statusCode;
    const retry = err?.response?.body?.parameters?.retry_after;
    if (code === 429 && attempt === 0) {
      await sleep((Number(retry) || 1) * 1000 + 500);
      return sendOne(bot, chatId, payload, 1);
    }
    throw err;
  }
}

/**
 * Rassilkani fonda boshlaydi.
 * @param {{ text: string, photoPath?: string, withButton?: boolean, testOnly?: boolean }} opts
 */
async function startBroadcast({ text, photoPath, withButton, testOnly }) {
  const bot = getBot();
  if (!bot) throw new Error('Bot ishlamayapti (BOT_TOKEN yo\'q)');
  if (state.running) throw new Error('Oldingi rassilka hali tugamadi');

  const ids = await recipients(testOnly);
  if (!ids.length) {
    throw new Error(testOnly ? 'Adminlar topilmadi (botda /admin PAROL qiling)' : 'Mijozlar yo\'q');
  }

  const markup =
    withButton && /^https:\/\//.test(config.miniappUrl)
      ? { inline_keyboard: [[{ text: '🛍 Do\'konni ochish', web_app: { url: config.miniappUrl } }]] }
      : undefined;

  // Rasm bir marta yuklanadi, keyingilarga Telegram bergan file_id ishlatiladi
  let fileId = null;
  const photo = photoPath ? () => fileId || fs.createReadStream(photoPath) : null;

  state = {
    running: true,
    total: ids.length,
    sent: 0,
    failed: 0,
    blocked: 0,
    testOnly: Boolean(testOnly),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    preview: String(text || '').slice(0, 120),
  };

  (async () => {
    for (const chatId of ids) {
      try {
        const msg = await sendOne(bot, chatId, { text, photo, markup });
        if (photo && !fileId && msg?.photo?.length) fileId = msg.photo[msg.photo.length - 1].file_id;
        state.sent += 1;
      } catch (err) {
        // 403 — mijoz botni bloklagan yoki o'chirib yuborgan
        if (err?.response?.statusCode === 403) state.blocked += 1;
        else state.failed += 1;
      }
      await sleep(DELAY_MS);
    }
    state.running = false;
    state.finishedAt = new Date().toISOString();
    if (photoPath) fs.promises.unlink(photoPath).catch(() => {});
    console.log(
      `📣 Rassilka tugadi: ${state.sent} yuborildi, ${state.blocked} bloklagan, ${state.failed} xato`
    );
  })().catch((err) => {
    state.running = false;
    state.finishedAt = new Date().toISOString();
    console.error('Rassilka xatosi:', err?.message);
  });

  return status();
}

module.exports = { startBroadcast, broadcastStatus: status };
