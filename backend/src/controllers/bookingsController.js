const db = require('../config/db');

// 1. Create a booking (Atomic Slot Lock + Service Mismatch Check)
const createBooking = async (req, res) => {
  const { slot_id, service_id } = req.body;
  const customer_id = req.user.id;

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Fetch and lock the slot to prevent race conditions
    const slotQuery = 'SELECT service_id, status FROM availability_slots WHERE id = $1 FOR UPDATE';
    const slotResult = await client.query(slotQuery, [slot_id]);

    if (slotResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Availability slot not found.' });
    }

    const slot = slotResult.rows[0];

    // Check availability
    if (slot.status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This time slot is no longer available.' });
    }

    // Verify service ID match
    if (slot.service_id !== service_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Service ID mismatch. The slot belongs to a different service.' });
    }

    // Update slot status to booked
    const updateSlotQuery = 'UPDATE availability_slots SET status = \'booked\' WHERE id = $1';
    await client.query(updateSlotQuery, [slot_id]);

    // Insert booking
    const insertBookingQuery = `
      INSERT INTO bookings (customer_id, service_id, slot_id, status)
      VALUES ($1, $2, $3, 'pending_payment')
      RETURNING id, customer_id, service_id, slot_id, status, created_at
    `;
    const bookingResult = await client.query(insertBookingQuery, [customer_id, slot.service_id, slot_id]);

    await client.query('COMMIT');
    res.status(201).json(bookingResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  } finally {
    client.release();
  }
};

// 2. Get bookings (Customers see only theirs, Admin sees all with search & filters)
const getBookings = async (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  const { status, start_date, end_date, search } = req.query;

  try {
    let query = `
      SELECT b.id, b.customer_id, b.service_id, b.slot_id, b.status, b.created_at,
             s.name as service_name, s.duration_minutes, s.price,
             slots.start_time, slots.end_time,
             u.first_name as customer_first_name, u.last_name as customer_last_name, u.email as customer_email
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN availability_slots slots ON b.slot_id = slots.id
      JOIN users u ON b.customer_id = u.id
    `;
    const values = [];
    let paramIndex = 1;
    const filterClauses = [];

    if (!isAdmin) {
      filterClauses.push(`b.customer_id = $${paramIndex++}`);
      values.push(userId);
    } else {
      // Admin filter queries
      if (status) {
        filterClauses.push(`b.status = $${paramIndex++}`);
        values.push(status);
      }
      if (start_date) {
        filterClauses.push(`slots.start_time >= $${paramIndex++}`);
        values.push(start_date);
      }
      if (end_date) {
        filterClauses.push(`slots.start_time <= $${paramIndex++}`);
        values.push(end_date);
      }
      if (search && search.trim()) {
        const searchPattern = `%${search.trim()}%`;
        filterClauses.push(`(u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
        values.push(searchPattern);
        paramIndex++;
      }
    }

    if (filterClauses.length > 0) {
      query += ' WHERE ' + filterClauses.join(' AND ');
    }

    query += ' ORDER BY slots.start_time DESC';

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
};

// 3. Get booking by ID
const getBookingById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  try {
    const query = `
      SELECT b.id, b.customer_id, b.service_id, b.slot_id, b.status, b.created_at,
             s.name as service_name, s.duration_minutes, s.price,
             slots.start_time, slots.end_time
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN availability_slots slots ON b.slot_id = slots.id
      WHERE b.id = $1
    `;
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const booking = result.rows[0];

    // Access check: only admin or the specific customer who made the booking
    if (!isAdmin && booking.customer_id !== userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
};

// 4. Update booking status (Admin only - confirmed -> completed transition only)
const updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'completed') {
    return res.status(400).json({
      error: 'Only the transition to "completed" status can be updated manually. Use POST /api/bookings/:id/cancel to cancel bookings.'
    });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Fetch current status and lock row
    const getBookingQuery = 'SELECT status FROM bookings WHERE id = $1 FOR UPDATE';
    const bookingResult = await client.query(getBookingQuery, [id]);

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const currentBooking = bookingResult.rows[0];

    if (currentBooking.status !== 'confirmed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Only confirmed bookings can be marked completed.' });
    }

    const updateQuery = `
      UPDATE bookings
      SET status = 'completed'
      WHERE id = $1
      RETURNING id, customer_id, service_id, slot_id, status, created_at
    `;
    const updateResult = await client.query(updateQuery, [id]);

    await client.query('COMMIT');
    res.json(updateResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  } finally {
    client.release();
  }
};

// 5. Cancel booking (Reverts Slot Status to Available in Same Transaction)
const cancelBooking = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Retrieve booking and lock the row, joining start_time
    const getBookingQuery = `
      SELECT b.customer_id, b.slot_id, b.status, s.start_time
      FROM bookings b
      JOIN availability_slots s ON b.slot_id = s.id
      WHERE b.id = $1 FOR UPDATE
    `;
    const bookingResult = await client.query(getBookingQuery, [id]);

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const booking = bookingResult.rows[0];

    // Access check: customers can only cancel their own
    if (!isAdmin && booking.customer_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (booking.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Booking is already cancelled.' });
    }

    // 24-hour rule check for confirmed bookings (admins bypass)
    if (!isAdmin && booking.status === 'confirmed') {
      const startTime = new Date(booking.start_time);
      const hoursRemaining = (startTime - new Date()) / (1000 * 60 * 60);
      if (hoursRemaining < 24) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Confirmed bookings can only be cancelled up to 24 hours in advance.' });
      }
    }

    // Update booking status
    const updateBookingQuery = 'UPDATE bookings SET status = \'cancelled\' WHERE id = $1';
    await client.query(updateBookingQuery, [id]);

    // Revert availability slot
    const updateSlotQuery = 'UPDATE availability_slots SET status = \'available\' WHERE id = $1';
    await client.query(updateSlotQuery, [booking.slot_id]);

    await client.query('COMMIT');
    res.json({ message: 'Booking cancelled successfully and slot is now available.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  } finally {
    client.release();
  }
};

// 6. Reschedule booking (24h rule check, atomic slot swapping)
const rescheduleBooking = async (req, res) => {
  const { id } = req.params;
  const { new_slot_id } = req.body;
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!new_slot_id) {
    return res.status(400).json({ error: 'New slot ID is required.' });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Lock and retrieve booking with old slot start_time
    const getBookingQuery = `
      SELECT b.customer_id, b.slot_id, b.status, s.start_time, s.service_id
      FROM bookings b
      JOIN availability_slots s ON b.slot_id = s.id
      WHERE b.id = $1 FOR UPDATE
    `;
    const bookingResult = await client.query(getBookingQuery, [id]);

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const booking = bookingResult.rows[0];

    // Access check
    if (!isAdmin && booking.customer_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (booking.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot reschedule a cancelled booking.' });
    }

    // 24-hour limit check (only on confirmed bookings, admin exempt)
    if (!isAdmin && booking.status === 'confirmed') {
      const startTime = new Date(booking.start_time);
      const hoursRemaining = (startTime - new Date()) / (1000 * 60 * 60);
      if (hoursRemaining < 24) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Confirmed bookings can only be rescheduled up to 24 hours in advance.' });
      }
    }

    // Lock and check the NEW slot atomically
    const getNewSlotQuery = 'SELECT service_id, status FROM availability_slots WHERE id = $1 FOR UPDATE';
    const newSlotResult = await client.query(getNewSlotQuery, [new_slot_id]);

    if (newSlotResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'New availability slot not found.' });
    }

    const newSlot = newSlotResult.rows[0];

    // Verify availability
    if (newSlot.status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'The requested new slot is no longer available.' });
    }

    // Verify same service
    if (newSlot.service_id !== booking.service_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot reschedule to a slot belonging to a different service.' });
    }

    // Free the old slot
    const freeOldSlotQuery = 'UPDATE availability_slots SET status = \'available\' WHERE id = $1';
    await client.query(freeOldSlotQuery, [booking.slot_id]);

    // Lock the new slot
    const lockNewSlotQuery = 'UPDATE availability_slots SET status = \'booked\' WHERE id = $1';
    await client.query(lockNewSlotQuery, [new_slot_id]);

    // Update booking slot_id mapping
    const updateBookingQuery = 'UPDATE bookings SET slot_id = $1 WHERE id = $2 RETURNING id, slot_id, status';
    const result = await client.query(updateBookingQuery, [new_slot_id, id]);

    await client.query('COMMIT');
    res.json({ message: 'Booking rescheduled successfully.', booking: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reschedule booking error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  } finally {
    client.release();
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  rescheduleBooking,
};
