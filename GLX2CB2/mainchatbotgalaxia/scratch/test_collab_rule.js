require('dotenv').config();
const chatbotService = require('../services/ai/ChatbotService');

async function testCollabRule() {
  console.log("=== TESTING COLLABORATION / PROMOTION RULE ACROSS BOTS ===");

  const tests = [
    { title: "1. Instagram Collab Query (DD)", input: "can we do instagram collab?", botType: "digital_diaries" },
    { title: "2. Advertising Inquiry (Staycation)", input: "I want to advertise my brand with you", botType: "staycation" },
    { title: "3. Partnership Query (Amstel Nest)", input: "do you accept influencer brand partnerships?", botType: "amstel_nest" }
  ];

  for (const t of tests) {
    console.log(`\n--- ${t.title} ---`);
    console.log(`User Input: "${t.input}"`);
    const res = await chatbotService.processMessage('test_collab_' + Date.now(), t.input, null, null, t.botType);
    console.log(`Bot Response:\n${res.reply}\n`);
    if (res.reply.includes("Thank you for your interest in collaborating with us!")) {
      console.log("PASS: Exact collaboration template returned!");
    } else {
      console.error("FAIL: Template message missing!");
    }
  }

  process.exit(0);
}

testCollabRule();
