require("dotenv").config();
const express = require("express");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const path = require("path");
const chatRoute = require("./routes/chat");
const instagramRoute = require("./routes/instagram");
const { getResponse, getMainMenu } = require("./services/menuEngine");
const { sendChatResponse } = require("./utils/whatsapp");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(express.json());

// Enable CORS for the chat widget
app.use(cors());

/* =========================
   RATE LIMITER
========================= */
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/chat", limiter);
app.use("/chat", chatRoute);
app.use("/instagram", instagramRoute);

/* =========================
   SERVE WIDGET FILES
========================= */
app.use("/widget", express.static(path.join(__dirname, "widget")));

/* =========================
   ROOT
========================= */
app.get("/", (req, res) => {
  res.send(`
    <h1>Galaxia Multi-Platform Chatbot is Running</h1>
    <p>Endpoints:</p>
    <ul>
      <li>POST <code>/chat</code> - Website widget API</li>
      <li>GET/POST <code>/webhook</code> - WhatsApp Cloud API Webhook</li>
      <li>GET/POST <code>/instagram/webhook</code> - Instagram Graph API Webhook</li>
      <li>GET <code>/widget/index.html</code> - Test the Chat Widget</li>
    </ul>
  `);
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
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    // Always acknowledge receipt to Meta
    res.sendStatus(200);

    if (!message) return;

    const from = message.from;
    const phoneId = changes?.value?.metadata?.phone_number_id;
    
    let botType = "staycation";
    if (phoneId && phoneId === process.env.WHATSAPP_CELEBRATION_PHONE_ID) {
      botType = "celebration";
    }

    let choice = "main"; // default fallback

    // Map user input to choice
    if (message.type === "text") {
      const text = message.text?.body?.toLowerCase()?.trim() || "";
      if (["hi", "hello", "hey", "start", "menu"].includes(text)) {
        choice = "main";
      } else {
        choice = text; // Though we expect buttons, fallback to text matching if they type
      }
    } else if (message.type === "interactive") {
      if (message.interactive.type === "button_reply") {
        choice = message.interactive.button_reply.id;
      } else if (message.interactive.type === "list_reply") {
        choice = message.interactive.list_reply.id;
      }
    } else {
      // Unhandled message type
      return;
    }

    console.log(`[WhatsApp] Processing choice '${choice}' from ${from} (Bot: ${botType})`);

    // Get chatbot response
    const response = choice === "main" 
      ? getMainMenu(botType) 
      : getResponse(choice, `wa_${from}`, botType);

    // Send back to WhatsApp
    await sendChatResponse(from, response, botType, phoneId);

  } catch (err) {
    console.error("WhatsApp webhook error:", err.response?.data || err.message);
  }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test widget: http://localhost:${PORT}/widget/index.html`);
});
