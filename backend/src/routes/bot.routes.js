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
  bot.on('callback_query', guard(botController.onCallback));
  bot.on('contact', guard(botController.onContact));

  bot.on('message', (msg) => {
    if (!msg.text || msg.text.startsWith('/') || msg.contact) return;
    guard(botController.onFallback)(msg);
  });

  bot.setMyCommands([
    { command: 'start', description: "Do'konni ochish / Открыть магазин" },
  ]).catch(() => {});

  console.log('✅ Bot handlerlari ulandi');
}

module.exports = registerBotHandlers;
