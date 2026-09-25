const express = require('express');
const adminController = require('../controllers/adminController');
const { adminAuth } = require('../middlewares/auth.middleware');
const { makeUploader } = require('../utils/upload');

const router = express.Router();

const productUpload = makeUploader('products').array('files', 8);
const storyUpload = makeUploader('stories').array('files', 1);
const broadcastUpload = makeUploader('broadcast').array('files', 1);

// Kirish
router.post('/login', adminController.login);
router.post('/telegram-login', adminController.telegramLogin);

// Quyidagilarning barchasi token talab qiladi
router.use(adminAuth);

router.get('/me', adminController.me);
router.get('/dashboard', adminController.dashboard);

// Buyurtmalar
router.get('/orders', adminController.listOrders);
router.post('/orders/clear', adminController.clearOrders);
router.patch('/orders/:id/status', adminController.updateOrderStatus);
router.patch('/orders/:id/payment', adminController.updatePaymentStatus);
router.delete('/orders/:id', adminController.deleteOrder);

// Mahsulotlar (CRUD) — rasmlar galereyadan yuklanadi
router.get('/products', adminController.listProducts);
router.get('/products/:id', adminController.getProduct);
router.post('/products', productUpload, adminController.createProduct);
router.put('/products/:id', productUpload, adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

// Storylar
router.get('/stories', adminController.listStories);
router.post('/stories', storyUpload, adminController.createStory);
router.put('/stories/:id', storyUpload, adminController.updateStory);
router.delete('/stories/:id', adminController.deleteStory);

// Rassilka
router.get('/broadcast', adminController.broadcastInfo);
router.post('/broadcast', broadcastUpload, adminController.broadcast);

// Mijozlar
router.get('/users', adminController.listUsers);

// Sozlamalar (kartaga o'tkazma uchun karta)
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;
