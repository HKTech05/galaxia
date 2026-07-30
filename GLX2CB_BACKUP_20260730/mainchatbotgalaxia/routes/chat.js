const express = require("express");
const router = express.Router();
const chatbotService = require("../services/ai/ChatbotService");

/**
 * POST /chat
 *
 * Website chat widget endpoint.
 * Accepts: { user: string, choice: string, message?: string, botType?: string }
 * Returns: { message, options: [] }
 */
router.post("/", async (req, res) => {
  try {
    const { user, choice, message, botType = "staycation" } = req.body;

    if (!user) {
      return res.status(400).json({ error: "Missing 'user' field." });
    }

    const userInput = message || choice || "";
    if (!userInput.trim()) {
      return res.json({
        message: "Hello! How can I assist you with Galaxia Resorts or Digital Diaries bookings today?",
        options: []
      });
    }

    // Map legacy botTypes
    let mappedBotType = botType;
    if (botType === "celebration") mappedBotType = "digital_diaries";

    console.log(`[ChatRoute] Processing message for user=${user}, botType=${mappedBotType}: "${userInput}"`);
    
    // Call ChatbotService
    const result = await chatbotService.processMessage(
      user,               // sessionId
      userInput,          // text
      user,               // customerPhone
      "widget_id",        // phoneNumberId
      mappedBotType,      // botType
      "widget"            // platform
    );

    return res.json({
      message: result.reply,
      options: [],
      latency: result.latency,
      cost: result.cost,
      cached: result.cached,
      tokenUsage: result.tokenUsage,
      promptTokens: result.tokenUsage?.prompt_tokens ?? 0,
      completionTokens: result.tokenUsage?.completion_tokens ?? 0,
      totalTokens: result.tokenUsage?.total_tokens ?? 0
    });

  } catch (err) {
    console.error("Chat route error:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

module.exports = router;