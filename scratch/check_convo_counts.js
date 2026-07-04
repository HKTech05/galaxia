const { Pool } = require("pg");
require("dotenv").config({ path: "/home/ec2-user/galaxia/wa-chatbot/.env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const res = await pool.query(`
    SELECT bot_type, COUNT(*) as count 
    FROM chat_sessions 
    WHERE platform = 'instagram' 
    GROUP BY bot_type 
    ORDER BY count DESC
  `);
  console.log("=== Instagram Conversation Counts by Bot Type ===");
  console.table(res.rows);
  
  const total = await pool.query(`SELECT COUNT(*) FROM chat_sessions WHERE platform = 'instagram'`);
  console.log("Total Instagram Conversations:", total.rows[0].count);

  await pool.end();
}

main().catch(e => console.error("Error:", e));
