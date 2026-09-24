const crypto = require('crypto');

/** Parollarni uzunligini ham oshkor qilmaydigan tarzda taqqoslaydi */
function samePassword(given, expected) {
  const a = crypto.createHash('sha256').update(String(given ?? '')).digest();
  const b = crypto.createHash('sha256').update(String(expected ?? '')).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = { samePassword };
