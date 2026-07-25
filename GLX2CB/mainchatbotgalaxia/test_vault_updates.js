/**
 * Test Simulation Script for Digital Diaries Vault Updates
 * Tests 4 scenarios:
 *   1. Staycation redirect → must mention /staycation/contact
 *   2. Celebration Package description → must NOT mention ₹400 add-ons
 *   3. Kids policy → must state under-5 free, 5-18 ₹150
 *   4. Movie Time add-ons → should mention ₹400
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

async function runTests() {
  const chatbotService = require("./services/ai/ChatbotService");

  const testCases = [
    {
      name: "TEST 1: Staycation Redirect",
      message: "I wanted to know your vacation stay options",
      botType: "digital_diaries",
      user: "test_staycation_" + Date.now(),
      expectedContains: ["staycation/contact"],
      expectedNotContains: ["Amstel", "Ambrose"],
    },
    {
      name: "TEST 2: Celebration Package (NO add-on ₹400 mention)",
      message: "What does the celebration package include for 2 people?",
      botType: "digital_diaries",
      user: "test_celebration_" + Date.now(),
      expectedContains: ["cake"],
      expectedNotContains: ["₹400"],
    },
    {
      name: "TEST 3: Kids Policy",
      message: "Can I bring my kid to the screening?",
      botType: "digital_diaries",
      user: "test_kids_" + Date.now(),
      expectedContains: ["150"],
      expectedNotContains: [],
    },
    {
      name: "TEST 4: Movie Time add-ons (should mention ₹400)",
      message: "I want movie time package, can I add balloons?",
      botType: "digital_diaries",
      user: "test_addon_" + Date.now(),
      expectedContains: ["400"],
      expectedNotContains: [],
    },
  ];

  console.log("=== Running Test Simulations ===\n");

  for (const tc of testCases) {
    console.log(`--- ${tc.name} ---`);
    console.log(`User Message: "${tc.message}"`);

    try {
      // processMessage(sessionId, text, customerPhone, phoneNumberId, botType, platform)
      const result = await chatbotService.processMessage(
        tc.user,            // sessionId
        tc.message,         // text
        "test_phone",       // customerPhone
        "test_phone_id",    // phoneNumberId
        tc.botType,         // botType
        "whatsapp"          // platform
      );

      const reply = result.reply || "";
      console.log(`Bot Reply:\n${reply}\n`);

      // Validate expected keywords present
      let pass = true;
      for (const kw of tc.expectedContains) {
        if (!reply.toLowerCase().includes(kw.toLowerCase())) {
          console.log(`  ❌ FAIL: Expected to contain "${kw}" but not found!`);
          pass = false;
        } else {
          console.log(`  ✅ PASS: Contains "${kw}"`);
        }
      }

      // Validate unexpected keywords absent
      for (const kw of tc.expectedNotContains) {
        if (reply.toLowerCase().includes(kw.toLowerCase())) {
          console.log(`  ❌ FAIL: Should NOT contain "${kw}" but found it!`);
          pass = false;
        } else {
          console.log(`  ✅ PASS: Does not contain "${kw}"`);
        }
      }

      console.log(`  Result: ${pass ? "✅ ALL CHECKS PASSED" : "❌ SOME CHECKS FAILED"}`);
    } catch (err) {
      console.log(`  ❌ ERROR: ${err.message}`);
      console.log(`  Stack: ${err.stack?.split('\n').slice(0,3).join('\n')}`);
    }

    console.log("");
  }

  console.log("=== All Test Simulations Complete ===");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
