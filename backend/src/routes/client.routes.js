const express = require('express');
const cartController = require('../controllers/cartController');
const { telegramAuth, signWebToken } =require('../middlewares/auth.middleware');
const { makeUploader } = require('../utils/upload');

const router = express.Router();

const receiptUpload = makeUploader('receipts').single('file');

// Ochiq yo'llar
router.get('/config', cartController.getConfig);
router.get('/products', cartController.getProducts);
router.get('/products/:id', cartController.getProduct);
router.get('/stories', cartController.getStories);
// Faqat bazadagi narxlar bilan hisoblaydi — shaxsiy ma'lumot yo'q
router.post('/cart/calculate', cartController.calculate);
// Brauzerda (Telegramsiz) ochilganda mijozga veb-token beriladi
router.post('/web/session', (_req, res) => res.json({ ok: true, data: { token: signWebToken() } }));

// Telegram imzosi yoki veb-token talab qilinadigan yo'llar
router.post('/me', telegramAuth, cartController.me);
router.patch('/profile', telegramAuth, cartController.updateProfile);
router.post('/orders', telegramAuth, cartController.createOrder);
router.get('/orders/my', telegramAuth, cartController.myOrders);
router.post('/orders/:id/receipt', telegramAuth, receiptUpload, cartController.uploadReceipt);

module.exports = router;
