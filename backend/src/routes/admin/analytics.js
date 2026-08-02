const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Route for analytics stats data (Admin only)
router.get('/', authenticateToken, requireRole(['admin']), analyticsController.getAnalytics);

module.exports = router;
