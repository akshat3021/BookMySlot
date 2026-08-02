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

// Create a new service (Admin only)
const createService = async (req, res) => {
  const { name, description, duration_minutes, price } = req.body;

  try {
    const query = `
      INSERT INTO services (name, description, duration_minutes, price)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, description, duration_minutes, price, is_active, created_at
    `;
    const values = [name, description, duration_minutes, price];
    const result = await db.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
};

// Get list of services (Public read, admin optionally sees inactive)
const getServices = async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const isAdmin = checkIsAdmin(req);

  try {
    let query = 'SELECT id, name, description, duration_minutes, price, is_active, created_at FROM services';
    const values = [];

    if (!isAdmin || !includeInactive) {
      query += ' WHERE is_active = TRUE';
    }

    query += ' ORDER BY name ASC';
    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
};

// Get service by ID (Public read for active, admin can see inactive)
const getServiceById = async (req, res) => {
  const { id } = req.params;
  const isAdmin = checkIsAdmin(req);

  try {
    const query = 'SELECT id, name, description, duration_minutes, price, is_active, created_at FROM services WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    const service = result.rows[0];

    // If service is inactive and requester is not admin, deny access
    if (!service.is_active && !isAdmin) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    res.json(service);
  } catch (error) {
    console.error('Get service by ID error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
};

// Update service (Admin only)
const updateService = async (req, res) => {
  const { id } = req.params;
  const { name, description, duration_minutes, price, is_active } = req.body;

  try {
    // Check if service exists
    const checkQuery = 'SELECT id FROM services WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    // Admins can toggle is_active status if provided, otherwise preserve existing
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (duration_minutes !== undefined) {
      updateFields.push(`duration_minutes = $${paramIndex++}`);
      values.push(duration_minutes);
    }
    if (price !== undefined) {
      updateFields.push(`price = $${paramIndex++}`);
      values.push(price);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    values.push(id);
    const query = `
      UPDATE services
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, description, duration_minutes, price, is_active, created_at
    `;

    const result = await db.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
};

// Soft delete service (Admin only)
const deleteService = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      UPDATE services
      SET is_active = FALSE
      WHERE id = $1
      RETURNING id, name, is_active
    `;
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    res.json({ message: 'Service soft-deleted successfully.', service: result.rows[0] });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
};

module.exports = {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
};
