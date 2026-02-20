const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const {
  createPayPalOrder,
  executePayPalPayment,
  handlePayPalWebhook
} = require('../controllers/payment.controller');

const router = express.Router();

router.post('/create-order', protect, createPayPalOrder);
router.post('/execute', protect, executePayPalPayment);
router.post('/webhook/paypal', handlePayPalWebhook); // NO PROTECT - PayPal server calls this

module.exports = router;