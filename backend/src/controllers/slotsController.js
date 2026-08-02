const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Helper to check if current request is from an admin
const checkIsAdmin = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return false;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.role === 'admin';
  } catch (err) {
    return false;
  }
};

// Create a new slot (Admin only)
const createSlot = async (req, res) => {
  const { service_id, start_time, end_time, status } = req.body;

  try {
    // 1. Verify service exists
    const serviceQuery = 'SELECT id, is_active FROM services WHERE id = $1';
    const serviceResult = await db.query(serviceQuery, [service_id]);

    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    if (!serviceResult.rows[0].is_active) {
      return res.status(400).json({ error: 'Cannot create availability slots for an inactive service.' });
    }

    // 2. Insert slot
    const insertQuery = `
      INSERT INTO availability_slots (service_id, start_time, end_time, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id, service_id, start_time, end_time, status
    `;
    const values = [service_id, start_time, end_time, status || 'available'];
    const result = await db.query(insertQuery, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create slot error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
};

// Get slots (Public can only see available, Admin can see all with filters)
const getSlots = async (req, res) => {
  const { service_id, start_time, end_time, status } = req.query;
  const isAdmin = checkIsAdmin(req);

  try {
    let query = `
      SELECT id, service_id, start_time, end_time, status
      FROM availability_slots
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    // Filters
    if (service_id) {
      query += ` AND service_id = $${paramIndex++}`;
      values.push(service_id);
    }

    if (start_time) {
      query += ` AND start_time >= $${paramIndex++}`;
      values.push(start_time);
    }

    if (end_time) {
      query += ` AND end_time <= $${paramIndex++}`;
      values.push(end_time);
    }

    // Status filtering based on role
    if (!isAdmin) {
      // Force public to only see available slots
      query += ` AND status = 'available'`;
    } else if (status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(status);
    }

    query += ' ORDER BY start_time ASC';

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Get slots error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
};

// Update slot (Admin only - reject if booked)
const updateSlot = async (req, res) => {
  const { id } = req.params;
  const { start_time, end_time, status } = req.body;

  try {
    // 1. Fetch current slot state
    const fetchQuery = 'SELECT id, status FROM availability_slots WHERE id = $1';
    const fetchResult = await db.query(fetchQuery, [id]);

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Availability slot not found.' });
    }

    const currentSlot = fetchResult.rows[0];

    // 2. Reject changes if currently booked
    if (currentSlot.status === 'booked') {
      return res.status(409).json({ error: 'Cannot modify a booked slot.' });
    }

    // 3. Perform update (and bump version)
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (start_time !== undefined) {
      updateFields.push(`start_time = $${paramIndex++}`);
      values.push(start_time);
    }
    if (end_time !== undefined) {
      updateFields.push(`end_time = $${paramIndex++}`);
      values.push(end_time);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    values.push(id);
    const updateQuery = `
      UPDATE availability_slots
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, service_id, start_time, end_time, status
    `;

    const result = await db.query(updateQuery, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update slot error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
};

// Delete slot (Admin only - reject if booked)
const deleteSlot = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Fetch current slot state
    const fetchQuery = 'SELECT id, status FROM availability_slots WHERE id = $1';
    const fetchResult = await db.query(fetchQuery, [id]);

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Availability slot not found.' });
    }

    const currentSlot = fetchResult.rows[0];

    // 2. Reject deletion if currently booked
    if (currentSlot.status === 'booked') {
      return res.status(409).json({ error: 'Cannot delete a booked slot.' });
    }

    // 3. Delete slot record
    const deleteQuery = 'DELETE FROM availability_slots WHERE id = $1';
    await db.query(deleteQuery, [id]);

    res.json({ message: 'Availability slot deleted successfully.', slot: { id } });
  } catch (error) {
    console.error('Delete slot error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
};

module.exports = {
  createSlot,
  getSlots,
  updateSlot,
  deleteSlot,
};
