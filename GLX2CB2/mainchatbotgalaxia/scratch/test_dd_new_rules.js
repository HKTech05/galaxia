require('dotenv').config();
const chatbotService = require('../services/ai/ChatbotService');

async function testAllDdRules() {
  console.log("=== TESTING ALL DIGITAL DIARIES NEW RULES ===");

  const tests = [
    { title: "1. Smoking Policy", input: "can I smoke inside sandy screen?", botType: "digital_diaries" },
    { title: "2. Capacities & Dimensions", input: "what is the room size and capacity of cine love?", botType: "digital_diaries" },
    { title: "3. 18+ Age Restriction", input: "16 years allowed hai?", botType: "digital_diaries" },
    { title: "4. Slot-based Smart Availability", input: "kab available hai sandy screen 25th July", botType: "digital_diaries" },
    { title: "5. Payment Structure", input: "how payment works for digital diaries?", botType: "digital_diaries" },
    { title: "6. Full Cash Payment Options", input: "can I pay full cash for my booking?", botType: "digital_diaries" },
    { title: "7. Phone Call Inquiry (+91 98922 94042)", input: "can I call you on phone for inquiry?", botType: "digital_diaries" },
    { title: "8. Human Escalation Mode", input: "I want to speak to a human admin", botType: "digital_diaries" }
  ];

  for (const t of tests) {
    console.log(`\n--- ${t.title} ---`);
    console.log(`User Input: "${t.input}"`);
    const res = await chatbotService.processMessage('test_dd_' + Date.now(), t.input, null, null, t.botType);
    console.log(`Bot Reply:\n${res.reply}\n`);
  }

  process.exit(0);
}

testAllDdRules();
