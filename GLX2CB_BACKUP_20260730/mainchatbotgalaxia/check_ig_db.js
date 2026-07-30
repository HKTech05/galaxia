require('dotenv').config({ path: '/home/ec2-user/galaxia/wa-chatbot/.env' });
const db = require('./services/db');

async function check() {
  console.log('=== INSTAGRAM CHATBOT ACTIVITY SUMMARY ===\n');

  const res = await db.pool.query(`
    SELECT 
      s.bot_type, 
      s.platform,
      COUNT(DISTINCT s.session_id) as session_count,
      COUNT(m.id) as total_messages,
      MAX(m.created_at) as last_message_at,
      MAX(CASE WHEN m.role = 'user' THEN m.created_at END) as last_user_msg_at,
      MAX(CASE WHEN m.role = 'assistant' THEN m.created_at END) as last_bot_msg_at
    FROM chat_sessions s
    LEFT JOIN chat_messages m ON s.session_id = m.session_id
    WHERE s.platform = 'instagram' OR s.bot_type LIKE '%_ig' OR s.phone_number_id LIKE 'ig_%' OR s.phone_number_id = 'instagram'
    GROUP BY s.bot_type, s.platform
    ORDER BY last_message_at DESC NULLS LAST;
  `);
  
  console.log(JSON.stringify(res.rows, null, 2));

  process.exit(0);
}

check().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
