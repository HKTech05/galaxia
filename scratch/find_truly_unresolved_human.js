process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require("/home/ec2-user/galaxia/galaxia-whatsapp-bot23/galaxia-whatsapp-bot2/node_modules/pg");

const pool = new Pool({
  connectionString: "postgres://galaxia_admin:Hani9869!@galaxia-db-india.czs40kyowwxy.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify",
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const sessions = await pool.query(
      `SELECT session_id, display_name, tags, unread_count, updated_at, last_message_at 
       FROM chat_sessions 
       WHERE platform = 'instagram' OR session_id LIKE '%ig%'`
    );

    console.log(`Total IG Sessions in DB: ${sessions.rows.length}`);

    let activeHuman = [];
    const internalHandles = ["digitaldiaries", "amstelnest", "ambrose", "laparaiso", "mountview", "heavenlyvilla", "hillview", "galaxia"];

    for (const s of sessions.rows) {
      const isInternal = internalHandles.some(k => s.display_name?.toLowerCase().includes(k));
      if (isInternal) {
        activeHuman.push({ session_id: s.session_id, name: s.display_name, reason: "internal_account" });
        continue;
      }

      // Check if session is explicitly marked as 'resolved' in tags
      const isTaggedResolved = Array.isArray(s.tags) && s.tags.includes("resolved");
      if (isTaggedResolved) {
        continue; // Resolved -> should be bot mode
      }

      // Get user messages in the last 14 days
      const userMsgs = await pool.query(
        `SELECT role, message, created_at 
         FROM chat_messages 
         WHERE session_id = $1 AND role = 'user'
         ORDER BY id DESC LIMIT 5`,
        [s.session_id]
      );

      if (userMsgs.rows.length === 0) continue;

      const latestUserMsg = userMsgs.rows[0];
      const text = latestUserMsg.message?.toLowerCase().trim() || "";

      // Check if the LATEST user message was requesting human/collab
      const isLatestHumanReq = 
        text === "human" || 
        text === "collab" || 
        text === "talk to human" || 
        text === "talk to a human" ||
        text === "agent";

      // If latest user message is a menu choice (like '1', '2', '3', 'main', 'menu', 'hi', 'hello') -> user went back to bot!
      const isLatestBotChoice = 
        ["1", "2", "3", "4", "5", "6", "7", "9", "hi", "hello", "hey", "menu", "start"].includes(text);

      if (isLatestHumanReq && !isLatestBotChoice) {
        activeHuman.push({
          session_id: s.session_id,
          name: s.display_name,
          latest_user_text: text,
          date: latestUserMsg.created_at,
          reason: "latest_msg_is_human_req"
        });
      }
    }

    console.log(`\n=== RESULT ===`);
    console.log(`TRULY UNRESOLVED HUMAN SESSIONS COUNT: ${activeHuman.length}`);
    console.log("\nDetails of Active Human Sessions:", JSON.stringify(activeHuman, null, 2));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
