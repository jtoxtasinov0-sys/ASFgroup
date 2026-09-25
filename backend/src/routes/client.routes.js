const express = require('express');
const cartController = require('../controllers/cartController');
const { telegramAuth } = require('../middlewares/auth.middleware');
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

// Telegram imzosi talab qilinadigan yo'llar
router.post('/me', telegramAuth, cartController.me);
router.patch('/profile', telegramAuth, cartController.updateProfile);
router.post('/orders', telegramAuth, cartController.createOrder);
router.get('/orders/my', telegramAuth, cartController.myOrders);
router.post('/orders/:id/receipt', telegramAuth, receiptUpload, cartController.uploadReceipt);

module.exports = router;
