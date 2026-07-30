/**
 * Bot 2: Amstel Nest Primary Assistant
 * Focuses on Karjat staycation villas, prioritizing Amstel Nest pool cottages in recommendations.
 * Refuses Wadala movie screening, private theater, or Digital Diaries questions.
 */
const chatbotService = require("../galaxia-whatsapp-bot23/galaxia-whatsapp-bot2/services/ai/ChatbotService");

class AmstelNestAssistant {
  constructor() {
    this.botType = "amstel_nest";
    this.allowedCategories = [
      "Staycation/Amstel Nest",
      "Staycation/General",
      "General"
    ];
    this.refusalMessage = "I am the Staycation Assistant and only handle Karjat staycation villa bookings. For Wadala movie screening bookings, please contact our Digital Diaries department.";
  }

  /**
   * Process incoming user queries.
   */
  async handleQuery(sessionId, userMessage, customerPhone = "test_phone") {
    const textLower = userMessage.toLowerCase().trim();

    // Check if query concerns Wadala Digital Diaries private theater
    const diariesKeywords = ["wadala", "private theater", "private screening", "movie time", "celebration package", "sandy screen", "cine love", "park n watch", "baywatch"];
    for (const kw of diariesKeywords) {
      if (textLower.includes(kw)) {
        return {
          reply: this.refusalMessage,
          source: "Bot Refusal Rules",
          latency: 0,
          cached: false
        };
      }
    }

    // Direct to core ChatbotService with amstel_nest scope
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

module.exports = new AmstelNestAssistant();
