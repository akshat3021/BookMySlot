const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookingsController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateBooking, validateReschedule } = require('../middleware/validation');

// All booking routes require authentication
router.use(authenticateToken);

router.post('/', validateBooking, bookingsController.createBooking);
router.get('/', bookingsController.getBookings);
router.get('/:id', bookingsController.getBookingById);
router.post('/:id/cancel', bookingsController.cancelBooking);
router.post('/:id/reschedule', validateReschedule, bookingsController.rescheduleBooking);

// Admin-only status updates
router.put('/:id/status', requireRole(['admin']), bookingsController.updateBookingStatus);

module.exports = router;
