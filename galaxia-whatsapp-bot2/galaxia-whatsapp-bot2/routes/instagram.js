const express = require("express");
const router = express.Router();
const axios = require("axios");
const { getResponse, getMainMenu } = require("../services/menuEngine");

const PAGE_ACCESS_TOKEN = process.env.INSTAGRAM_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

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
 */
router.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (!messaging) return res.sendStatus(200);

    const senderId = messaging.sender?.id;
    if (!senderId) return res.sendStatus(200);

    // Get the user's choice from message text or quick_reply payload
    let choice = null;

    if (messaging.message?.quick_reply?.payload) {
      choice = messaging.message.quick_reply.payload;
    } else if (messaging.message?.text) {
      const text = messaging.message.text.toLowerCase().trim();
      // Map common greetings to main menu
      if (["hi", "hello", "hey", "start", "menu"].includes(text)) {
        choice = "main";
      } else {
        choice = text;
      }
    }

    if (!choice) return res.sendStatus(200);

    // Get chatbot response
    const response = choice === "main"
      ? getMainMenu()
      : getResponse(choice, `ig_${senderId}`);

    // Build message with quick replies
    let msgText = response.message;
    if (response.link) {
      msgText += `\n\n🔗 ${response.link}`;
    }

    const quickReplies = (response.options || []).slice(0, 13).map(opt => ({
      content_type: "text",
      title: opt.label.substring(0, 20),
      payload: opt.value
    }));

    // Send reply via Instagram Graph API
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages`,
      {
        recipient: { id: senderId },
        message: {
          text: msgText,
          ...(quickReplies.length > 0 && { quick_replies: quickReplies })
        }
      },
      {
        headers: {
          Authorization: `Bearer ${PAGE_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.sendStatus(200);
  } catch (err) {
    console.error("Instagram webhook error:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

module.exports = router;
