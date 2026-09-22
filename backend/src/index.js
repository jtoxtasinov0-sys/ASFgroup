const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const config = require('./config/default');
const { connectDatabase, disconnectDatabase } = require('./database/connection');
const { createBot, setMenuButton } = require('./core/bot');
const registerBotHandlers = require('./routes/bot.routes');
const clientRoutes = require('./routes/client.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Rasmlar: http://localhost:5000/uploads/products/asf-101.jpg
app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '7d' })
);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'ASF GROUP API', slogan: config.company.slogan });
});

app.use('/api/admin', adminRoutes);
app.use('/api', clientRoutes);

/* ----------------------------------------------------------
   Mini App: `cd miniapp && npm run build` qilingach, tayyor
   ilova shu serverdan beriladi. Shunda ngrok'ga faqat bitta
   port (5000) kerak bo'ladi — Telegram uchun eng qulay yo'l.
   ---------------------------------------------------------- */
const MINIAPP_DIST = path.join(__dirname, '..', '..', 'miniapp', 'dist');
const hasMiniapp = fs.existsSync(path.join(MINIAPP_DIST, 'index.html'));

if (hasMiniapp) {
  app.use(express.static(MINIAPP_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(MINIAPP_DIST, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({
      ok: true,
      name: 'ASF GROUP API',
      slogan: config.company.slogan,
      hint: 'Mini App hali build qilinmagan: cd miniapp && npm run build',
    });
  });
}

// 404
app.use((_req, res) => res.status(404).json({ ok: false, message: 'Yol topilmadi' }));

// Xatoliklar
app.use((err, _req, res, _next) => {
  console.error('❌', err?.message);
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 400 : 500);
  res.status(status).json({ ok: false, message: err?.message || 'Server xatosi' });
});

/* ---------- Ishga tushirish ---------- */

async function start() {
  console.log('\n══════════════════════════════════════');
  console.log('   ASF GROUP  —  SIFAT VA ISHONCH');
  console.log('══════════════════════════════════════\n');

  await connectDatabase();

  const bot = createBot();
  if (bot) {
    registerBotHandlers(bot);
    await setMenuButton();
  }

  app.listen(config.port, () => {
    console.log(`✅ Server: http://localhost:${config.port}`);
    console.log(`📱 Mini App: ${config.miniappUrl}`);
    console.log(`🛠  Admin API: http://localhost:${config.port}/api/admin\n`);
  });
}

start().catch((err) => {
  console.error('\n❌ Server ishga tushmadi:', err?.message);
  if (String(err?.message).includes('DATABASE_URL') || err?.errorCode === 'P1001') {
    console.error('👉 backend/.env faylidagi DATABASE_URL ni tekshiring.\n');
  }
  process.exit(1);
});

const shutdown = async () => {
  await disconnectDatabase();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
