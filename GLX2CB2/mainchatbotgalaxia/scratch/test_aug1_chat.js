require('dotenv').config();
const chatbotService = require('../services/ai/ChatbotService');

async function testAug1Chat() {
  console.log("=== SIMULATING EXACT USER QUERY: '1 august 1 night 2 adults' ===");

  const queries = [
    "1 august 1 night 2 adults",
    "is amstelnest available on 1st august?",
    "can I book standard cottage on 1st august?"
  ];

  for (const q of queries) {
    console.log(`\n--- Query: "${q}" ---`);
    const sessionId = `test_aug1_${Date.now()}`;
    const res = await chatbotService.processMessage(sessionId, q, null, null, "amstel_nest");
    console.log(`Reply:\n${res.reply}`);
  }

  process.exit(0);
}

testAug1Chat();
