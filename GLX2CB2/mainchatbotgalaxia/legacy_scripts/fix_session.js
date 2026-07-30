// fix_session.js — Fix the wrong phone_number_id in the test session
const pg = require("pg");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  // Fix the wrong phone_number_id
  const res = await pool.query(
    "UPDATE chat_sessions SET phone_number_id = $1 WHERE session_id = $2 RETURNING session_id, phone_number_id",
    ["1117204771469353", "wa_918237309564"]
  );
  console.log("Fixed:", JSON.stringify(res.rows));
  
  // Also reset human mode so we can test fresh
  const res2 = await pool.query(
    "UPDATE chat_sessions SET is_human_active = false WHERE session_id = $1 RETURNING session_id, is_human_active",
    ["wa_918237309564"]
  );
  console.log("Reset human mode:", JSON.stringify(res2.rows));
  
  pool.end();
}
main().catch(e => { console.error(e.message); pool.end(); });
