-- Migrate bookings status constraint to allow 'completed' status
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending_payment', 'confirmed', 'completed', 'cancelled'));
