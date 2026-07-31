require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  // Find sessions for this phone number
  const sessions = await pool.query(
    `SELECT session_id, customer_phone, display_name, bot_type, created_at 
     FROM chat_sessions 
     WHERE customer_phone LIKE '%98200%79272%' OR customer_phone LIKE '%9820079272%'`
  );

  console.log('Found sessions:', sessions.rows.length);
  sessions.rows.forEach(s => console.log(s.session_id, s.customer_phone, s.display_name, s.bot_type, s.created_at));

  if (sessions.rows.length > 0) {
    const sessionIds = sessions.rows.map(s => s.session_id);

    // Delete messages first
    const msgResult = await pool.query(
      `DELETE FROM chat_messages WHERE session_id = ANY($1::text[])`,
      [sessionIds]
    );
    console.log('Deleted messages:', msgResult.rowCount);

    // Delete sessions
    const sessResult = await pool.query(
      `DELETE FROM chat_sessions WHERE session_id = ANY($1::text[])`,
      [sessionIds]
    );
    console.log('Deleted sessions:', sessResult.rowCount);
  }

  await pool.end();
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
