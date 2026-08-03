require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const configuredOrigin = (process.env.FRONTEND_URL || 'http://localhost:3000').trim().replace(/\/$/, '');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.replace(/\/$/, '') === configuredOrigin) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));

// Webhook endpoint must parse raw buffer BEFORE express.json()
const paymentsController = require('./controllers/paymentsController');
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentsController.handleWebhook);

app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');
const slotsRoutes = require('./routes/slots');
const bookingsRoutes = require('./routes/bookings');
const contactRoutes = require('./routes/contact');
const paymentsRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'BookMySlot API' });
});

const setupDatabase = require('./scripts/setupDatabase');

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  setupDatabase().catch((err) => {
    console.error('Background database setup notice:', err.message);
  });
});
