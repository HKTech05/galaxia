require('dotenv').config();
const chatbotService = require('../services/ai/ChatbotService');

async function testBotReply() {
  console.log("=== TESTING FULL CHATBOT REPLY FOR SANTORINI ON JUL 26 ===");
  const res = await chatbotService.processMessage('test_ist_fix_' + Date.now(), 'is santorini available on 26th July?', null, null, 'staycation');
  console.log('BOT REPLY:\n', res.reply);
  process.exit(0);
}

testBotReply();
