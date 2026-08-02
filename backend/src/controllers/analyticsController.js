const db = require('../config/db');

// Get aggregated analytics metrics (Admin only)
const getAnalytics = async (req, res) => {
  try {
    // 1. Calculate revenue by summing succeeded payments amount, grouped by UTC date
    const revenueQuery = `
      SELECT DATE_TRUNC('day', created_at AT TIME ZONE 'UTC') as date, 
             SUM(amount) as total_revenue
      FROM payments
      WHERE status = 'succeeded'
      GROUP BY DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')
      ORDER BY date ASC;
    `;

    // 2. Calculate bookings volume over time, excluding cancelled appointments, grouped by UTC date
    const bookingsQuery = `
      SELECT DATE_TRUNC('day', slots.start_time AT TIME ZONE 'UTC') as date, 
             COUNT(b.id) as bookings_count
      FROM bookings b
      JOIN availability_slots slots ON b.slot_id = slots.id
      WHERE b.status != 'cancelled'
      GROUP BY DATE_TRUNC('day', slots.start_time AT TIME ZONE 'UTC')
      ORDER BY date ASC;
    `;

    // 3. Totals summary statistics
    const statsQuery = `
      SELECT 
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'succeeded') as total_revenue,
        (SELECT COUNT(id) FROM bookings WHERE status != 'cancelled') as total_bookings;
    `;

    const [revenueRes, bookingsRes, statsRes] = await Promise.all([
      db.query(revenueQuery),
      db.query(bookingsQuery),
      db.query(statsQuery)
    ]);

    const stats = statsRes.rows[0];

    res.json({
      summary: {
        total_revenue: parseFloat(stats.total_revenue),
        total_bookings: parseInt(stats.total_bookings, 10),
      },
      revenue_chart: revenueRes.rows.map(r => ({
        date: new Date(r.date).toISOString().split('T')[0],
        revenue: parseFloat(r.total_revenue)
      })),
      bookings_chart: bookingsRes.rows.map(b => ({
        date: new Date(b.date).toISOString().split('T')[0],
        bookings: parseInt(b.bookings_count, 10)
      }))
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
};

module.exports = {
  getAnalytics
};
