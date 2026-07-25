require('dotenv').config();
const { pool } = require('../services/db');

async function testIntervalSql() {
  console.log("=== TESTING INTERVAL +5:30 SQL FOR SANTORINI ===");

  const targetDate = '2026-07-26';
  
  const res = await pool.query(`
    SELECT id, booking_ref,
           (check_in_date + INTERVAL '5 hours 30 minutes')::date as in_ist,
           (check_out_date + INTERVAL '5 hours 30 minutes')::date as out_ist
    FROM staycation_bookings
    WHERE property_id = 6 AND sub_property_id = 5
      AND status NOT IN ('cancelled', 'no_show', 'transferred')
      AND (check_in_date + INTERVAL '5 hours 30 minutes')::date <= $1::date
      AND (check_out_date + INTERVAL '5 hours 30 minutes')::date > $1::date
  `, [targetDate]);

  console.log(`Checking IST availability for date: ${targetDate}`);
  console.log("Matching Bookings Count:", res.rows.length);
  res.rows.forEach(r => console.log(`Booking ID: ${r.id} | Ref: ${r.booking_ref} | In IST: ${r.in_ist} | Out IST: ${r.out_ist}`));

  process.exit(0);
}

testIntervalSql();
