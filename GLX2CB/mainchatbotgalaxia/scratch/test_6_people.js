require('dotenv').config();
const chatbotService = require('../services/ai/ChatbotService');

async function test6People() {
  console.log("=== TESTING 6 PEOPLE QUERY ON DIGITAL DIARIES ===");
  const res = await chatbotService.processMessage('test_6p_' + Date.now(), 'and main 6 logo ko leke aa sakti hu', null, null, 'digital_diaries');
  console.log('Bot Response:\n', res.reply);
  process.exit(0);
}

test6People();
