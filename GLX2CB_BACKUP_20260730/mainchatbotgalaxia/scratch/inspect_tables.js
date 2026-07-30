require('dotenv').config();
const { pool } = require('../services/db');

async function inspectTables() {
  const props = await pool.query("SELECT id, name, slug, is_active FROM properties");
  console.log("=== PROPERTIES ===");
  console.table(props.rows);

  const subs = await pool.query("SELECT id, property_id, name, slug, unit_count, is_active FROM sub_properties WHERE property_id = 6");
  console.log("=== SUB PROPERTIES (Ambrose id=6) ===");
  console.table(subs.rows);

  process.exit(0);
}

inspectTables();
