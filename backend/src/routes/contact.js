const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { validateContact } = require('../middleware/validation');
const rateLimiter = require('../middleware/rateLimiter');

// Enforce tighter rate limiting for public contact forms (5 requests per 15 minutes)
const contactLimiter = rateLimiter(5, 15 * 60 * 1000);

router.post('/', contactLimiter, validateContact, contactController.saveMessage);

module.exports = router;
