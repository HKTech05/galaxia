/**
 * Instagram DM Webhook Route
 *
 * Handles incoming Instagram DMs for BOTH Digital Diaries and 6 Staycation IG bots.
 * Routes each message to the correct bot type based on the recipient (page) ID.
 * Integrates with the dashboard via Socket.IO and persists chats to the database.
 *
 * NOTE: WhatsApp code is NOT touched. This is a completely separate route.
 */

const express = require("express");
const router = express.Router();
const { getResponse, getMainMenu, IG_BOT_TYPES } = require("../services/menuEngine");
const { sendInstagramReply } = require("../utils/instagram");
const db = require("../services/db");

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const axios = require("axios");

// Socket.IO instance — injected by server.js via module.exports function
let io = null;

/* ── IG Page → Bot Type Mapping ──────────────────────────
   Each Instagram page has a unique Page ID. The webhook payload
   contains the recipient page ID so we can route to the right bot.
   
   Env vars: IG_ACCOUNT_ID_AMBROSE, IG_ACCOUNT_ID_AMSTELNEST, etc.
   Until these are configured, we fall back to "celebration" (DD).
   ────────────────────────────────────────────────────────── */
function getBotTypeForPage(recipientPageId) {
  const mapping = {
    [process.env.IG_ACCOUNT_ID_AMBROSE]: "ambrose_ig",
    [process.env.IG_ACCOUNT_ID_AMSTELNEST]: "amstelnest_ig",
    [process.env.IG_ACCOUNT_ID_LAPARAISO]: "laparaiso_ig",
    [process.env.IG_ACCOUNT_ID_MOUNTVIEW]: "mountview_ig",
    [process.env.IG_ACCOUNT_ID_HEAVENLYVILLA]: "heavenlyvilla_ig",
    [process.env.IG_ACCOUNT_ID_HILLVIEW]: "hillview_ig",
  };

  // Remove undefined keys
  const pageId = recipientPageId?.toString();
  if (pageId && mapping[pageId]) {
    return mapping[pageId];
  }

  // Default: Digital Diaries
  return "celebration";
}

/* ── IG Page → phone_number_id for dashboard routing ───── */
function getPhoneNumberIdForBot(botType) {
  const map = {
    ambrose_ig: "ig_ambrose",
    amstelnest_ig: "ig_amstelnest",
    laparaiso_ig: "ig_laparaiso",
    mountview_ig: "ig_mountview",
    heavenlyvilla_ig: "ig_heavenlyvilla",
    hillview_ig: "ig_hillview",
    celebration: "instagram",
  };
  return map[botType] || "instagram";
}

/* ── Get the correct Instagram token for each bot ──────── */
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

/**
 * Fetch Instagram username for an IGSID.
 * Returns "@username" or null if unavailable.
 */
async function fetchIgUsername(igsid, token) {
  try {
    const accessToken = token || process.env.INSTAGRAM_TOKEN;
    if (!accessToken) return null;
    const host = accessToken.startsWith("EAA") ? "https://graph.facebook.com" : "https://graph.instagram.com";
    const res = await axios.get(
      `${host}/v21.0/${igsid}`,
      { params: { fields: "name,username", access_token: accessToken } }
    );
    if (res.data?.username) return `@${res.data.username}`;
    if (res.data?.name) return res.data.name;
    return null;
  } catch (err) {
    console.log(`[Instagram] Could not fetch username for ${igsid}:`, err.response?.data?.error?.message || err.message);
    return null;
  }
}

/**
 * Initialize the router with the Socket.IO instance.
 * Called once from server.js.
 */
function createInstagramRouter(socketIo) {
  io = socketIo;
  return router;
}

/**
 * GET /instagram/webhook
 * Meta webhook verification (same verify token as WhatsApp).
 */
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Instagram webhook verified.");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/**
 * POST /instagram/webhook
 * Handle incoming Instagram DMs and send quick-reply responses.
 * Routes to the correct property bot based on recipient page ID.
 */
router.post("/webhook", async (req, res) => {
  try {
    // Always acknowledge receipt to Meta immediately
    res.sendStatus(200);
    console.log("[IG WEBHOOK] body:", JSON.stringify(req.body).substring(0, 500));

    const entry = req.body.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (!messaging) return;

    const senderId = messaging.sender?.id;
    const recipientId = messaging.recipient?.id;
    if (!senderId) return;

    // Ignore echo messages (messages sent BY the page, not TO the page)
    if (messaging.message?.is_echo) return;

    // Get the user's choice from message text or quick_reply payload
    let userText = null;

    if (messaging.message?.quick_reply?.payload) {
      userText = messaging.message.quick_reply.payload;
    } else if (messaging.message?.text) {
      userText = messaging.message.text.trim();
    }

    if (!userText) return;

    // Determine which bot to use based on recipient page ID
    const botType = getBotTypeForPage(recipientId);
    const phoneNumberId = getPhoneNumberIdForBot(botType);
    const igToken = getTokenForBot(botType);

    console.log(`[Instagram] Message from ${senderId} to page ${recipientId} → bot: ${botType}`);

    const sessionId = `ig_${botType}_${senderId}`;

    // 1. Get or create session (platform = "instagram")
    const session = await db.getOrCreateSession(sessionId, senderId, phoneNumberId, botType, "instagram");

    // 1b. If new session, try to fetch and store the Instagram username
    if (session.display_name === senderId || !session.display_name) {
      const igName = await fetchIgUsername(senderId, igToken);
      if (igName) {
        await db.pool.query(
          `UPDATE chat_sessions SET display_name = $2 WHERE session_id = $1`,
          [sessionId, igName]
        );
        session.display_name = igName;
        console.log(`[Instagram] Updated display name for ${senderId} → ${igName}`);
      }
    }

    // 2. Save user message to DB
    const savedUserMsg = await db.saveMessage(sessionId, "user", userText, false);

    // 3. Emit user message to dashboard via Socket.IO
    if (io) {
      io.emit("new_message", {
        sessionId,
        message: savedUserMsg,
        session: await db.getSession(sessionId),
      });
    }

    // 4. Check if human mode is active — if so, don't auto-reply
    if (session.is_human_active) {
      console.log(`[Instagram] Human mode active for ${sessionId} — skipping bot reply.`);
      return;
    }

    // 5. Generate bot reply using the menu engine
    const choice = userText.toLowerCase();
    const isGreeting = ["hi", "hello", "hey", "start", "menu"].includes(choice);
    const response = isGreeting
      ? getMainMenu(botType)
      : getResponse(choice, sessionId, botType);

    // 5b. If user chose "human", auto-enable human mode
    if (choice === "human") {
      console.log(`[Instagram] User ${senderId} requested human support — enabling human mode.`);
      await db.setHumanMode(sessionId, true);
      if (io) {
        const updatedSession = await db.getSession(sessionId);
        io.emit("session_updated", updatedSession);
      }
    }

    // 5c. If user chose "collab", flag the session with collab tag
    if (choice === "collab") {
      console.log(`[Instagram] User ${senderId} requested collab — tagging session.`);
      const currentSession = await db.getSession(sessionId);
      const currentTags = currentSession?.tags || [];
      if (!currentTags.includes("collab")) {
        const newTags = [...currentTags, "collab"];
        await db.updateTags(sessionId, newTags);
        if (io) {
          const updatedSession = await db.getSession(sessionId);
          io.emit("session_updated", updatedSession);
        }
      }
    }

    // Build reply text for DB storage
    let replyText = response.message || "";
    if (response.link) {
      replyText += `\n\n🔗 ${response.link}`;
    }
    if (response.options && response.options.length > 0) {
      replyText +=
        "\n\n" +
        response.options
          .map((opt, i) => `${i + 1}. ${opt.label}`)
          .join("\n");
      replyText += "\n\n👇 Please select one of the options below to proceed:";
    }

    // 6. Save bot reply to DB
    const savedBotMsg = await db.saveMessage(sessionId, "assistant", replyText, false);

    // 7. Emit bot reply to dashboard
    if (io) {
      io.emit("new_message", {
        sessionId,
        message: savedBotMsg,
        session: await db.getSession(sessionId),
      });
    }

    // 8. Send via Instagram Graph API (use the correct token for this bot)
    console.log(`[Instagram] Sending reply to ${senderId} via Instagram API (bot: ${botType})...`);
    await sendInstagramReply(senderId, response, botType, igToken);

  } catch (err) {
    console.error("Instagram webhook error:", err.response?.data || err.message, err.stack);
  }
});

module.exports = createInstagramRouter;
