require('dotenv').config();
const db = require('./services/db');
(async () => {
  const p = await db.pool.query(
    `SELECT session_id, display_name, is_human_active FROM chat_sessions WHERE phone_number_id='ig_amstelnest' AND display_name ILIKE '%priyanka%'`
  );
  console.log(JSON.stringify(p.rows, null, 2));

  // Also get last 10 messages for that session
  if (p.rows.length > 0) {
    const msgs = await db.pool.query(
      `SELECT role, message, created_at FROM chat_messages WHERE session_id=$1 ORDER BY created_at DESC LIMIT 15`,
      [p.rows[0].session_id]
    );
    console.log("\n--- Last 15 messages ---");
    msgs.rows.reverse().forEach(m => console.log(`[${m.role}] ${m.message?.substring(0,150)}`));
  }
  process.exit();
})();
