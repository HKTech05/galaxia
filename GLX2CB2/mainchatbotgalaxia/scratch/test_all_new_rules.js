require('dotenv').config();
const chatbotService = require('../services/ai/ChatbotService');

async function testAllNewRules() {
  console.log("=== RUNNING COMPREHENSIVE VERIFICATION TEST SUITE ===");

  const testCases = [
    { label: "1. Bot 2 Dot Greeting Flow", input: ".", botType: "amstel_nest" },
    { label: "2. Bot 2 Group Discount (6+ people)", input: "how much discount for 6 people in amstel nest?", botType: "amstel_nest" },
    { label: "3. 8 Adults Occupancy & Cottage Combos", input: "how much for 8 adults on 9th August in amstel nest", botType: "amstel_nest" },
    { label: "4. Hookah Provision Inquiry", input: "is hookah provided there?", botType: "staycation" },
    { label: "5. Nearby Waterfalls Inquiry", input: "are there waterfalls nearby?", botType: "staycation" },
    { label: "6. 80-20 Payment Structure", input: "how much advance payment required?", botType: "staycation" },
    { label: "7. Late Checkout Charges", input: "what are the late checkout charges?", botType: "amstel_nest" },
    { label: "8. Weekday Flexi Check-in", input: "can I check in at 10pm on Tuesday?", botType: "staycation" },
    { label: "9. Food Timings Inquiry", input: "what are the food timings at amstel nest?", botType: "amstel_nest" }
  ];

  for (const tc of testCases) {
    console.log(`\n----------------------------------------`);
    console.log(`TEST: ${tc.label}`);
    console.log(`Input: "${tc.input}" (${tc.botType})`);
    const res = await chatbotService.processMessage('test_suite_' + Date.now(), tc.input, null, null, tc.botType);
    console.log(`Response:\n${res.reply}`);

    // Verify double asterisk absence
    if (res.reply.includes("**")) {
      console.error("FAIL: Double asterisks detected in response!");
    } else {
      console.log("PASS: Formatting check clean (No double asterisks).");
    }
  }

  process.exit(0);
}

testAllNewRules();
