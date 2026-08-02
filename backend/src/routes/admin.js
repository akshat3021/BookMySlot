const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

// Session verification route for admin dashboard shell access
router.get('/verify', authenticateToken, requireRole(['admin']), (req, res) => {
  res.json({ verified: true, admin: req.user });
});

module.exports = router;
