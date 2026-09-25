const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const config = require('../config/default');
const SettingModel = require('../models/Setting');
const OrderModel = require('../models/Order');
const UserModel = require('../models/User');
const { getBot, safeSend, isAdminChat } = require('../core/bot');
const { removeFile, UPLOAD_ROOT } = require('../utils/upload');
const { t, fmt, esc, paymentStatusLine } = require('../utils/i18n');

/* ==========================================================
   Kartaga o'tkazma (Uzcard / Humo) + chek rasmi.
   Chek kelsa — adminlarga botdan "Tasdiqlash / Rad etish"
   tugmalari bilan xabar boradi.
   ========================================================== */

const CARD_TYPES = { uzcard: 'Uzcard', humo: 'Humo' };

const onlyDigits = (v) => String(v || '').replace(/\D/g, '');

/** Karta raqamidan turini aniqlaydi: 9860 — Humo, 8600 / 5614 / 6262 — Uzcard */
function detectCardType(number) {
  const n = onlyDigits(number);
  if (n.startsWith('9860')) return 'humo';
  if (/^(8600|5614|6262)/.test(n)) return 'uzcard';
  return '';
}

const formatCard = (number) => onlyDigits(number).replace(/(\d{4})(?=\d)/g, '$1 ');

/** Karta sozlamalari: avval bazadan (Admin panel → Sozlamalar), bo'lmasa .env dan */
async function getPaymentSettings() {
  const saved = await SettingModel.getAll();
  const pick = (key) => (saved[key] !== undefined ? saved[key] : config.payment[key]);

  const cardNumber = onlyDigits(pick('cardNumber'));
  const cardType = CARD_TYPES[pick('cardType')] ? pick('cardType') : detectCardType(cardNumber);
  const cardHolder = String(pick('cardHolder') || '').trim();

  return {
    enabled: cardNumber.length === 16 && Boolean(CARD_TYPES[cardType]),
    cardNumber,
    cardType,
    cardHolder,
  };
}

/** Mijozga ko'rsatiladigan karta ma'lumoti */
async function getPublicPayment() {
  const p = await getPaymentSettings();
  if (!p.enabled) return { enabled: false };
  return {
    enabled: true,
    cardNumber: p.cardNumber,
    cardFormatted: formatCard(p.cardNumber),
    cardType: p.cardType,
    typeLabel: CARD_TYPES[p.cardType],
    cardHolder: p.cardHolder,
  };
}

/* ---------- Adminlar ---------- */

/** Chek xabari boradiganlar: ADMIN_CHAT_IDS + botda /admin PAROL qilganlar */
async function adminIds() {
  let dbAdmins = [];
  try {
    dbAdmins = (await UserModel.listAdmins()).map((u) => String(u.telegramId));
  } catch (_) { /* baza javob bermasa — faqat ADMIN_CHAT_IDS */ }
  return [...new Set([...config.bot.adminChatIds, ...dbAdmins])];
}

/** Shu Telegram foydalanuvchi to'lovni tasdiqlay oladimi */
async function canDecide(telegramId) {
  if (isAdminChat(telegramId)) return true;
  const user = await UserModel.findByTelegramId(telegramId);
  return Boolean(user?.isAdmin);
}

function adminCaption(order) {
  const u = order.user || {};
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return (
    `🧾 <b>Mijoz to'lov qildi — chekni tekshiring!</b>\n\n` +
    `Buyurtma: <b>#${order.id}</b>\n` +
    `💰 Summa: <b>${fmt(order.total)} so'm</b>\n` +
    `📦 ${order.totalQty} juft${order.isWholesale ? ' (optom)' : ''}\n\n` +
    `👤 ${esc(order.customerName)}${name && name !== order.customerName ? ` (${esc(name)})` : ''}\n` +
    `📞 ${esc(order.phone)}${u.username ? `  ·  @${esc(u.username)}` : ''}\n` +
    `📍 ${esc(order.region)}, ${esc(order.address)}\n\n` +
    `${paymentStatusLine(order)}\n` +
    `Pul kartaga tushganini tekshirib, to'lovni tasdiqlang yoki rad eting 👇`
  );
}

const decisionKeyboard = (orderId) => ({
  inline_keyboard: [
    [
      { text: '✅ Tasdiqlash', callback_data: `pay:ok:${orderId}` },
      { text: '❌ Rad etish', callback_data: `pay:no:${orderId}` },
    ],
  ],
});

/**
 * Chek rasmini barcha adminlarga yuboradi.
 * photo: { filePath } — Mini App'dan yuklangan fayl
 *        { fileId, kind: 'photo' | 'document' } — botga yuborilgan rasm
 */
async function notifyAdminsReceipt(order, photo) {
  const bot = getBot();
  const ids = await adminIds();
  if (!bot || !ids.length) {
    console.warn(`⚠️  #${order.id} cheki keldi, lekin adminlar yo'q (ADMIN_CHAT_IDS yoki /admin PAROL)`);
    return;
  }

  const options = {
    caption: adminCaption(order),
    parse_mode: 'HTML',
    reply_markup: decisionKeyboard(order.id),
  };

  let fileId = photo?.fileId || null;
  let asDocument = photo?.kind === 'document';

  for (const chatId of ids) {
    try {
      if (fileId) {
        await (asDocument
          ? bot.sendDocument(chatId, fileId, options)
          : bot.sendPhoto(chatId, fileId, options));
      } else if (photo?.filePath) {
        const sent = await bot.sendPhoto(chatId, fs.createReadStream(photo.filePath), options, {
          filename: path.basename(photo.filePath),
          contentType: 'image/jpeg',
        });
        // Qolgan adminlarga faylni qayta yuklamasdan, Telegram ID si orqali yuboramiz
        fileId = sent?.photo?.[sent.photo.length - 1]?.file_id || null;
        asDocument = false;
      } else {
        await bot.sendMessage(chatId, options.caption, options);
      }
    } catch (err) {
      console.error(`Adminga chek yuborilmadi (${chatId}):`, err?.message);
    }
  }
}

/* ---------- Asosiy amallar ---------- */

/** Buyurtmaga chek biriktiradi va adminlarni ogohlantiradi */
async function attachReceipt(order, receiptUrl, photo) {
  if (order.receiptUrl && order.receiptUrl !== receiptUrl) removeFile(order.receiptUrl);

  const updated = await OrderModel.update(order.id, {
    paymentStatus: 'pending',
    receiptUrl,
    receiptAt: new Date(),
  });

  await notifyAdminsReceipt(updated, photo);
  if (updated.user) safeSend(updated.user.telegramId, t(updated.user.lang).receiptReceived(updated));
  return updated;
}

/**
 * To'lovni tasdiqlaydi ('paid') yoki rad etadi ('rejected').
 * Tasdiqlansa, yangi buyurtma avtomatik "Tasdiqlandi" holatiga o'tadi.
 */
async function setPaymentStatus(orderId, paymentStatus) {
  const order = await OrderModel.findById(orderId);
  if (!order) return null;
  if (order.paymentStatus === paymentStatus) return order;

  const data = { paymentStatus };
  if (paymentStatus === 'paid' && order.status === 'new') data.status = 'confirmed';

  const updated = await OrderModel.update(order.id, data);

  if (updated.user) {
    const L = t(updated.user.lang);
    if (paymentStatus === 'paid') safeSend(updated.user.telegramId, L.paymentPaid(updated));
    if (paymentStatus === 'rejected') safeSend(updated.user.telegramId, L.paymentRejected(updated));
  }
  return updated;
}

/** Botga yuborilgan faylni uploads/receipts ga saqlaydi va URL qaytaradi */
async function saveTelegramFile(bot, fileId) {
  const dir = path.join(UPLOAD_ROOT, 'receipts');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const tmp = await bot.downloadFile(fileId, dir);
  const ext = (path.extname(tmp) || '.jpg').toLowerCase();
  const name = `custom-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  fs.renameSync(tmp, path.join(dir, name));
  return `/uploads/receipts/${name}`;
}

module.exports = {
  CARD_TYPES,
  onlyDigits,
  detectCardType,
  getPaymentSettings,
  getPublicPayment,
  canDecide,
  attachReceipt,
  setPaymentStatus,
  saveTelegramFile,
};
