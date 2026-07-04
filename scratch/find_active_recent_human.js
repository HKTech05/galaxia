process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require("/home/ec2-user/galaxia/galaxia-whatsapp-bot23/galaxia-whatsapp-bot2/node_modules/pg");

const pool = new Pool({
  connectionString: "postgres://galaxia_admin:Hani9869!@galaxia-db-india.czs40kyowwxy.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify",
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    // Check human requests by time window
    const intervals = ["1 day", "3 days", "7 days", "14 days", "30 days"];
    const internalHandles = ["digitaldiaries", "amstelnest", "ambrose", "laparaiso", "mountview", "heavenlyvilla", "hillview", "galaxia"];

    for (const int of intervals) {
      const res = await pool.query(
        `SELECT DISTINCT cs.session_id, cs.display_name, max(cm.created_at) as last_human_req
         FROM chat_sessions cs
         JOIN chat_messages cm ON cs.session_id = cm.session_id
         WHERE (cs.platform = 'instagram' OR cs.session_id LIKE '%ig%')
         AND cm.role = 'user'
         AND (LOWER(TRIM(cm.message)) IN ('human', 'collab', 'agent', 'talk to human') OR LOWER(cm.message) LIKE '%talk to human%')
         AND cm.created_at > NOW() - INTERVAL '${int}'
         GROUP BY cs.session_id, cs.display_name`
      );
      console.log(`Sessions with human request in last ${int}:`, res.rows.length);
      if (int === "7 days" || int === "3 days") {
        console.log(`Details (${int}):`, res.rows);
      }
    }

    // Check sessions where an admin sent a custom message (is_human = true) in last 7 days
    const adminMsgs = await pool.query(
      `SELECT DISTINCT session_id 
       FROM chat_messages 
       WHERE (session_id LIKE '%ig%' OR session_id LIKE '%instagram%')
       AND role = 'assistant' AND is_human = true
       AND message NOT LIKE '%*Welcome to%'
       AND message NOT LIKE '%Please select one of the options below%'
       AND message NOT LIKE '%Hello!%Planning a weekend getaway%'
       AND message NOT LIKE '%Hello!%Make your special moments%'
       AND created_at > NOW() - INTERVAL '7 days'`
    );
    console.log("\nDistinct IG sessions with custom admin messages in last 7 days:", adminMsgs.rows.length);
    console.log("Admin message sessions:", adminMsgs.rows.map(r => r.session_id));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
