// check_sessions.js
const pg = require("pg");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query("SELECT session_id, customer_phone, phone_number_id, is_human_active, tags FROM chat_sessions WHERE session_id LIKE 'wa_%' ORDER BY updated_at DESC LIMIT 5")
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });
