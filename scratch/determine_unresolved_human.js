process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require("/home/ec2-user/galaxia/galaxia-whatsapp-bot23/galaxia-whatsapp-bot2/node_modules/pg");

const pool = new Pool({
  connectionString: "postgres://galaxia_admin:Hani9869!@galaxia-db-india.czs40kyowwxy.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify",
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    // Get all 851 potential human sessions
    const candidates = await pool.query(
      `SELECT session_id, display_name, is_human_active, tags, last_message_at, updated_at 
       FROM chat_sessions 
       WHERE platform = 'instagram' OR session_id LIKE '%ig%'`
    );

    console.log(`Total IG Sessions: ${candidates.rows.length}`);

    let unresolvedHuman = [];
    let resolvedToBot = [];

    // Internal bot handles stay in human mode (so they don't auto reply)
    const internalHandles = ["digitaldiaries", "amstelnest", "ambrose", "laparaiso", "mountview", "heavenlyvilla", "hillview", "galaxia"];

    for (const session of candidates.rows) {
      const isInternal = internalHandles.some(k => session.display_name?.toLowerCase().includes(k));
      if (isInternal) {
        unresolvedHuman.push({ session_id: session.session_id, reason: "internal_handle" });
        continue;
      }

      // Fetch last 3 messages for this session
      const msgs = await pool.query(
        `SELECT id, role, is_human, message, created_at 
         FROM chat_messages 
         WHERE session_id = $1 
         ORDER BY id DESC LIMIT 5`,
        [session.session_id]
      );

      if (msgs.rows.length === 0) {
        resolvedToBot.push(session.session_id);
        continue;
      }

      // Check if the user asked for human in recent messages
      const hasRecentHumanReq = msgs.rows.some(m => 
        m.role === 'user' && 
        (m.message?.toLowerCase().trim() === 'human' || 
         m.message?.toLowerCase().trim() === 'collab' ||
         m.message?.toLowerCase().includes('talk to human'))
      );

      // Check if the latest message is from a bot (automated reply or main menu)
      const lastMsg = msgs.rows[0];
      const isLastMsgBot = lastMsg.role === 'assistant' && (
        lastMsg.is_human === false || 
        lastMsg.message?.includes("*Welcome to") || 
        lastMsg.message?.includes("Please select one of the options below") ||
        lastMsg.message?.includes("FAQs & Live Chat Support")
      );

      // Check if session has active tags like "collab" or "human"
      const hasTags = Array.isArray(session.tags) && session.tags.length > 0;

      // Logic:
      // If the last message was a bot reply, OR user never requested human in recent activity, OR bot took over -> RESOLVED to BOT.
      // Only keep HUMAN if there is a recent unresolved human request AND no subsequent bot reply resolved it.
      if (hasRecentHumanReq && !isLastMsgBot) {
        unresolvedHuman.push({ session_id: session.session_id, reason: "unresolved_human_req", last_msg: lastMsg.message });
      } else if (hasTags && !isLastMsgBot) {
        unresolvedHuman.push({ session_id: session.session_id, reason: "active_tag", tags: session.tags });
      } else {
        resolvedToBot.push(session.session_id);
      }
    }

    console.log(`\n=== RESULTS ===`);
    console.log(`Unresolved Active Human Sessions Count: ${unresolvedHuman.length}`);
    console.log(`Resolved / Bot Mode Sessions Count: ${resolvedToBot.length}`);
    console.log("\nUnresolved Human Sessions Details:", JSON.stringify(unresolvedHuman, null, 2));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
