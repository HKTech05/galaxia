/**
 * Test Simulation Script for Digital Diaries Vault Updates
 * Tests 3 scenarios:
 *   1. Staycation redirect → must mention /staycation/contact
 *   2. Celebration Package description → must NOT mention ₹400 add-ons
 *   3. Kids policy → must state under-5 free, 5-18 ₹150
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

async function runTests() {
  // Initialize services
  const KnowledgeService = require("./services/ai/KnowledgeService");
  const knowledgeService = new KnowledgeService();

  // Re-index vault so new content is picked up
  console.log("=== Re-indexing Obsidian Vault... ===");
  const stats = await knowledgeService.reindexVault();
  console.log("Index stats:", JSON.stringify(stats));
  console.log("");

  const ChatbotService = require("./services/ai/ChatbotService");
  const chatbotService = new ChatbotService();

  const testCases = [
    {
      name: "TEST 1: Staycation Redirect",
      message: "I wanted to know your vacation stay options",
      botType: "digital_diaries",
      user: "test_staycation_redirect_" + Date.now(),
      expectedContains: ["staycation/contact"],
      expectedNotContains: ["Amstel", "Ambrose", "Karjat pricing"],
    },
    {
      name: "TEST 2: Celebration Package (NO add-on ₹400 mention)",
      message: "What does the celebration package include for 2 people?",
      botType: "digital_diaries",
      user: "test_celebration_pkg_" + Date.now(),
      expectedContains: ["cake", "LED"],
      expectedNotContains: ["₹400"],
    },
    {
      name: "TEST 3: Kids Policy",
      message: "Can I bring my kid to the screening?",
      botType: "digital_diaries",
      user: "test_kids_policy_" + Date.now(),
      expectedContains: ["150"],
      expectedNotContains: ["not allowed", "strictly not"],
    },
    {
      name: "TEST 4: Movie Time add-ons (should mention ₹400)",
      message: "I want movie time package, can I add balloons?",
      botType: "digital_diaries",
      user: "test_movietime_addon_" + Date.now(),
      expectedContains: ["400"],
      expectedNotContains: [],
    },
  ];

  console.log("=== Running Test Simulations ===\n");

  for (const tc of testCases) {
    console.log(`--- ${tc.name} ---`);
    console.log(`User Message: "${tc.message}"`);

    try {
      const result = await chatbotService.processMessage(
        tc.user,
        tc.message,
        tc.botType,
        "whatsapp"
      );

      const reply = result.message || result;
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
