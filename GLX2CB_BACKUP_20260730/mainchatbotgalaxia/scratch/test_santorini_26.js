require('dotenv').config();
const chatbotService = require('../services/ai/ChatbotService');

async function testSantorini26() {
  console.log('=== TESTING QUERY: "santorini 26" ===');
  const res = await chatbotService.processMessage('test_santorini_26_' + Date.now(), 'santorini 26', null, null, 'staycation');
  console.log('\n--- CHATBOT REPLY ---\n', res.reply);
  process.exit(0);
}

testSantorini26();
