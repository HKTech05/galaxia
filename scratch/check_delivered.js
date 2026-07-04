const { Pool } = require("pg");
require("dotenv").config({ path: "/home/ec2-user/galaxia/wa-chatbot/.env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const res = await pool.query(`
    SELECT m.created_at, s.bot_type, s.session_id, s.display_name, s.customer_phone
    FROM chat_messages m
    JOIN chat_sessions s ON m.session_id = s.session_id
    WHERE m.message LIKE 'Hello!%Planning a weekend getaway%'
       OR m.message LIKE 'Hello!%Make your special moments%'
    ORDER BY m.created_at DESC
    LIMIT 20
  `);
  
  console.log("=== Recent Marketing Broadcast Messages in DB ===");
  console.table(res.rows);

  await pool.end();
}

main().catch(e => console.error("Error:", e));
