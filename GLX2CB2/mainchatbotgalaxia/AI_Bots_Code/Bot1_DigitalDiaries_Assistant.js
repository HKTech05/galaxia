/**
 * Bot 1: Digital Diaries Assistant
 * Focuses strictly on Wadala private movie screenings, celebration setups, and package pricing.
 * Refuses staycation, hotel, or Karjat resort questions.
 */
const chatbotService = require("../galaxia-whatsapp-bot23/galaxia-whatsapp-bot2/services/ai/ChatbotService");

class DigitalDiariesAssistant {
  constructor() {
    this.botType = "digital_diaries";
    this.allowedCategories = ["Digital Diaries", "General"];
    this.refusalMessage = "I am the Digital Diaries Assistant and only handle Wadala movie screening bookings. For staycation bookings, please contact our staycation department.";
  }

  /**
   * Process incoming user queries.
   */
  async handleQuery(sessionId, userMessage, customerPhone = "test_phone") {
    const textLower = userMessage.toLowerCase().trim();

    // Check if query concerns Karjat staycations
    const stayKeywords = ["stay", "resort", "hotel", "cottage", "villa", "karjat", "amstel", "ambrose", "paraiso", "heavenly", "mount view", "hill view"];
    for (const kw of stayKeywords) {
      if (textLower.includes(kw)) {
        return {
          reply: this.refusalMessage,
          source: "Bot Refusal Rules",
          latency: 0,
          cached: false
        };
      }
    }

    // Direct to core ChatbotService with digital_diaries scope
    return chatbotService.processMessage(
      sessionId,
      userMessage,
      customerPhone,
      "widget_id",
      this.botType,
      "widget"
    );
  }
}

module.exports = new DigitalDiariesAssistant();
