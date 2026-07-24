const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const BOT_MAPPING = {
  "celebration": "digitaldiariesallconvos.json",
  "amstelnest_ig": "amstelnestallconvos.json",
  "ambrose_ig": "ambroseallconvos.json",
  "heavenlyvilla_ig": "heavenlyvillaallconvos.json",
  "laparaiso_ig": "laparaisoallconvos.json",
  "mountview_ig": "mountviewallconvos.json",
  "hillview_ig": "hillviewallconvos.json"
};

const GLX2_ROOT = "C:/Users/krish/OneDrive/Desktop/FINAL PROJ/GLX2";

async function main() {
  try {
    console.log("🚀 Starting conversation extraction for all chatbots...");

    // Get list of unique bot types to ensure we fetch everything
    const botTypesRes = await pool.query(`
      SELECT DISTINCT bot_type 
      FROM chat_sessions 
      WHERE bot_type IS NOT NULL
    `);
    
    const botTypes = botTypesRes.rows.map(r => r.bot_type);
    console.log("Found bot types in database:", botTypes);

    for (const botType of botTypes) {
      // Determine output filename
      let filename = BOT_MAPPING[botType];
      if (!filename) {
        // Fallback for any unknown bot types
        const cleanBotType = botType.toLowerCase().replace(/[^a-z0-9_]/g, "");
        filename = `${cleanBotType}allconvos.json`;
      }
      
      const outputPath = path.join(GLX2_ROOT, filename);
      console.log(`\n⏳ Fetching conversations for bot type: "${botType}"...`);

      // Query sessions and their messages joined
      const query = `
        SELECT 
          s.id as session_id_int,
          s.session_id,
          s.customer_phone,
          s.display_name,
          s.phone_number_id,
          s.bot_type,
          s.platform,
          s.is_human_active,
          s.tags,
          s.unread_count,
          s.last_message,
          s.last_message_at,
          s.created_at as session_created_at,
          s.updated_at as session_updated_at,
          m.id as message_id,
          m.role,
          m.message,
          m.is_human,
          m.created_at as message_created_at
        FROM chat_sessions s
        LEFT JOIN chat_messages m ON s.session_id = m.session_id
        WHERE s.bot_type = $1
        ORDER BY s.created_at DESC, m.created_at ASC
      `;

      const res = await pool.query(query, [botType]);
      const rows = res.rows;
      console.log(`Fetched ${rows.length} rows (session-message pairs) for "${botType}".`);

      // Structure rows into nested JSON format
      const sessionsMap = new Map();
      let totalMessages = 0;

      for (const row of rows) {
        if (!sessionsMap.has(row.session_id)) {
          sessionsMap.set(row.session_id, {
            session: {
              id: row.session_id_int,
              sessionId: row.session_id,
              customerPhone: row.customer_phone,
              displayName: row.display_name,
              botType: row.bot_type,
              platform: row.platform,
              isHumanActive: row.is_human_active,
              tags: row.tags,
              unreadCount: row.unread_count,
              lastMessage: row.last_message,
              lastMessageAt: row.last_message_at,
              createdAt: row.session_created_at,
              updatedAt: row.session_updated_at
            },
            messages: []
          });
        }

        if (row.message_id !== null && row.message_id !== undefined) {
          sessionsMap.get(row.session_id).messages.push({
            id: row.message_id,
            role: row.role,
            message: row.message,
            isHuman: row.is_human,
            createdAt: row.message_created_at
          });
          totalMessages++;
        }
      }

      const sessionsList = Array.from(sessionsMap.values());
      console.log(`Structured into ${sessionsList.length} conversations (${totalMessages} messages total) for "${botType}".`);

      // Write to file
      console.log(`Saving to ${outputPath}...`);
      fs.writeFileSync(outputPath, JSON.stringify(sessionsList, null, 2), "utf8");
      console.log(`✅ Saved ${filename}`);
    }

    console.log("\n🎉 All conversations exported successfully!");

  } catch (err) {
    console.error("❌ Extraction failed:", err);
  } finally {
    await pool.end();
  }
}

main();
