const db = require('../config/db');

const initSql = `
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0.00),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS availability_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked')),
    CONSTRAINT check_slot_times CHECK (start_time < end_time)
);

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    slot_id UUID NOT NULL UNIQUE REFERENCES availability_slots(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'confirmed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE RESTRICT,
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0.00),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_availability_slots_service_time ON availability_slots(service_id, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
`;

const completedStatusSql = `
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('pending_payment', 'confirmed', 'completed', 'cancelled'));
`;

const setupDatabase = async () => {
  try {
    console.log('Verifying database schema & migrations...');

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
      require('./seedDemoData');
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
