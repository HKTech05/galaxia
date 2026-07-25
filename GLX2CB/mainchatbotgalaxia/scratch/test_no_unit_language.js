require('dotenv').config();
const chatbotService = require('../services/ai/ChatbotService');

async function testNoUnitLanguage() {
  console.log("=== TESTING PROHIBITION OF 'UNIT' LANGUAGE ===");

  const queries = [
    { label: "1. DD Availability Query", input: "kab available hai sandy screen 25th July", botType: "digital_diaries" },
    { label: "2. Explicit Screen Quantity Question", input: "how many sandy screens exist?", botType: "digital_diaries" },
    { label: "3. Staycation Single Villa Query", input: "is santorini available on 26th July?", botType: "staycation" }
  ];

  for (const q of queries) {
    console.log(`\n--- ${q.label} ---`);
    console.log(`Query: "${q.input}"`);
    const res = await chatbotService.processMessage('test_unit_lang_' + Date.now(), q.input, null, null, q.botType);
    console.log(`Bot Response:\n${res.reply}\n`);
    if (res.reply.toLowerCase().includes("unit")) {
      console.error("FAIL: The word 'unit' was used in the response!");
    } else {
      console.log("PASS: No 'unit' wording found!");
    }
  }

  process.exit(0);
}

testNoUnitLanguage();
