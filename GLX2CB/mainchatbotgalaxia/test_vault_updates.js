/**
 * Test Simulation Script - Outside Food/Cake Ban & Office Hours
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

async function runTests() {
  const chatbotService = require("./services/ai/ChatbotService");

  const testCases = [
    {
      name: "TEST 1: Outside cake NOT allowed",
      message: "Waise cake laa sakte hai kya venue pe apna?",
      botType: "digital_diaries",
      user: "test_cake_" + Date.now(),
      expectedContains: ["not allowed", "nahi"],
      expectedNotContains: [],
      passIfAny: true,
    },
    {
      name: "TEST 2: Outside food NOT allowed",
      message: "Can we bring outside food?",
      botType: "digital_diaries",
      user: "test_food_" + Date.now(),
      expectedContains: ["not allowed", "nahi"],
      expectedNotContains: [],
      passIfAny: true,
    },
    {
      name: "TEST 3: Office hours",
      message: "What are your office hours?",
      botType: "digital_diaries",
      user: "test_hours_" + Date.now(),
      expectedContains: ["10", "8"],
      expectedNotContains: [],
      passIfAny: false,
    },
  ];

  console.log("=== Running Test Simulations ===\n");

  for (const tc of testCases) {
    console.log(`--- ${tc.name} ---`);
    console.log(`User Message: "${tc.message}"`);

    try {
      const result = await chatbotService.processMessage(
        tc.user, tc.message, "test_phone", "test_phone_id", tc.botType, "whatsapp"
      );

      const reply = result.reply || "";
      console.log(`Bot Reply:\n${reply}\n`);

      let pass = true;

      if (tc.passIfAny) {
        // At least ONE of the expected keywords must be present
        const found = tc.expectedContains.some(kw => reply.toLowerCase().includes(kw.toLowerCase()));
        if (found) {
          console.log(`  ✅ PASS: Contains at least one of [${tc.expectedContains.join(", ")}]`);
        } else {
          console.log(`  ❌ FAIL: Expected at least one of [${tc.expectedContains.join(", ")}] but none found!`);
          pass = false;
        }
      } else {
        for (const kw of tc.expectedContains) {
          if (!reply.toLowerCase().includes(kw.toLowerCase())) {
            console.log(`  ❌ FAIL: Expected to contain "${kw}" but not found!`);
            pass = false;
          } else {
            console.log(`  ✅ PASS: Contains "${kw}"`);
          }
        }
      }

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
