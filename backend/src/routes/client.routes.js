const express = require('express');
const cartController = require('../controllers/cartController');
const { telegramAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

// Ochiq yo'llar
router.get('/config', cartController.getConfig);
router.get('/products', cartController.getProducts);
router.get('/products/:id', cartController.getProduct);
router.get('/stories', cartController.getStories);

// Telegram imzosi talab qilinadigan yo'llar
router.post('/me', telegramAuth, cartController.me);
router.patch('/profile', telegramAuth, cartController.updateProfile);
router.post('/cart/calculate', telegramAuth, cartController.calculate);
router.post('/orders', telegramAuth, cartController.createOrder);
router.get('/orders/my', telegramAuth, cartController.myOrders);

module.exports = router;
