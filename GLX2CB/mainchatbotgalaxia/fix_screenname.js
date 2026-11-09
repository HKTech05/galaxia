require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  // Update screen name from "Baywatch (15 x 8 sq ft)" to "Love Nest"
  const res = await p.query("UPDATE dd_screens SET name = 'Love Nest' WHERE LOWER(slug) = 'baywatch'");
  console.log('Rows updated:', res.rowCount);
  
  const verify = await p.query('SELECT id, name, slug, is_active FROM dd_screens ORDER BY id');
  console.log(JSON.stringify(verify.rows, null, 2));
  
  await p.end();
}
main().catch(e => { console.error(e.message); p.end(); });
