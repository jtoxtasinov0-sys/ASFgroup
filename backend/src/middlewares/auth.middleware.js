const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/default');

/* ==========================================================
   1) MIJOZ — Telegram Mini App initData tekshiruvi
   ========================================================== */

/** Telegram imzosini tekshiradi (HMAC-SHA256) */
function verifyInitData(initData) {
  if (!initData || !config.bot.token) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(config.bot.token)
    .digest();

  const calculated = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (calculated !== hash) return null;

  try {
    return JSON.parse(params.get('user') || 'null');
  } catch (_) {
    return null;
  }
}

/**
 * Mijoz so'rovlarini himoyalaydi.
 * Telegram ichida — imzo tekshiriladi.
 * Brauzerda sinash uchun (NODE_ENV !== production) — demo foydalanuvchi beriladi.
 */
function telegramAuth(req, res, next) {
  const initData = req.headers['x-telegram-init-data'] || req.body?.initData || '';
  const user = verifyInitData(initData);

  if (user) {
    req.tgUser = user;
    return next();
  }

  if (process.env.NODE_ENV !== 'production') {
    req.tgUser = {
      id: 999000001,
      first_name: 'Demo',
      last_name: 'Mijoz',
      username: 'demo_user',
      language_code: 'uz',
    };
    return next();
  }

  return res.status(401).json({ ok: false, message: 'Telegram imzosi noto\'g\'ri' });
}

/* ==========================================================
   2) ADMIN — JWT tekshiruvi
   ========================================================== */

function signAdminToken(username) {
  return jwt.sign({ username, role: 'admin' }, config.admin.jwtSecret, {
    expiresIn: config.admin.tokenTtl,
  });
}

function adminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, message: 'Avtorizatsiya talab qilinadi' });
  }

  try {
    req.admin = jwt.verify(token, config.admin.jwtSecret);
    return next();
  } catch (_) {
    return res.status(401).json({ ok: false, message: 'Sessiya tugagan, qaytadan kiring' });
  }
}

module.exports = { telegramAuth, adminAuth, signAdminToken, verifyInitData };
