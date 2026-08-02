require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const args = process.argv.slice(2);

if (args.length < 4) {
  console.log('Usage: node src/scripts/createAdmin.js <email> <password> <first_name> <last_name>');
  process.exit(1);
}

const [email, password, first_name, last_name] = args;

const createAdmin = async () => {
  try {
    // 1. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 2. Insert admin into database
    const insertQuery = `
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, 'admin')
      RETURNING id, email, first_name, last_name, role
    `;
    
    const result = await db.query(insertQuery, [
      email.trim().toLowerCase(),
      passwordHash,
      first_name.trim(),
      last_name.trim()
    ]);

    console.log('Admin user created successfully:');
    console.log(result.rows[0]);
    process.exit(0);
  } catch (error) {
    if (error.code === '23505') {
      console.error('Error: A user with this email address already exists.');
    } else {
      console.error('Failed to create admin user:', error);
    }
    process.exit(1);
  }
};

createAdmin();
