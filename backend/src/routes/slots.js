const express = require('express');
const router = express.Router();
const slotsController = require('../controllers/slotsController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateSlot } = require('../middleware/validation');

// Public endpoints
router.get('/', slotsController.getSlots);

// Admin-only endpoints
router.post('/', authenticateToken, requireRole(['admin']), validateSlot, slotsController.createSlot);
router.put('/:id', authenticateToken, requireRole(['admin']), validateSlot, slotsController.updateSlot);
router.delete('/:id', authenticateToken, requireRole(['admin']), slotsController.deleteSlot);

module.exports = router;
