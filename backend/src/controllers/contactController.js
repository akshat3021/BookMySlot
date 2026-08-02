const db = require('../config/db');

// Store public contact submission messages
const saveMessage = async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const query = `
      INSERT INTO contact_messages (name, email, message)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, message, created_at
    `;
    const values = [name, email, message];
    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Message saved successfully. Thank you for reaching out!',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Save contact message error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred. Please try again later.' });
  }
};

module.exports = {
  saveMessage,
};
