const { Pool } = require("pg");
const axios = require("axios");

require("dotenv").config({ path: "/home/ec2-user/galaxia/wa-chatbot/.env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const PROPERTY_NAMES = {
  amstelnest_ig: "Amstel Nest",
  ambrose_ig: "Ambrose",
  laparaiso_ig: "La Paraiso",
  mountview_ig: "Mount View",
  heavenlyvilla_ig: "Heavenly Villa",
  hillview_ig: "Hill View"
};

const PHONE_NUMBERS = {
  amstelnest_ig: "+91 99877 34458",
  ambrose_ig: "+91 8169519564",
  laparaiso_ig: "+91 8169519564",
  mountview_ig: "+91 8169519564",
  heavenlyvilla_ig: "+91 8169519564",
  hillview_ig: "+91 8169519564"
};

function getTokenForBot(botType) {
  const tokenMap = {
    ambrose_ig: process.env.IG_TOKEN_AMBROSE,
    amstelnest_ig: process.env.IG_TOKEN_AMSTELNEST,
    laparaiso_ig: process.env.IG_TOKEN_LAPARAISO,
    mountview_ig: process.env.IG_TOKEN_MOUNTVIEW,
    heavenlyvilla_ig: process.env.IG_TOKEN_HEAVENLYVILLA,
    hillview_ig: process.env.IG_TOKEN_HILLVIEW,
    celebration: process.env.INSTAGRAM_TOKEN
  };
  return tokenMap[botType] || process.env.INSTAGRAM_TOKEN;
}

function getMessageForBot(botType) {
  if (botType === "celebration") {
    return `Hello!

Make your special moments unforgettable at Digital Diaries – Your Private Movie Screening Experience in Mumbai.

Perfect for birthdays, anniversaries, proposals, date nights, and surprise celebrations with a private theatre setup.

For bookings & enquiries:
📞 Whatsapp or Call: +91 98922 94042

Book your slot today and create memories that last forever!`;
  }

  const propName = PROPERTY_NAMES[botType] || "Galaxia Resorts";
  const phone = PHONE_NUMBERS[botType] || "+91 8169519564";

  return `Hello!

Planning a weekend getaway?

Escape to ${propName} and enjoy private pool villas, indoor pool cottages, and scenic mountain-view stays—perfect for couples, families, and groups.

For bookings & enquiries:
📞 ${phone}

Book now and make your next getaway unforgettable!`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

async function runMarketingBroadcast() {
  console.log("=== Starting Comprehensive Instagram Marketing Broadcast ===");

  // Fetch ALL Instagram conversations (Staycation + Digital Diaries)
  const res = await pool.query(`
    SELECT session_id, customer_phone, bot_type, is_human_active 
    FROM chat_sessions 
    WHERE platform = 'instagram' 
    ORDER BY last_message_at DESC
  `);

  const totalConvos = res.rows.length;
  console.log(`Loaded ${totalConvos} total Instagram conversations.`);

  let successCount = 0;
  let windowRestrictedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < totalConvos; i++) {
    const session = res.rows[i];
    const text = getMessageForBot(session.bot_type);
    const token = getTokenForBot(session.bot_type);
    const recipientId = session.customer_phone;

    // Send DM via API
    const apiRes = await sendMessage(recipientId, text, token);

    // Save message to DB for dashboard tracking
    try {
      await pool.query(
        `INSERT INTO chat_messages (session_id, role, message, is_human) VALUES ($1, 'assistant', $2, true)`,
        [session.session_id, text]
      );
      await pool.query(
        `UPDATE chat_sessions SET last_message = $2, last_message_at = NOW() WHERE session_id = $1`,
        [session.session_id, text]
      );
    } catch (dbErr) {
      console.error(`DB Update Error for ${session.session_id}:`, dbErr.message);
    }

    if (apiRes.ok) {
      successCount++;
    } else if (apiRes.error && apiRes.error.includes("outside of allowed window")) {
      windowRestrictedCount++;
    } else {
      errorCount++;
    }

    // Progress logging every 100 items
    if ((i + 1) % 100 === 0 || i === totalConvos - 1) {
      console.log(`Progress: ${i + 1}/${totalConvos} | Delivered: ${successCount} | Window Restricted: ${windowRestrictedCount} | Errors: ${errorCount}`);
    }

    // Safety Rate-Limiting Delay (150ms between requests)
    await sleep(150);
  }

  console.log("\n=== MARKETING BROADCAST COMPLETE ===");
  console.log(`Total Conversations Processed: ${totalConvos}`);
  console.log(`API Delivered (Active 24h Window): ${successCount}`);
  console.log(`Dashboard Saved & Logged (Outside 24h Window): ${windowRestrictedCount}`);
  console.log(`Other Errors: ${errorCount}`);

  await pool.end();
}

runMarketingBroadcast().catch(e => console.error("Marketing Broadcast Error:", e));
