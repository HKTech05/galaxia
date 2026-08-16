require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const path = require("path");
const chatRoute = require("./routes/chat");
const createInstagramRouter = require("./routes/instagram");
const adminRoute = require("./routes/admin");
const { getResponse, getMainMenu } = require("./services/menuEngine");
const { sendChatResponse } = require("./utils/whatsapp");
const db = require("./services/db");
const chatbotService = require("./services/ai/ChatbotService");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

/* =========================
   FEATURE FLAGS
========================= */
// Set to true when you have a real Meta access token and phone number ID
const WHATSAPP_LIVE = true;

/* =========================
   SOCKET.IO
========================= */
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

app.set("trust proxy", 1);
app.use(express.json());
app.use(cors());

/* =========================
   RATE LIMITER
========================= */
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/chat", limiter);
app.use("/chat", chatRoute);
app.use("/instagram", createInstagramRouter(io));
app.use("/api/admin/ai", adminRoute);

app.use("/widget", express.static(path.join(__dirname, "widget")));
app.use("/public", express.static(path.join(__dirname, "public")));

app.get("/api/menu", (req, res) => {
  const menuPath = path.join(__dirname, "public", "menu_items.json");
  if (require("fs").existsSync(menuPath)) {
    return res.sendFile(menuPath);
  }
  return res.status(404).json({ error: "Menu file not found." });
});

/* =========================
   ROOT & TEST INTERFACE
========================= */
app.get("/", (req, res) => {
  const testHtml = path.join(__dirname, "widget", "test.html");
  if (require("fs").existsSync(testHtml)) {
    return res.sendFile(testHtml);
  }
  res.send("<h1>Galaxia Chatbot V2 Running</h1>");
});

/* =========================
   WHATSAPP VERIFICATION
========================= */
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("WhatsApp webhook verified.");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

/* =========================
   INCOMING WHATSAPP MESSAGE
========================= */
app.post("/webhook", async (req, res) => {
  try {
    console.log("[WEBHOOK DEBUG] body:", JSON.stringify(req.body).substring(0, 500));
    const entry = req.body.entry?.[0];

    /* ── Instagram DMs arrive here too (same Meta App) ──
       Instagram payloads have entry.messaging[], WhatsApp has entry.changes[].
       Detect and forward to the Instagram handler. */
    if (entry?.messaging && !entry?.changes) {
      // Forward to Instagram webhook handler by re-dispatching internally
      req.url = "/instagram/webhook";
      return app.handle(req, res);
    }

    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    // Always acknowledge receipt to Meta
    res.sendStatus(200);

    if (!message) return;

    const phoneId = changes?.value?.metadata?.phone_number_id || "1117204771469353";
    if (phoneId === "1015208551685641") {
      console.log(`[WhatsApp] Message received on Galaxia OTP bot (${phoneId}) — skipping logging and auto-reply.`);
      return;
    }

    const from = message.from; // e.g. "919876543210"

    // Route by phone_number_id: Amstel Nest WA vs Digital Diaries WA
    const AMSTEL_NEST_PHONE_ID = process.env.WHATSAPP_AMSTELNEST_PHONE_ID || "1265812873275552";
    const isAmstelNest = phoneId === AMSTEL_NEST_PHONE_ID;
    const botType = isAmstelNest ? "amstel_nest" : "celebration";
    const sessionId = isAmstelNest ? `wa_an_${from}` : `wa_${from}`;

    let userText = "";

    // Extract user text from message
    if (message.type === "text") {
      userText = message.text?.body?.trim() || "";
    } else if (message.type === "interactive") {
      if (message.interactive.type === "button_reply") {
        userText = message.interactive.button_reply.id;
      } else if (message.interactive.type === "list_reply") {
        userText = message.interactive.list_reply.id;
      }
    } else {
      return; // Unhandled message type
    }

    if (!userText) return;

    console.log(`[WhatsApp] Message from ${from}: "${userText}"`);

    // 1. Get or create session
    let session = await db.getOrCreateSession(sessionId, from, phoneId, botType, "whatsapp");

    const isAiBot = botType === "celebration" || botType === "digital_diaries" || botType === "amstel_nest";

    // 2. Save user message to DB & emit to dashboard
    // For AI bots in human mode, we still need to save so admin can see the message
    let savedUserMsg = null;
    if (!isAiBot) {
      savedUserMsg = await db.saveMessage(sessionId, "user", userText, false);
      io.emit("new_message", {
        sessionId,
        message: savedUserMsg,
        session: await db.getSession(sessionId),
      });
    }

    // 4. Check if human mode is active — re-read from DB to avoid stale state
    session = await db.getSession(sessionId) || session;
    if (session.is_human_active) {
      console.log(`[WhatsApp] Human mode active for ${sessionId} — skipping bot reply.`);
      // For AI bots, save user message so admin sees it (ChatbotService won't run)
      if (isAiBot) {
        savedUserMsg = await db.saveMessage(sessionId, "user", userText, false);
        io.emit("new_message", {
          sessionId,
          message: savedUserMsg,
          session,
        });
      }
      return;
    }

    // 5. Generate bot reply
    let replyText = "";
    let responseObj = null;

    if (isAiBot) {
      // AI Chatbot V2 — route to correct bot type
      const aiBotType = botType === "amstel_nest" ? "amstel_nest" : "digital_diaries";
      console.log(`[WhatsApp] Routing to AI Chatbot V2 (${aiBotType}) for ${from}`);
      const aiResult = await chatbotService.processMessage(
        sessionId,
        userText,
        from,
        phoneId,
        aiBotType,
        "whatsapp"
      );
      // If human mode was caught inside ChatbotService, don't send a reply
      if (aiResult.humanModeSkipped) {
        console.log(`[WhatsApp] Human mode caught by ChatbotService for ${sessionId} — no reply sent.`);
        io.emit("session_updated", await db.getSession(sessionId));
        return;
      }
      replyText = aiResult.reply || "";
      responseObj = { message: replyText, options: [] };
    } else {
      // Staycation Menu Bot (Unswitched)
      const choice = userText.toLowerCase();
      const isGreeting = ["hi", "hello", "hey", "start", "menu"].includes(choice);
      responseObj = isGreeting
        ? getMainMenu(botType)
        : getResponse(choice, sessionId, botType);

      replyText = responseObj.message || "";
      if (responseObj.link) {
        replyText += `\n\n🔗 ${responseObj.link}`;
      }
      if (responseObj.options && responseObj.options.length > 0) {
        replyText +=
          "\n\n" +
          responseObj.options
            .map((opt, i) => `${i + 1}. ${opt.label}`)
            .join("\n");
      }
    }

    // Check for Human mode template trigger
    if (userText.toLowerCase() === "human" || replyText.includes("shifted to Human mode")) {
      console.log(`[WhatsApp] User ${from} requested/triggered human support — enabling human mode.`);
      await db.setHumanMode(sessionId, true);
      const updatedSession = await db.getSession(sessionId);
      io.emit("session_updated", updatedSession);
    }

    // Check for Collaboration template trigger (Enables Human Mode & adds 'collab' tag)
    if (userText.toLowerCase() === "collab" || replyText.includes("interest in collaborating with us")) {
      console.log(`[WhatsApp] User ${from} requested/triggered collab — enabling human mode & tagging session.`);
      await db.setHumanMode(sessionId, true);
      const currentSession = await db.getSession(sessionId);
      const currentTags = currentSession?.tags || [];
      if (!currentTags.includes("collab")) {
        const newTags = [...currentTags, "collab"];
        await db.updateTags(sessionId, newTags);
      }
      const updatedSession = await db.getSession(sessionId);
      io.emit("session_updated", updatedSession);
    }

    // 6. Save bot reply to DB (only for non-AI menu bots)
    if (!isAiBot) {
      const savedBotMsg = await db.saveMessage(sessionId, "assistant", replyText, false);
      io.emit("new_message", {
        sessionId,
        message: savedBotMsg,
        session: await db.getSession(sessionId),
      });
    } else {
      // Emit update so dashboard refreshes for AI bot reply
      io.emit("session_updated", await db.getSession(sessionId));
    }

    // 8. Send via WhatsApp API (only if live)
    if (WHATSAPP_LIVE) {
      console.log(`[WhatsApp] Sending reply to ${from} via Meta API...`);
      try {
        await sendChatResponse(from, responseObj || { message: replyText, options: [] }, botType, phoneId);
        console.log(`[WhatsApp] ✅ Reply sent successfully to ${from}`);
      } catch (sendErr) {
        console.error(`[WhatsApp] ❌ Failed to send reply to ${from}:`, sendErr.response?.status, sendErr.response?.data || sendErr.message);
      }
    } else {
      console.log(`[WhatsApp] WHATSAPP_LIVE=false — skipping Meta API send.`);
    }
  } catch (err) {
    console.error("WhatsApp webhook error:", err.message, err.stack);
  }
});

/* ===========================================================
   DASHBOARD REST APIs
   =========================================================== */

/**
 * GET /api/chats
 * List all chat sessions. Optional ?phone_number_id=xxx filter.
 */
app.get("/api/chats", async (req, res) => {
  try {
    const { phone_number_id } = req.query;
    const chats = await db.getChats(phone_number_id || null);
    res.json(chats);
  } catch (err) {
    console.error("GET /api/chats error:", err.message);
    res.status(500).json({ error: "Failed to fetch chats" });
  }
});

/**
 * GET /api/chats/:sessionId
 * Get all messages for a session + session metadata.
 */
app.get("/api/chats/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const [session, messages] = await Promise.all([
      db.getSession(sessionId),
      db.getChatMessages(sessionId),
    ]);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({ session, messages });
  } catch (err) {
    console.error("GET /api/chats/:sessionId error:", err.message);
    res.status(500).json({ error: "Failed to fetch chat" });
  }
});

/**
 * POST /api/chats/:sessionId/send
 * Admin sends a human message from the dashboard.
 */
app.post("/api/chats/:sessionId/send", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const session = await db.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Save admin message
    const savedMsg = await db.saveMessage(sessionId, "assistant", message.trim(), true);

    // Emit to dashboard
    io.emit("new_message", {
      sessionId,
      message: savedMsg,
      session: await db.getSession(sessionId),
    });

    // Send via the appropriate platform API
    if (session.platform === "instagram") {
      // Instagram session — send via Instagram Graph API
      const { sendInstagramText } = require("./utils/instagram");
      // Determine the correct token for this bot type
      const igTokenMap = {
        ambrose_ig: process.env.IG_TOKEN_AMBROSE,
        amstelnest_ig: process.env.IG_TOKEN_AMSTELNEST,
        laparaiso_ig: process.env.IG_TOKEN_LAPARAISO,
        mountview_ig: process.env.IG_TOKEN_MOUNTVIEW,
        heavenlyvilla_ig: process.env.IG_TOKEN_HEAVENLYVILLA,
        hillview_ig: process.env.IG_TOKEN_HILLVIEW,
      };
      const igToken = igTokenMap[session.bot_type] || process.env.INSTAGRAM_TOKEN;
      console.log(`[Admin Send] Sending to Instagram user ${session.customer_phone} (bot: ${session.bot_type})`);
      await sendInstagramText(session.customer_phone, message.trim(), igToken);
    } else if (WHATSAPP_LIVE) {
      // WhatsApp session — send via WhatsApp Cloud API (unchanged)
      const { sendChatResponse } = require("./utils/whatsapp");
      // Use the correct phone ID based on bot_type
      const phoneId = session.bot_type === "amstel_nest"
        ? (process.env.WHATSAPP_AMSTELNEST_PHONE_ID || "1265812873275552")
        : (process.env.WHATSAPP_PHONE_ID || session.phone_number_id);
      console.log(`[Admin Send] Sending to ${session.customer_phone} via phone_id=${phoneId}`);
      await sendChatResponse(
        session.customer_phone,
        { message: message.trim(), options: [] },
        session.bot_type || "celebration",
        phoneId
      );
    }

    res.json(savedMsg);
  } catch (err) {
    console.error("POST /api/chats/:sessionId/send error:", err.message);
    res.status(500).json({ error: "Failed to send message" });
  }
});

/**
 * PATCH /api/chats/:sessionId/mode
 * Toggle bot/human mode.
 */
app.patch("/api/chats/:sessionId/mode", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { is_human_active } = req.body;

    const updated = await db.setHumanMode(sessionId, !!is_human_active);
    if (!updated) {
      return res.status(404).json({ error: "Session not found" });
    }

    io.emit("session_updated", updated);
    res.json(updated);
  } catch (err) {
    console.error("PATCH /api/chats/:sessionId/mode error:", err.message);
    res.status(500).json({ error: "Failed to update mode" });
  }
});

/**
 * PATCH /api/chats/:sessionId/tags
 * Update tags for a session.
 */
app.patch("/api/chats/:sessionId/tags", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: "Tags must be an array" });
    }

    const updated = await db.updateTags(sessionId, tags);
    if (!updated) {
      return res.status(404).json({ error: "Session not found" });
    }

    io.emit("session_updated", updated);
    res.json(updated);
  } catch (err) {
    console.error("PATCH /api/chats/:sessionId/tags error:", err.message);
    res.status(500).json({ error: "Failed to update tags" });
  }
});

/**
 * PATCH /api/chats/:sessionId/read
 * Mark session as read.
 */
app.patch("/api/chats/:sessionId/read", async (req, res) => {
  try {
    const { sessionId } = req.params;
    await db.markRead(sessionId);

    const updated = await db.getSession(sessionId);
    io.emit("session_updated", updated);
    res.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/chats/:sessionId/read error:", err.message);
    res.status(500).json({ error: "Failed to mark read" });
  }
});

/* =========================
   START SERVER
========================= */
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO enabled.`);
  console.log(`Dashboard APIs: http://localhost:${PORT}/api/chats`);
  console.log(`WhatsApp Live: ${WHATSAPP_LIVE}`);
  console.log(`Test widget: http://localhost:${PORT}/widget/index.html`);
});
