require('dotenv').config({ path: '/home/ec2-user/galaxia/wa-chatbot/.env' });
const db = require('./services/db');

async function main() {
  const res = await db.pool.query(`
    SELECT s.session_id, s.bot_type, s.created_at, m.message, m.created_at as msg_created
    FROM chat_sessions s
    JOIN chat_messages m ON s.session_id = m.session_id
    WHERE s.customer_phone = '9999999999' OR s.session_id LIKE '%9999999999%'
    ORDER BY m.created_at ASC;
  `);

  console.log(res.rows);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
