require('dotenv').config();
const chatbotService = require('../services/ai/ChatbotService');
const dynamicDataService = require('../services/ai/DynamicDataService');

async function debugFull() {
  console.log("=== STEP 1: Direct Service Call for July 26th ===");
  const avail26 = await dynamicDataService.checkStaycationAvailability('ambrose', '2026-07-26', '2026-07-27', 'santorini');
  console.log('Avail 26th:\n', JSON.stringify(avail26, null, 2));

  console.log("\n=== STEP 2: Chatbot Intent & Context Generation for July 26th ===");
  const res = await chatbotService.processMessage('debug_full_' + Date.now(), 'is santorini available on 26th July?', null, null, 'staycation');
  console.log('Chatbot Reply:\n', res.reply);

  process.exit(0);
}

debugFull();
