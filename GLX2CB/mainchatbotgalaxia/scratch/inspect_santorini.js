require('dotenv').config();
const { pool } = require('../services/db');

async function inspectSantoriniJuly() {
  const propRes = await pool.query("SELECT id FROM properties WHERE slug = 'ambrose'");
  const propId = propRes.rows[0].id;

  const subRes = await pool.query("SELECT id FROM sub_properties WHERE property_id = $1 AND slug = 'santorini'", [propId]);
  const subId = subRes.rows[0].id;

  console.log('Ambrose Prop ID:', propId, 'Santorini Sub ID:', subId);

  const bookings = await pool.query(
    "SELECT id, booking_ref, check_in_date, check_out_date, status FROM staycation_bookings WHERE property_id = $1 AND sub_property_id = $2 ORDER BY check_in_date ASC",
    [propId, subId]
  );
  console.log('\n=== ALL SANTORINI BOOKINGS ===');
  bookings.rows.forEach(b => {
    const inIso = b.check_in_date ? b.check_in_date.toISOString() : 'NULL';
    const outIso = b.check_out_date ? b.check_out_date.toISOString() : 'NULL';
    console.log(`ID: ${b.id} | Ref: ${b.booking_ref} | In: ${inIso} | Out: ${outIso} | Status: ${b.status}`);
  });

  const blocked = await pool.query(
    "SELECT id, blocked_date, reason FROM blocked_dates WHERE property_id = $1 AND sub_property_id = $2 ORDER BY blocked_date ASC",
    [propId, subId]
  );
  console.log('\n=== ALL SANTORINI BLOCKED DATES ===');
  blocked.rows.forEach(blk => {
    const dIso = blk.blocked_date ? blk.blocked_date.toISOString() : 'NULL';
    console.log(`ID: ${blk.id} | Date: ${dIso} | Reason: ${blk.reason}`);
  });

  process.exit(0);
}

inspectSantoriniJuly();
