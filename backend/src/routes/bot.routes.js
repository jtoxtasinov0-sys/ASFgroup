const botController = require('../controllers/botController');

/** Bot handlerlarini ro'yxatdan o'tkazadi */
function registerBotHandlers(bot) {
  if (!bot) return;

  const guard = (fn) => async (...args) => {
    try {
      await fn(bot, ...args);
    } catch (err) {
      console.error('Bot handler xatosi:', err?.message);
    }
  };

  bot.onText(/^\/start/, guard(botController.onStart));
  bot.onText(/^\/help/, guard(botController.onStart));
  bot.onText(/^\/id(@\w+)?$/, guard(botController.onId));
  bot.onText(/^\/admin(@\w+)?(?:\s+([\s\S]+))?$/, guard(botController.onAdmin));
  bot.on('callback_query', guard(botController.onCallback));
  bot.on('contact', guard(botController.onContact));

  // Kartaga o'tkazma cheki: rasm yoki rasm-fayl (faqat shaxsiy chatda)
  const receipt = guard(botController.onReceipt);
  bot.on('photo', (msg) => msg.chat.type === 'private' && receipt(msg));
  bot.on('document', (msg) => msg.chat.type === 'private' && receipt(msg));

  bot.on('message', (msg) => {
    if (!msg.text || msg.text.startsWith('/') || msg.contact) return;
    if (msg.chat.type !== 'private') return; // guruhdagi yozishmalarga javob bermaymiz
    guard(botController.onFallback)(msg);
  });

  bot.setMyCommands([
    { command: 'start', description: "Do'konni ochish / Открыть магазин" },
    { command: 'admin', description: 'Admin panel' },
  ]).catch(() => {});

  console.log('✅ Bot handlerlari ulandi');
}

module.exports = registerBotHandlers;
