require('dotenv').config();
const fs = require('fs');
const path = require('path');
const chatbotService = require('../services/ai/ChatbotService');

const testCases = [
  // DIGITAL DIARIES (BOT 1)
  { id: 1, botType: 'digital_diaries', text: 'hii', desc: 'DD Greeting Template' },
  { id: 2, botType: 'digital_diaries', text: 'santorini available on 26?', desc: 'DD Staycation Refusal (Santorini)' },
  { id: 3, botType: 'digital_diaries', text: 'bamboosa price?', desc: 'DD Staycation Refusal (Bamboosa)' },
  { id: 4, botType: 'digital_diaries', text: 'How to book more than 1 hour', desc: 'DD >1 Hr UI Instructions (+ Icon)' },
  { id: 5, botType: 'digital_diaries', text: 'meko 1 hr se jyada booking chahiye sandy ki', desc: 'DD >1 Hr Hinglish Sandy Screen' },
  { id: 6, botType: 'digital_diaries', text: 'can i add cake in movie time?', desc: 'DD Movie Time Cake Add-on' },
  { id: 7, botType: 'digital_diaries', text: 'is cake included in celebration package?', desc: 'DD Celebration Package Cake Wording' },
  { id: 8, botType: 'digital_diaries', text: 'can i book 2 sandy screens?', desc: 'DD Single Unit Screen Limit' },
  { id: 9, botType: 'digital_diaries', text: 'send food menu', desc: 'DD Direct Clickable Menu Link' },
  { id: 10, botType: 'digital_diaries', text: 'is sandy screen free on 28th July?', desc: 'DD Full Day DB Availability Check' },

  // AMSTEL NEST (BOT 2)
  { id: 11, botType: 'amstel_nest', text: 'hii', desc: 'Amstel Nest Greeting Template' },
  { id: 12, botType: 'amstel_nest', text: 'wadala movie time price?', desc: 'Amstel Nest DD Refusal' },
  { id: 13, botType: 'amstel_nest', text: 'price', desc: 'Amstel Nest Single-Property Price Inquiry' },
  { id: 14, botType: 'amstel_nest', text: 'can 4 adults stay in standard cottage?', desc: 'Standard Cottage Max 3 Adults Limit' },
  { id: 15, botType: 'amstel_nest', text: 'can 6 adults stay in family cottage?', desc: 'Family Cottage Max 6 Adults Limit' },
  { id: 16, botType: 'amstel_nest', text: 'can we book 2 standard cottages for 25th July?', desc: 'Amstel Nest Multi-Unit DB Availability' },
  { id: 17, botType: 'amstel_nest', text: 'can we book 2 family cottages?', desc: 'Family Cottage Single Unit Limit' },
  { id: 18, botType: 'amstel_nest', text: 'show menu', desc: 'Amstel Nest Food Menu Link' },

  // STAYCATION GENERAL (BOT 3)
  { id: 19, botType: 'staycation', text: 'hello', desc: 'Staycation Greeting Template' },
  { id: 20, botType: 'staycation', text: 'price', desc: 'Staycation Generic Price Overview' },
  { id: 21, botType: 'staycation', text: 'tell me rates for bollywood theme', desc: 'Ambrose Specific Theme Villa (Take-1)' },
  { id: 22, botType: 'staycation', text: 'greek theme price', desc: 'Ambrose Specific Theme Villa (Santorini)' },
  { id: 23, botType: 'staycation', text: 'is santorini available on 26th July?', desc: 'Real-Time DB Calendar Check (Santorini Sold Out)' },
  { id: 24, botType: 'staycation', text: 'how many adults in bamboosa?', desc: 'Bamboosa Max 10 Adults Limit' },
  { id: 25, botType: 'staycation', text: 'how to reach from karjat station?', desc: 'Transport Auto Rickshaw Wording' }
];

async function runAll25Tests() {
  console.log(`Starting 25 Automated Chatbot Tests...\n`);
  const results = [];
  let passedCount = 0;

  for (const tc of testCases) {
    const sessionId = `test_run_25_tc_${tc.id}_${Date.now()}`;
    const startTime = Date.now();
    try {
      const res = await chatbotService.processMessage(sessionId, tc.text, null, null, tc.botType);
      const latency = Date.now() - startTime;
      const reply = res.reply || '';

      // Basic validation checks per test case
      let passed = true;
      let checkNotes = 'OK';

      if (tc.id === 1 && !reply.toLowerCase().includes('digital diaries')) passed = false;
      if (tc.id === 2 && !reply.includes('Digital Diaries Assistant')) passed = false;
      if (tc.id === 3 && !reply.includes('Digital Diaries Assistant')) passed = false;
      if (tc.id === 4 && (!reply.includes('plus icon') || reply.toLowerCase().includes('dropdown'))) passed = false; // Must NOT include dropdown
      if (tc.id === 5 && (!reply.includes('plus icon') || reply.toLowerCase().includes('dropdown') || reply.includes('Digital Diaries Assistant'))) passed = false;
      if (tc.id === 6 && !reply.includes('400')) passed = false;
      if (tc.id === 7 && reply.includes('FOR FREE')) passed = false; // Should not explicitly say FOR FREE
      if (tc.id === 9 && !reply.includes('DigitalDiariesMenu.pdf')) passed = false;
      if (tc.id === 12 && !reply.includes('Staycation Assistant')) passed = false;
      if (tc.id === 13 && (!reply.includes('Standard Cottage') || reply.includes('La Paraiso'))) passed = false;
      if (tc.id === 14 && (!reply.includes('3') || reply.includes('3 Adults + 1 Kid'))) passed = false; // Should NOT dump combinations unprompted
      if (tc.id === 18 && !reply.includes('ambrose-amstel-menu.jpeg')) passed = false;
      if (tc.id === 20 && !reply.includes('Hill View')) passed = false;
      if (tc.id === 21 && reply.includes('SANTORINI')) passed = false; // Should NOT dump Santorini if asked for Bollywood
      if (tc.id === 23 && (!reply.toLowerCase().includes('sold out') && !reply.toLowerCase().includes('booked') && !reply.toLowerCase().includes('not available'))) passed = false;
      if (tc.id === 25 && !reply.includes('Auto Rickshaw')) passed = false;

      if (passed) passedCount++;

      results.push({
        id: tc.id,
        botType: tc.botType,
        desc: tc.desc,
        input: tc.text,
        reply: reply,
        latencyMs: latency,
        status: passed ? 'PASSED' : 'CHECK_NEEDED',
        checkNotes: checkNotes
      });
      console.log(`[TC ${tc.id}/25] ${tc.desc}: ${passed ? '✅ PASSED' : '⚠️ REVIEW NEEDED'} (${latency}ms)`);
    } catch (err) {
      console.error(`[TC ${tc.id}/25] ${tc.desc}: ERROR - ${err.message}`);
      results.push({
        id: tc.id,
        botType: tc.botType,
        desc: tc.desc,
        input: tc.text,
        reply: `ERROR: ${err.message}`,
        latencyMs: Date.now() - startTime,
        status: 'FAILED',
        checkNotes: err.message
      });
    }
  }

  console.log(`\nCompleted 25 Tests. Passed: ${passedCount}/25`);

  // Write detailed output file
  const outputPath = path.resolve(__dirname, 'test_25_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`Results saved to ${outputPath}`);
}

runAll25Tests();
