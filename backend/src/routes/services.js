const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/servicesController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateService } = require('../middleware/validation');

// Public endpoints
router.get('/', servicesController.getServices);
router.get('/:id', servicesController.getServiceById);

// Admin-only endpoints
router.post('/', authenticateToken, requireRole(['admin']), validateService, servicesController.createService);
router.put('/:id', authenticateToken, requireRole(['admin']), validateService, servicesController.updateService);
router.delete('/:id', authenticateToken, requireRole(['admin']), servicesController.deleteService);

module.exports = router;
