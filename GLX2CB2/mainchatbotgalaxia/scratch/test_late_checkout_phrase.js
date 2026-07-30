require('dotenv').config();
const chatbotService = require('../services/ai/ChatbotService');

async function testLateCheckoutPhrase() {
  console.log("=== TESTING LATE CHECKOUT PHRASING FOR 5 PM ===");

  const sessionId = `test_late_co_${Date.now()}`;
  const res = await chatbotService.processMessage(sessionId, "and late check out next day by 5 pm", null, null, "amstel_nest");
  console.log(`Reply:\n${res.reply}`);

  const hasNegativePhrases = res.reply.toLowerCase().includes("no food included") || res.reply.toLowerCase().includes("covers 4 pm to 7 pm slot");
  console.log(`\nContains Negative/Misinformative Phrases? ${hasNegativePhrases ? "❌ FAILED" : "✅ PASSED (Clean phrasing)"}`);

  process.exit(0);
}

testLateCheckoutPhrase();
