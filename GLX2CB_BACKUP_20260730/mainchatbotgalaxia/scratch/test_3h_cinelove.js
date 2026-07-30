require('dotenv').config();
const chatbotService = require('../services/ai/ChatbotService');

async function test3hCinelove() {
  console.log("=== TESTING 3 HOUR CINELOVE QUERY ON DIGITAL DIARIES ===");
  const input = "ajj ke liye konse slots available hai for 3 hours in cinelove";
  console.log(`User Input: "${input}"`);
  const res = await chatbotService.processMessage('test_3h_' + Date.now(), input, null, null, 'digital_diaries');
  console.log('\n--- CHATBOT RESPONSE ---\n', res.reply);
  
  if (res.reply.includes("8-11") || res.reply.includes("11 PM") || res.reply.includes("11PM") || res.reply.includes("10-11")) {
    console.error("\nFAIL: Response contained invalid slot past 10 PM!");
  } else {
    console.log("\nPASS: Slots properly capped at 10 PM!");
  }

  process.exit(0);
}

test3hCinelove();
