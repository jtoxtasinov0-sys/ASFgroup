const crypto = require('crypto');

const config = require('../config/default');
const OrderModel = require('../models/Order');
const { notifyAdmins, safeSend } = require('../core/bot');
const { t, fmt, esc } = require('../utils/i18n');

/* ==========================================================
   Click SHOP API — to'lovni avtomatik tasdiqlash.
   Hujjat: https://docs.click.uz/click-api-request/

   1) Mijoz my.click.uz sahifasida to'laydi
   2) Click serverimizga PREPARE so'rovi yuboradi — buyurtma va summani tekshiramiz
   3) Pul yechilgach COMPLETE so'rovi keladi — buyurtma "To'landi" bo'ladi,
      mijoz va adminlarga botdan xabar boradi, Mini App natijani darhol ko'rsatadi
   ========================================================== */

const E = {
  OK: [0, 'Success'],
  SIGN: [-1, 'SIGN CHECK FAILED!'],
  AMOUNT: [-2, 'Incorrect parameter amount'],
  ACTION: [-3, 'Action not found'],
  PAID: [-4, 'Already paid'],
  ORDER: [-5, 'User does not exist'],
  TRANS: [-6, 'Transaction does not exist'],
  UPDATE: [-7, 'Failed to update user'],
  REQUEST: [-8, 'Error in request from click'],
  CANCELLED: [-9, 'Transaction cancelled'],
};

const isEnabled = () => Boolean(config.click.serviceId && config.click.merchantId);
const isAutoConfirm = () => Boolean(isEnabled() && config.click.secretKey);

/**
 * To'lov sahifalari:
 *  app  — Click ilovasi orqali (telefonda ilova ochiladi, kompyuterda QR-kod)
 *  card — Uzcard / Humo karta raqami va SMS-kod bilan (ilovasiz)
 */
function payUrls(order, returnUrl) {
  if (!isEnabled()) return null;
  const base = {
    service_id: config.click.serviceId,
    merchant_id: config.click.merchantId,
    amount: String(order.total),
    transaction_param: String(order.id),
  };
  if (returnUrl) base.return_url = returnUrl;
  const url = (extra) => `https://my.click.uz/services/pay?${new URLSearchParams({ ...base, ...extra })}`;
  return { app: url({}), card: url({ card_type: 'uzcard' }) };
}

const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

function signOk(p, withPrepareId) {
  const parts = [p.click_trans_id, p.service_id, config.click.secretKey, p.merchant_trans_id];
  if (withPrepareId) parts.push(p.merchant_prepare_id);
  parts.push(p.amount, p.action, p.sign_time);
  const expected = md5(parts.map((v) => (v === undefined ? '' : String(v))).join(''));
  const got = String(p.sign_string || '').toLowerCase();
  return got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

const reply = (p, [error, error_note], extra = {}) => ({
  click_trans_id: p.click_trans_id,
  merchant_trans_id: p.merchant_trans_id,
  ...extra,
  error,
  error_note,
});

/** Umumiy tekshiruvlar. Xato bo'lsa — javob kodi, bo'lmasa buyurtma */
async function check(p, withPrepareId, expectedAction) {
  const required = ['click_trans_id', 'service_id', 'merchant_trans_id', 'amount', 'action', 'sign_time', 'sign_string'];
  if (withPrepareId) required.push('merchant_prepare_id');
  if (required.some((k) => p[k] === undefined || p[k] === '')) return { err: E.REQUEST };
  if (!config.click.secretKey || !signOk(p, withPrepareId)) return { err: E.SIGN };
  if (String(p.service_id) !== String(config.click.serviceId)) return { err: E.REQUEST };
  if (String(p.action) !== String(expectedAction)) return { err: E.ACTION };

  const order = /^\d+$/.test(String(p.merchant_trans_id))
    ? await OrderModel.findById(p.merchant_trans_id)
    : null;
  if (!order) return { err: E.ORDER };
  if (Math.abs(Number(p.amount) - order.total) > 0.01) return { err: E.AMOUNT };
  return { order };
}

/** 1-bosqich: Click to'lovni boshlashdan oldin so'raydi */
async function prepare(p) {
  const { err, order } = await check(p, false, 0);
  if (err) return reply(p, err);
  if (order.paymentStatus === 'paid') return reply(p, E.PAID);
  if (order.status === 'cancelled') return reply(p, E.CANCELLED);
  // merchant_prepare_id sifatida buyurtma raqamining o'zi ishlatiladi
  return reply(p, E.OK, { merchant_prepare_id: order.id });
}

/** 2-bosqich: pul yechildi (yoki Click to'lovni bekor qildi) */
async function complete(p) {
  const { err, order } = await check(p, true, 1);
  if (err) return reply(p, err);
  if (String(p.merchant_prepare_id) !== String(order.id)) return reply(p, E.TRANS);

  const transId = String(p.click_trans_id);
  if (order.paymentStatus === 'paid') {
    // Click javobni olmay qolib qayta so'rasa — shu tranzaksiya uchun yana "muvaffaqiyat"
    return order.clickTransId === transId
      ? reply(p, E.OK, { merchant_confirm_id: order.id })
      : reply(p, E.PAID);
  }
  // Click tomonda xato (mablag' yetmadi, bekor qilindi va h.k.) — to'lov bo'lmadi
  if (Number(p.error) < 0) return reply(p, E.CANCELLED);
  if (order.status === 'cancelled') return reply(p, E.CANCELLED);

  let updated;
  try {
    updated = await OrderModel.update(order.id, {
      paymentMethod: 'click',
      paymentStatus: 'paid',
      clickTransId: transId,
      paidAt: new Date(),
      ...(order.status === 'new' ? { status: 'confirmed' } : {}),
    });
  } catch (e) {
    console.error('Click complete: buyurtma yangilanmadi', e?.message);
    return reply(p, E.UPDATE);
  }

  if (updated.user) safeSend(updated.user.telegramId, t(updated.user.lang).paymentPaid(updated));
  notifyAdmins(
    `💳 <b>Click orqali to'landi!</b>\n\n` +
      `Buyurtma: <b>#${updated.id}</b>\n` +
      `💰 Summa: <b>${fmt(updated.total)} so'm</b>\n` +
      `👤 ${esc(updated.customerName)} · 📞 ${esc(updated.phone)}\n` +
      `🧾 Click tranzaksiya: <code>${esc(transId)}</code>\n\n` +
      `Buyurtma avtomatik "Tasdiqlandi" holatiga o'tdi ✅`,
    { parse_mode: 'HTML' }
  ).catch(() => {});

  return reply(p, E.OK, { merchant_confirm_id: updated.id });
}

module.exports = { isEnabled, isAutoConfirm, payUrls, prepare, complete, signOk };
