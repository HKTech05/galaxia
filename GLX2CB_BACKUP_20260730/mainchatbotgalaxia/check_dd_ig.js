require('dotenv').config({ path: '/home/ec2-user/galaxia/wa-chatbot/.env' });
const https = require('https');
const db = require('./services/db');

async function checkDdIg() {
  console.log('=== DIGITAL DIARIES INSTAGRAM CHATBOT DIAGNOSTICS ===\n');

  const token = process.env.INSTAGRAM_TOKEN;
  console.log('INSTAGRAM_TOKEN preview:', token ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}` : 'NONE');

  // Test token with Graph API
  if (token) {
    await new Promise((resolve) => {
      const url = `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${token}`;
      https.get(url, (res) => {
        let body = '';
        res.on('data', (c) => body += c);
        res.on('end', () => {
          console.log('Graph API response for INSTAGRAM_TOKEN:', body);
          resolve();
        });
      }).on('error', (e) => {
        console.log('HTTP error:', e.message);
        resolve();
      });
    });
  }

  // Query DB for Digital Diaries Instagram daily message activity
  const res = await db.pool.query(`
    SELECT 
      DATE(m.created_at) as msg_date,
      COUNT(m.id) as total_msgs,
      COUNT(CASE WHEN m.role = 'user' THEN 1 END) as user_msgs,
      COUNT(CASE WHEN m.role = 'assistant' THEN 1 END) as bot_msgs
    FROM chat_messages m
    JOIN chat_sessions s ON m.session_id = s.session_id
    WHERE (s.platform = 'instagram' OR s.phone_number_id = 'instagram')
      AND (s.bot_type = 'celebration' OR s.bot_type = 'digital_diaries')
    GROUP BY DATE(m.created_at)
    ORDER BY msg_date DESC
    LIMIT 15;
  `);

  console.log('\n=== DIGITAL DIARIES IG DAILY MESSAGE COUNTS ===');
  console.table(res.rows);

  // Fetch recent messages for DD IG
  const recent = await db.pool.query(`
    SELECT 
      s.session_id,
      s.display_name,
      m.role,
      m.message,
      m.created_at
    FROM chat_messages m
    JOIN chat_sessions s ON m.session_id = s.session_id
    WHERE (s.platform = 'instagram' OR s.phone_number_id = 'instagram')
      AND (s.bot_type = 'celebration' OR s.bot_type = 'digital_diaries')
    ORDER BY m.created_at DESC
    LIMIT 10;
  `);

  console.log('\n=== RECENT DIGITAL DIARIES IG MESSAGES ===');
  console.table(recent.rows);

  process.exit(0);
}

checkDdIg().catch(err => {
  console.error(err);
  process.exit(1);
});
