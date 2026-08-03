const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const setupDatabase = async () => {
  try {
    console.log('Verifying database schema & migrations...');

    const initSqlPath = path.join(__dirname, '../../../db/init.sql');
    const completedStatusSqlPath = path.join(__dirname, '../../../db/completed_status.sql');

    const initSql = fs.readFileSync(initSqlPath, 'utf8');
    const completedStatusSql = fs.readFileSync(completedStatusSqlPath, 'utf8');

    // 1. Run init.sql schema
    await db.query(initSql);
    console.log('Database tables & indexes verified.');

    // 2. Run completed_status.sql migration
    try {
      await db.query(completedStatusSql);
      console.log('Status constraint migration applied.');
    } catch (migErr) {
      console.log('Status migration notice:', migErr.message);
    }

    // 3. Seed demo data if database is empty
    const checkResult = await db.query('SELECT COUNT(*) FROM services');
    const serviceCount = parseInt(checkResult.rows[0].count, 10);

    if (serviceCount === 0) {
      console.log('Database is empty. Populating demo services, slots, and accounts...');
      const seedDemo = require('./seedDemoData');
      // seedDemoData auto-executes if called
    } else {
      console.log(`Database ready with ${serviceCount} existing services.`);
    }
  } catch (error) {
    console.error('Database setup notice:', error.message);
  }
};

if (require.main === module) {
  setupDatabase().then(() => process.exit(0));
}

module.exports = setupDatabase;
