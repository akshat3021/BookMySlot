const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/db');

// 1. Create Stripe Checkout Session (Ownership & Pending Checks)
const createCheckoutSession = async (req, res) => {
  const { booking_id } = req.body;
  const userId = req.user.id;

  try {
    // Retrieve booking and related service info
    const query = `
      SELECT b.id, b.customer_id, b.status, s.name as service_name, s.price
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      WHERE b.id = $1
    `;
    const result = await db.query(query, [booking_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const booking = result.rows[0];

    // Ownership check
    if (booking.customer_id !== userId) {
      return res.status(403).json({ error: 'Access denied: you do not own this booking.' });
    }

    // Status check
    if (booking.status !== 'pending_payment') {
      return res.status(400).json({ error: `Cannot pay for a booking with status: ${booking.status}` });
    }

    // Create Stripe Checkout Session (Redirects to Stripe test mode forms)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: booking.service_name,
              description: `Booking ID: ${booking.id}`,
            },
            unit_amount: Math.round(parseFloat(booking.price) * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?payment=success&booking_id=${booking.id}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?payment=cancel`,
      metadata: {
        booking_id: booking.id,
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
};

// 2. Webhook Handler (Signature Validation & Idempotency Check)
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify signature using the raw body
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const bookingId = session.metadata.booking_id;
    const stripePaymentIntentId = session.payment_intent;
    const amountPaid = session.amount_total / 100; // Convert cents to dollars

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Idempotency check 1: Check if booking is already confirmed
      const checkBookingQuery = 'SELECT status FROM bookings WHERE id = $1 FOR UPDATE';
      const checkBookingResult = await client.query(checkBookingQuery, [bookingId]);

      if (checkBookingResult.rows.length === 0) {
        await client.query('ROLLBACK');
        console.warn(`Webhook ignored: booking ${bookingId} not found.`);
        return res.json({ received: true, message: 'Booking not found' });
      }

      const booking = checkBookingResult.rows[0];
      if (booking.status === 'confirmed') {
        await client.query('ROLLBACK');
        console.log(`Webhook idempotency triggered: Booking ${bookingId} is already confirmed.`);
        return res.json({ received: true, message: 'Booking already confirmed' });
      }

      // Idempotency check 2: Check if payment intent is already registered
      const checkPaymentQuery = 'SELECT id FROM payments WHERE stripe_payment_intent_id = $1';
      const checkPaymentResult = await client.query(checkPaymentQuery, [stripePaymentIntentId]);

      if (checkPaymentResult.rows.length > 0) {
        await client.query('ROLLBACK');
        console.log(`Webhook idempotency triggered: Payment ${stripePaymentIntentId} already recorded.`);
        return res.json({ received: true, message: 'Payment record already exists' });
      }

      // Update Booking status to confirmed
      const updateBookingQuery = 'UPDATE bookings SET status = \'confirmed\' WHERE id = $1';
      await client.query(updateBookingQuery, [bookingId]);

      // Insert Payment record
      const insertPaymentQuery = `
        INSERT INTO payments (booking_id, stripe_payment_intent_id, amount, status)
        VALUES ($1, $2, $3, 'succeeded')
      `;
      await client.query(insertPaymentQuery, [bookingId, stripePaymentIntentId, amountPaid]);

      await client.query('COMMIT');
      console.log(`Webhook successfully processed: Booking ${bookingId} paid and confirmed.`);
      res.json({ received: true, processed: true });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Webhook database processing error:', error);
      res.status(500).json({ error: 'Database update failed.' });
    } finally {
      client.release();
    }
  } else {
    // Acknowledge other event types to Stripe
    res.json({ received: true });
  }
};

module.exports = {
  createCheckoutSession,
  handleWebhook,
};
