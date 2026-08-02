const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/paymentsController');
const { authenticateToken } = require('../middleware/auth');

// 1. Create Checkout Session (requires user authentication)
router.post('/checkout-session', authenticateToken, paymentsController.createCheckoutSession);

module.exports = router;
