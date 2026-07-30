require('dotenv').config();
const chatbotService = require('../services/ai/ChatbotService');

async function test3NewRules() {
  console.log("=== TESTING 3 NEW RULES FOR DIGITAL DIARIES ===");

  const tests = [
    { title: "1. Balloons Only Add-on Query", input: "agar mujhe sirf balloons chahiye toh", botType: "digital_diaries" },
    { title: "2. Drinking & Smoking Policy Query", input: "drinking and smoking kar sakte hai", botType: "digital_diaries" },
    { title: "3. Unanswered Phone Call Query", input: "nai utha rahe hai call", botType: "digital_diaries" }
  ];

  for (const t of tests) {
    console.log(`\n--- ${t.title} ---`);
    console.log(`User Input: "${t.input}"`);
    const res = await chatbotService.processMessage('test_3r_' + Date.now(), t.input, null, null, t.botType);
    console.log(`Bot Response:\n${res.reply}\n`);
  }

  process.exit(0);
}

test3NewRules();
