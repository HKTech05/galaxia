require('dotenv').config();
const fs = require('fs');
const path = require('path');
const chatbotService = require('../services/ai/ChatbotService');

const testCases = [
  { id: 4, botType: 'digital_diaries', text: 'How to book more than 1 hour on website?', desc: 'DD >1 Hr UI Instructions (+ Icon)' },
  { id: 5, botType: 'digital_diaries', text: 'sandy screen me 1 hr se jyada booking kaise kare', desc: 'DD >1 Hr Hinglish Sandy Screen' },
  { id: 14, botType: 'amstel_nest', text: 'can 4 adults stay in standard cottage together?', desc: 'Standard Cottage Max 3 Adults Limit' }
];

async function runFresh() {
  for (const tc of testCases) {
    const sessionId = `fresh_test_${tc.id}_${Date.now()}`;
    const res = await chatbotService.processMessage(sessionId, tc.text, null, null, tc.botType);
    console.log(`\n=== TC ${tc.id}: ${tc.desc} ===`);
    console.log('REPLY:\n', res.reply);
  }
  process.exit(0);
}

runFresh();
