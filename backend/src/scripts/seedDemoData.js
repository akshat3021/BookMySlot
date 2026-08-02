require('dotenv').config();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function seed() {
  const isDev = process.env.NODE_ENV === 'development';
  const hasConfirmFlag = process.argv.includes('--confirm-seed');

  if (!isDev && !hasConfirmFlag) {
    console.error('ERROR: Database seeding safety block triggered.');
    console.error('NODE_ENV must be set to "development" or you must pass the --confirm-seed flag to execute.');
    console.error('Example: node src/scripts/seedDemoData.js --confirm-seed');
    process.exit(1);
  }

  console.log('------------------------------------------------------------');
  console.log('WARNING: Wiping existing database records!');
  console.log('This will TRUNCATE the following tables:');
  console.log('  - bookings');
  console.log('  - availability_slots');
  console.log('  - payments');
  console.log('  - users');
  console.log('  - services');
  console.log('All existing data will be lost.');
  console.log('------------------------------------------------------------');
  console.log('Proceeding with seed in 3 seconds...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  const client = await db.pool.connect();
  try {
    console.log('Starting demo database seeding...');
    await client.query('BEGIN');

    // 1. Truncate all records safely in cascade
    console.log('Clearing database tables...');
    await client.query('TRUNCATE bookings, availability_slots, payments, users, services RESTART IDENTITY CASCADE;');

    // 2. Generate password hashes
    console.log('Generating password hashes...');
    const adminHash = await bcrypt.hash('secureadminpass', 10);
    const customerHash = await bcrypt.hash('password123', 10);

    // 3. Insert Users (using realistic portfolio-grade profiles)
    console.log('Inserting seed users...');
    const userInsertQuery = `
      INSERT INTO users (id, email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const adminId = 'd11d1c33-8a03-4f91-8fa3-eb3e7902d1d0';
    const customerIds = {
      jane: 'b5a034d6-848e-4a61-9c3f-b649d2f2d9c0',
      marcus: 'a87265a0-d12c-4977-873b-287df1c0cc12',
      clara: 'e0110ac5-ffba-4bcf-a4de-b3f81e3518cd'
    };

    await client.query(userInsertQuery, [adminId, 'admin@bookmyslot.com', adminHash, 'Sarah', 'Jenkins', 'admin']);
    await client.query(userInsertQuery, [customerIds.jane, 'jane.miller@outlook.com', customerHash, 'Jane', 'Miller', 'customer']);
    await client.query(userInsertQuery, [customerIds.marcus, 'marcus.chen@gmail.com', customerHash, 'Marcus', 'Chen', 'customer']);
    await client.query(userInsertQuery, [customerIds.clara, 'clara.watson@yahoo.com', customerHash, 'Clara', 'Watson', 'customer']);

    // 4. Insert Services (including one deactivated service)
    console.log('Inserting service definitions...');
    const serviceInsertQuery = `
      INSERT INTO services (id, name, description, duration_minutes, price, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const serviceIds = {
      physio: 'f36b69b5-c085-48fa-a4a3-488f7b7cb591',
      massage: 'c6198f24-de4f-4d9f-bf44-77be1c21d152',
      coaching: 'a38be98e-412e-4b47-b8db-c87db8c0dc11',
      nutrition: 'b98d28be-e90d-4bcf-9db1-b2c89f381c13',
      deactivated: 'd48be98e-123e-4b47-b8db-c87db8c0dc99'
    };

    await client.query(serviceInsertQuery, [serviceIds.physio, 'Physiotherapy Consultation', 'Comprehensive assessment and clinical physical therapy session focused on biomechanical recovery.', 60, 120.00, true]);
    await client.query(serviceInsertQuery, [serviceIds.massage, 'Therapeutic Deep Tissue Massage', 'Targeted deep muscle relaxation therapy to alleviate chronic tension and athletic strain.', 45, 95.00, true]);
    await client.query(serviceInsertQuery, [serviceIds.coaching, 'Personal Fitness Coaching', 'One-on-one tailored exercise coaching, posture corrections, and physical conditioning plan.', 60, 80.00, true]);
    await client.query(serviceInsertQuery, [serviceIds.nutrition, 'Nutritional Counseling Session', 'Personalized meal scheduling, dietary analysis, and health wellness habit formation coaching.', 30, 70.00, true]);
    await client.query(serviceInsertQuery, [serviceIds.deactivated, 'Deactivated Massage Therapy Service', 'Old clinical trial service definition, preserved for administrative record recovery.', 30, 60.00, false]);

    // 5. Generate Availability Slots spanning 12 days past and 12 days future
    console.log('Generating slots, bookings, and payments...');
    const slotInsertQuery = `
      INSERT INTO availability_slots (id, service_id, start_time, end_time, status)
      VALUES ($1, $2, $3, $4, $5)
    `;

    const bookingInsertQuery = `
      INSERT INTO bookings (id, customer_id, service_id, slot_id, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const paymentInsertQuery = `
      INSERT INTO payments (id, booking_id, stripe_payment_intent_id, amount, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    // Let's create slots daily
    // Date spread: last 12 days, and next 12 days
    const now = new Date();
    let slotCounter = 1;
    let bookingCounter = 1;
    let paymentCounter = 1;

    for (let dayOffset = -12; dayOffset <= 12; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + dayOffset);
      const dateString = targetDate.toISOString().split('T')[0];

      // Generate slots at 9 AM, 11 AM, 2 PM, 4 PM
      const hours = [9, 11, 14, 16];

      for (const hr of hours) {
        const startTime = new Date(`${dateString}T${hr.toString().padStart(2, '0')}:00:00.000Z`);
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + 1);

        // Pick a service round-robin (active services only)
        const servicesList = [serviceIds.physio, serviceIds.massage, serviceIds.coaching, serviceIds.nutrition];
        const activeServiceId = servicesList[slotCounter % servicesList.length];
        const servicePrice = activeServiceId === serviceIds.physio ? 120.00 :
                             activeServiceId === serviceIds.massage ? 95.00 :
                             activeServiceId === serviceIds.coaching ? 80.00 : 70.00;

        const slotId = `111d1c33-8a03-4f91-8fa3-eb3e7902d${slotCounter.toString().padStart(3, '0')}`;
        slotCounter++;

        // Determine status:
        // If past date:
        //   - 80% chance booked & completed, with succeeded payment.
        //   - 10% chance blocked status (blocked slot, no booking).
        //   - 10% chance available (available slot, no booking).
        // If future date:
        //   - 50% chance available.
        //   - 20% chance booked & confirmed, with succeeded payment.
        //   - 15% chance booked & pending_payment (no payment).
        //   - 10% chance cancelled booking (slot available).
        //   - 5% chance blocked.
        let slotStatus = 'available';
        let bookingStatus = null;
        let paymentStatus = null;

        if (dayOffset < 0) {
          // Past dates
          const rand = Math.random();
          if (rand < 0.8) {
            slotStatus = 'booked';
            bookingStatus = 'completed';
            paymentStatus = 'succeeded';
          } else if (rand < 0.9) {
            slotStatus = 'blocked';
          } else {
            slotStatus = 'available';
          }
        } else {
          // Future dates
          const rand = Math.random();
          if (rand < 0.5) {
            slotStatus = 'available';
          } else if (rand < 0.7) {
            slotStatus = 'booked';
            bookingStatus = 'confirmed';
            paymentStatus = 'succeeded';
          } else if (rand < 0.85) {
            slotStatus = 'booked';
            bookingStatus = 'pending_payment';
          } else if (rand < 0.95) {
            slotStatus = 'available'; // Cancelled bookings free up the slot
            bookingStatus = 'cancelled';
          } else {
            slotStatus = 'blocked';
          }
        }

        // Insert Slot
        await client.query(slotInsertQuery, [slotId, activeServiceId, startTime.toISOString(), endTime.toISOString(), slotStatus]);

        // Insert Booking if applicable
        if (bookingStatus) {
          const bookingId = `b22d1c33-8a03-4f91-8fa3-eb3e7902d${bookingCounter.toString().padStart(3, '0')}`;
          bookingCounter++;

          // Select customer round robin
          const customers = [customerIds.jane, customerIds.marcus, customerIds.clara];
          const customerId = customers[bookingCounter % customers.length];

          // Created at time (roughly 1 day before slot time)
          const createdAt = new Date(startTime);
          createdAt.setDate(startTime.getDate() - 1);

          await client.query(bookingInsertQuery, [bookingId, customerId, activeServiceId, slotId, bookingStatus, createdAt.toISOString()]);

          // Insert Payment if applicable
          if (paymentStatus) {
            const paymentId = `333d1c33-8a03-4f91-8fa3-eb3e7902d${paymentCounter.toString().padStart(3, '0')}`;
            paymentCounter++;

            const stripePi = `pi_mock_${Math.random().toString(36).substring(2, 15)}`;

            await client.query(paymentInsertQuery, [paymentId, bookingId, stripePi, servicePrice, paymentStatus, createdAt.toISOString()]);
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log('Database seeded successfully!');
    console.log('\nSeed Credentials:');
    console.log('Admin:    admin@bookmyslot.com   (password: secureadminpass)');
    console.log('Customer: jane.miller@outlook.com (password: password123)');
    console.log('Customer: marcus.chen@gmail.com   (password: password123)');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding database:', error);
  } finally {
    client.release();
  }
}

seed().then(() => process.exit(0));
