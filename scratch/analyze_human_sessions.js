process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require("/home/ec2-user/galaxia/galaxia-whatsapp-bot23/galaxia-whatsapp-bot2/node_modules/pg");

const pool = new Pool({
  connectionString: "postgres://galaxia_admin:Hani9869!@galaxia-db-india.czs40kyowwxy.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify",
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("=== Analyzing 149 Active Human Instagram Sessions ===");
    
    // Fetch all active human sessions
    const sessionsRes = await pool.query(
      `SELECT session_id, display_name, bot_type, updated_at 
       FROM chat_sessions 
       WHERE is_human_active = true 
       AND (platform = 'instagram' OR session_id LIKE '%ig%')
       ORDER BY updated_at DESC`
    );

    const sessions = sessionsRes.rows;
    console.log(`Total sessions: ${sessions.length}`);

    let lastWasUser = 0;
    let lastWasAssistant = 0;
    const statsByAge = {
      today: 0,       // last message within 24 hours
      lastWeek: 0,    // last message within 7 days
      older: 0        // older than 7 days
    };

    const details = [];

    const now = new Date();

    for (const session of sessions) {
      // Get the last message of this session
      const msgRes = await pool.query(
        `SELECT role, message, created_at 
         FROM chat_messages 
         WHERE session_id = $1 
         ORDER BY id DESC LIMIT 1`,
        [session.session_id]
      );

      if (msgRes.rows.length === 0) {
        details.push({
          session_id: session.session_id,
          display_name: session.display_name,
          last_sender: 'none',
          last_msg: 'No messages',
          last_msg_at: session.updated_at,
          age_days: Math.floor((now - session.updated_at) / (1000 * 60 * 60 * 24))
        });
        statsByAge.older++;
        continue;
      }

      const m = msgRes.rows[0];
      const ageDays = Math.floor((now - m.created_at) / (1000 * 60 * 60 * 24));

      if (m.role === 'user') lastWasUser++;
      else lastWasAssistant++;

      if (ageDays === 0) statsByAge.today++;
      else if (ageDays <= 7) statsByAge.lastWeek++;
      else statsByAge.older++;

      details.push({
        session_id: session.session_id,
        display_name: session.display_name,
        last_sender: m.role,
        last_msg: m.message,
        last_msg_at: m.created_at,
        age_days: ageDays
      });
    }

    console.log(`\nLast message sender stats:`);
    console.log(`- Last message from Customer (User): ${lastWasUser}`);
    console.log(`- Last message from Admin (Assistant): ${lastWasAssistant}`);

    console.log(`\nLast message age stats:`);
    console.log(`- Active today (<24 hours): ${statsByAge.today}`);
    console.log(`- Active in last 7 days: ${statsByAge.lastWeek}`);
    console.log(`- Older than 7 days: ${statsByAge.older}`);

    console.log(`\n=== Sample active customer chats (Last sender = User, active recently) ===`);
    const activeChats = details
      .filter(d => d.last_sender === 'user')
      .sort((a, b) => a.age_days - b.age_days);
    
    console.log(JSON.stringify(activeChats.slice(0, 15), null, 2));

    console.log(`\n=== Sample old chats (Older than 7 days) ===`);
    const oldChats = details
      .filter(d => d.age_days > 7)
      .sort((a, b) => b.age_days - a.age_days);
    
    console.log(JSON.stringify(oldChats.slice(0, 15), null, 2));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
