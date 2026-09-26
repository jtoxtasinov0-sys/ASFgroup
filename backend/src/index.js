const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const config = require('./config/default');
const { connectDatabase, disconnectDatabase } = require('./database/connection');
const { ensureLocalFile } = require('./utils/upload');
const {
  createBot,
  startBot,
  setMenuButton,
  webhookPath,
  handleWebhookUpdate,
} = require('./core/bot');
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
// Diskda yo'q bo'lsa (Render deploy'dan keyin) — bazadagi zaxiradan tiklaymiz
app.get('/uploads/*', async (req, res) => {
  const file = await ensureLocalFile(decodeURIComponent(req.path));
  if (!file) return res.sendStatus(404);
  res.set('Cache-Control', 'public, max-age=604800');
  return res.sendFile(file);
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'ASF GROUP API', slogan: config.company.slogan });
});

// Telegram yangilanishlari shu yo'l orqali keladi (webhook rejasida)
if (config.bot.token) {
  app.post(webhookPath(), handleWebhookUpdate);
}

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

/* ----------------------------------------------------------
   Render'ning bepul rejasida servis 15 daqiqa so'rovsiz qolsa
   uxlaydi va keyingi ochilish 30-60 soniya kutadi. Har 10
   daqiqada o'zimizga so'rov yuborib, servisni uyg'oq tutamiz.
   ---------------------------------------------------------- */
const KEEP_ALIVE_MS = 10 * 60 * 1000;

function startKeepAlive() {
  const base = process.env.RENDER_EXTERNAL_URL;
  if (!base) return; // faqat Render'da kerak
  const url = `${base.replace(/\/$/, '')}/api/health`;
  setInterval(() => {
    fetch(url).catch(() => { /* keyingi safar yana urinadi */ });
  }, KEEP_ALIVE_MS).unref();
  console.log('⏰ Keep-alive yoqildi (har 10 daqiqada)');
}

/* ---------- Ishga tushirish ---------- */

async function start() {
  console.log('\n══════════════════════════════════════');
  console.log('   ASF GROUP  —  SIFAT VA ISHONCH');
  console.log('══════════════════════════════════════\n');

  await connectDatabase();

  const bot = createBot();
  if (bot) registerBotHandlers(bot);

  // Bot server tinglay boshlagandan keyin ulanadi — aks holda webhook
  // yangilanishlari hali tayyor bo'lmagan serverga kelib qolishi mumkin
  app.listen(config.port, () => {
    console.log(`✅ Server: http://localhost:${config.port}`);
    console.log(`📱 Mini App: ${config.miniappUrl}`);
    console.log(`🛠  Admin API: http://localhost:${config.port}/api/admin\n`);

    startKeepAlive();

    if (!bot) return;
    startBot()
      .then(setMenuButton)
      .catch((err) => console.error('Bot ishga tushmadi:', err?.message));
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
