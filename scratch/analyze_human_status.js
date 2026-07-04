process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require("/home/ec2-user/galaxia/galaxia-whatsapp-bot23/galaxia-whatsapp-bot2/node_modules/pg");

const pool = new Pool({
  connectionString: "postgres://galaxia_admin:Hani9869!@galaxia-db-india.czs40kyowwxy.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify",
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    // 1. Pending human_requests (unresolved human requests)
    const pendingHr = await pool.query(
      `SELECT count(*) FROM human_requests WHERE status = 'pending'`
    );
    console.log("Pending human_requests count:", pendingHr.rows[0].count);

    // 2. Pending human_requests matching IG sessions
    const pendingIgHr = await pool.query(
      `SELECT cs.session_id, cs.display_name, hr.created_at, hr.status
       FROM chat_sessions cs
       JOIN human_requests hr ON cs.customer_phone = hr.phone
       WHERE (cs.platform = 'instagram' OR cs.session_id LIKE '%ig%')
       AND hr.status = 'pending'`
    );
    console.log("Pending IG human_requests sessions count:", pendingIgHr.rows.length);
    console.log("Pending IG human requests sample:", pendingIgHr.rows);

    // 3. Instagram sessions with unread messages AND recent activity in the last 3 days
    const unreadRecentIg = await pool.query(
      `SELECT session_id, display_name, unread_count, updated_at, last_message_at 
       FROM chat_sessions 
       WHERE (platform = 'instagram' OR session_id LIKE '%ig%')
       AND unread_count > 0
       AND updated_at > NOW() - INTERVAL '3 days'`
    );
    console.log("\nUnread & Recent IG Sessions count:", unreadRecentIg.rows.length);
    console.log("Sample unread & recent IG sessions:", unreadRecentIg.rows.slice(0, 10));

    // 4. Check WhatsApp active human sessions for comparison (how many WA sessions are currently human mode)
    const waHuman = await pool.query(
      `SELECT count(*) FROM chat_sessions WHERE (platform = 'whatsapp' OR session_id LIKE 'wa_%') AND is_human_active = true`
    );
    console.log("\nWhatsApp active human sessions:", waHuman.rows[0].count);

    // 5. Internal bot handles
    const internalBots = await pool.query(
      `SELECT session_id, display_name 
       FROM chat_sessions 
       WHERE (platform = 'instagram' OR session_id LIKE '%ig%')
       AND (display_name LIKE '%digitaldiaries%' 
            OR display_name LIKE '%amstelnest%' 
            OR display_name LIKE '%ambrose%' 
            OR display_name LIKE '%laparaiso%' 
            OR display_name LIKE '%mountview%' 
            OR display_name LIKE '%heavenlyvilla%' 
            OR display_name LIKE '%hillview%' 
            OR display_name LIKE '%galaxia%')`
    );
    console.log("\nInternal Bot IG Sessions:", internalBots.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
