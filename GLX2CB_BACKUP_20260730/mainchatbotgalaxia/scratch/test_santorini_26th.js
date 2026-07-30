require('dotenv').config();
const chatbotService = require('../services/ai/ChatbotService');

async function testSantorini26th() {
  console.log('=== TESTING QUERY: "santorini 26th" ===');
  const res = await chatbotService.processMessage('test_santorini_26th_' + Date.now(), 'santorini 26th', null, null, 'amstel_nest');
  console.log('\n--- FINAL REPLY ---\n', res.reply);
  process.exit(0);
}

testSantorini26th();
