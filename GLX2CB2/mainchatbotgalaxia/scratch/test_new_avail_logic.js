require('dotenv').config();
const { pool } = require('../services/db');

async function checkSubAvailNightly(propertyId, subId, capacity, cleanCheckIn, cleanCheckOut) {
  // Generate list of dates from cleanCheckIn up to (cleanCheckOut - 1 day)
  const startDate = new Date(cleanCheckIn);
  const endDate = new Date(cleanCheckOut);
  
  let minAvail = capacity;
  let maxBooked = 0;
  let maxBlocked = 0;

  const current = new Date(startDate);
  while (current < endDate) {
    const dStr = current.toISOString().split("T")[0];
    
    // Bookings overlapping night dStr
    const bRes = await pool.query(
      `SELECT COALESCE(SUM(COALESCE(num_cottages, 1)), 0) as cnt
       FROM staycation_bookings
       WHERE property_id = $1 AND sub_property_id = $2
         AND status NOT IN ('cancelled', 'no_show', 'transferred')
         AND (check_in_date + INTERVAL '5 hours 30 minutes')::date <= $3::date
         AND (check_out_date + INTERVAL '5 hours 30 minutes')::date > $3::date`,
      [propertyId, subId, dStr]
    );
    const booked = parseInt(bRes.rows[0].cnt || 0);

    // Blocks on night dStr
    const blkRes = await pool.query(
      `SELECT COALESCE(SUM(COALESCE(num_units, 1)), 0) as cnt
       FROM blocked_dates
       WHERE property_id = $1 AND sub_property_id = $2
         AND (blocked_date + INTERVAL '5 hours 30 minutes')::date = $3::date`,
      [propertyId, subId, dStr]
    );
    const blocked = parseInt(blkRes.rows[0].cnt || 0);

    const occupied = booked + blocked;
    const avail = Math.max(0, capacity - occupied);

    if (avail < minAvail) minAvail = avail;
    if (booked > maxBooked) maxBooked = booked;
    if (blocked > maxBlocked) maxBlocked = blocked;

    current.setDate(current.getDate() + 1);
  }

  return {
    capacity,
    bookedCount: maxBooked,
    blockedCount: maxBlocked,
    availableUnits: minAvail,
    isAvailable: minAvail > 0
  };
}

async function runTest() {
  console.log("=== TESTING NIGHTLY ACCURATE AVAILABILITY ON 2026-08-01 ===");

  const propRes = await pool.query("SELECT id, name FROM properties WHERE slug = 'amstel-nest'");
  const prop = propRes.rows[0];

  const subsRes = await pool.query("SELECT id, name, slug, unit_count FROM sub_properties WHERE property_id = $1 ORDER BY id ASC", [prop.id]);

  for (const sub of subsRes.rows) {
    const res = await checkSubAvailNightly(prop.id, sub.id, sub.unit_count, '2026-08-01', '2026-08-02');
    console.log(`Sub-Property: ${sub.name} (${sub.slug})`, res);
  }

  process.exit(0);
}

runTest();
