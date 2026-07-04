const { Pool } = require("pg");
const axios = require("axios");

// Connect using DATABASE_URL from EC2 .env
require("dotenv").config({ path: "/home/ec2-user/galaxia/wa-chatbot/.env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const STAYCATION_IG_BOTS = [
  "ambrose_ig",
  "amstelnest_ig",
  "laparaiso_ig",
  "mountview_ig",
  "heavenlyvilla_ig",
  "hillview_ig"
];

function getTokenForBot(botType) {
  const tokenMap = {
    ambrose_ig: process.env.IG_TOKEN_AMBROSE,
    amstelnest_ig: process.env.IG_TOKEN_AMSTELNEST,
    laparaiso_ig: process.env.IG_TOKEN_LAPARAISO,
    mountview_ig: process.env.IG_TOKEN_MOUNTVIEW,
    heavenlyvilla_ig: process.env.IG_TOKEN_HEAVENLYVILLA,
    hillview_ig: process.env.IG_TOKEN_HILLVIEW,
  };
  return tokenMap[botType] || process.env.INSTAGRAM_TOKEN;
}

const MSG_AMSTELNEST = `Hello! 👋

Thank you for contacting Amstel Nest (Galaxia Resorts).

If you have any queries or need assistance with your reservation, please feel free to WhatsApp us at: 📱 99877 34458

You can also explore our villas, check availability, and view details directly on our website:
🌐 https://www.galaxiaresorts.com/staycation

We look forward to hosting you! ✨`;

const MSG_OTHER_STAYCATION = `Hello! 👋

Thank you for contacting Galaxia Resorts Staycation.

If you have any queries or need assistance with your reservation, please feel free to WhatsApp us at: 📱 8169519564

You can also explore our villas, check availability, and view details directly on our website:
🌐 https://www.galaxiaresorts.com/staycation

We look forward to hosting you! ✨`;

async function sendMessage(recipientId, text, token) {
  if (!token) return { ok: false, error: "Missing token" };
  const host = token.startsWith("EAA") ? "https://graph.facebook.com" : "https://graph.instagram.com";
  try {
    const res = await axios.post(
      `${host}/v21.0/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );
    return { ok: true, data: res.data };
  } catch (err) {
    return { ok: false, status: err.response?.status, error: err.response?.data?.error?.message || err.message };
  }
}

async function runBroadcast() {
  console.log("=== Starting Staycation Instagram Broadcast ===");

  // 1. Fetch Human Flagged Staycation IG Conversations
  const humanRes = await pool.query(`
    SELECT session_id, customer_phone, bot_type, is_human_active, unread_count 
    FROM chat_sessions 
    WHERE platform = 'instagram' 
      AND bot_type = ANY($1) 
      AND is_human_active = true
  `, [STAYCATION_IG_BOTS]);

  console.log(`Found ${humanRes.rows.length} HUMAN-FLAGGED staycation IG conversations.`);

  let humanSuccess = 0;
  let humanFailed = 0;

  for (const session of humanRes.rows) {
    const text = session.bot_type === "amstelnest_ig" ? MSG_AMSTELNEST : MSG_OTHER_STAYCATION;
    const token = getTokenForBot(session.bot_type);
    const recipientId = session.customer_phone;

    console.log(`Sending to Human-flagged ${session.session_id} (${session.bot_type})...`);
    const res = await sendMessage(recipientId, text, token);

    // Save message to DB regardless so dashboard shows admin reply
    await pool.query(
      `INSERT INTO chat_messages (session_id, role, message, is_human) VALUES ($1, 'assistant', $2, true)`,
      [session.session_id, text]
    );
    await pool.query(
      `UPDATE chat_sessions SET last_message = $2, last_message_at = NOW() WHERE session_id = $1`,
      [session.session_id, text]
    );

    if (res.ok) {
      humanSuccess++;
      console.log(`  ✅ Delivered to ${recipientId}`);
    } else {
      humanFailed++;
      console.log(`  ⚠️ API Note for ${recipientId}: ${res.error}`);
    }
  }

  // 2. Fetch Unread (Non-Human) Staycation IG Conversations
  const unreadRes = await pool.query(`
    SELECT session_id, customer_phone, bot_type, is_human_active, unread_count 
    FROM chat_sessions 
    WHERE platform = 'instagram' 
      AND bot_type = ANY($1) 
      AND (is_human_active = false OR is_human_active IS NULL)
      AND unread_count > 0
  `, [STAYCATION_IG_BOTS]);

  console.log(`\nFound ${unreadRes.rows.length} UNREAD (Non-Human) staycation IG conversations.`);

  let unreadSuccess = 0;
  let unreadFailed = 0;

  for (const session of unreadRes.rows) {
    const text = session.bot_type === "amstelnest_ig" ? MSG_AMSTELNEST : MSG_OTHER_STAYCATION;
    const token = getTokenForBot(session.bot_type);
    const recipientId = session.customer_phone;

    console.log(`Sending to Unread ${session.session_id} (${session.bot_type})...`);
    const res = await sendMessage(recipientId, text, token);

    // Save message to DB
    await pool.query(
      `INSERT INTO chat_messages (session_id, role, message, is_human) VALUES ($1, 'assistant', $2, true)`,
      [session.session_id, text]
    );
    await pool.query(
      `UPDATE chat_sessions SET last_message = $2, last_message_at = NOW(), unread_count = 0 WHERE session_id = $1`,
      [session.session_id, text]
    );

    if (res.ok) {
      unreadSuccess++;
      console.log(`  ✅ Delivered to ${recipientId}`);
    } else {
      unreadFailed++;
      console.log(`  ⚠️ API Note for ${recipientId}: ${res.error}`);
    }
  }

  console.log("\n=== BROADCAST COMPLETE SUMMARY ===");
  console.log(`Human Flagged: ${humanRes.rows.length} processed (${humanSuccess} API delivered, ${humanFailed} window-restricted/logged)`);
  console.log(`Unread Convos: ${unreadRes.rows.length} processed (${unreadSuccess} API delivered, ${unreadFailed} window-restricted/logged)`);

  await pool.end();
}

runBroadcast().catch(e => console.error("Broadcast error:", e));
