require('dotenv').config();
const chatbotService = require('../services/ai/ChatbotService');

async function testScreenshotDirectives() {
  console.log("=== TESTING 5 SCREENSHOT DIRECTIVE FIXES ===");

  const testCases = [
    {
      id: 1,
      name: "SS5: Hookah Provision Query (Bot 2)",
      bot: "amstel_nest",
      input: "is hookah provided there?",
      expectedContains: ["allowed", "+91 99877 34458"],
      forbiddenContains: ["not provided", "bring your own"]
    },
    {
      id: 2,
      name: "SS5: Hookah Provision Query (Bot 3)",
      bot: "staycation",
      input: "is hookah available or provided at the villa?",
      expectedContains: ["allowed", "+91 81695 19564"],
      forbiddenContains: ["not provided", "bring your own"]
    },
    {
      id: 3,
      name: "SS2: Extra Mattress Phrasing (No 'living area')",
      bot: "amstel_nest",
      input: "where will the 5th adult sleep in family cottage?",
      expectedContains: ["extra mattress"],
      forbiddenContains: ["living area"]
    },
    {
      id: 4,
      name: "SS3: Karjat Station Distance (30-40 minutes)",
      bot: "amstel_nest",
      input: "how far is amstel nest from karjat station?",
      expectedContains: ["30-40 minutes"],
      forbiddenContains: ["20-25"]
    },
    {
      id: 5,
      name: "SS4: Auto Rickshaw Availability & Driver Contact (Mahesh)",
      bot: "amstel_nest",
      input: "auto mil jayega station se? can u provide rickshaw contact number?",
      expectedContains: ["Mahesh", "+91 92847 96472"],
      forbiddenContains: ["don't have", "handy"]
    }
  ];

  let passed = 0;
  for (const tc of testCases) {
    console.log(`\n--------------------------------------------------`);
    console.log(`[TEST ${tc.id}] ${tc.name} | Bot: ${tc.bot}`);
    console.log(`Input: "${tc.input}"`);

    const sessionId = `ss_test_${tc.id}_${Date.now()}`;
    const res = await chatbotService.processMessage(sessionId, tc.input, null, null, tc.bot);
    const reply = res.reply || "";

    console.log(`Response:\n${reply}`);

    let testPass = true;
    for (const exp of tc.expectedContains) {
      if (!reply.toLowerCase().includes(exp.toLowerCase())) {
        console.error(`❌ FAIL: Missing expected string "${exp}"`);
        testPass = false;
      }
    }
    for (const forb of tc.forbiddenContains) {
      if (reply.toLowerCase().includes(forb.toLowerCase())) {
        console.error(`❌ FAIL: Contains forbidden string "${forb}"`);
        testPass = false;
      }
    }

    if (testPass) {
      console.log(`✅ TEST ${tc.id} PASSED!`);
      passed++;
    }
  }

  console.log(`\n==================================================`);
  console.log(`TOTAL DIRECTIVE TESTS: ${testCases.length}`);
  console.log(`PASSED: ${passed}/${testCases.length}`);
  console.log(`==================================================`);
  process.exit(0);
}

testScreenshotDirectives();
