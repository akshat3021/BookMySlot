const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateSignup, validateLogin } = require('../middleware/validation');
const rateLimiter = require('../middleware/rateLimiter');

// Rate limit auth routes to 30 requests per 15 minutes per IP
const authLimiter = rateLimiter(30, 15 * 60 * 1000);

router.post('/signup', authLimiter, validateSignup, authController.signup);
router.post('/login', authLimiter, validateLogin, authController.login);

module.exports = router;
