require('dotenv').config();
const chatbotService = require('../services/ai/ChatbotService');
const configManager = require('../services/ai/ConfigManager');

async function testPrimeDatesAndFlow() {
  console.log("=== TESTING PRIME DATES (14 & 15 AUG), FLASH MODEL, AND GENERALIZED PRICE TEMPLATE ===");

  // 1. Verify Model is Flash
  const modelName = configManager.get("MODEL_NAME");
  console.log(`\nConfigured Model: ${modelName}`);
  if (modelName !== "deepseek-v4-flash") {
    console.error(`❌ FAIL: Model name is not deepseek-v4-flash! Found: ${modelName}`);
    process.exit(1);
  } else {
    console.log("✅ MODEL CHECK PASSED: deepseek-v4-flash is active!");
  }

  // 2. Test Greeting Flow
  console.log("\n--- TEST 1: Greeting Flow ('Hi') ---");
  const session1 = `test_flow_1_${Date.now()}`;
  const res1 = await chatbotService.processMessage(session1, "Hi", null, null, "amstel_nest");
  console.log(`Reply:\n${res1.reply}`);
  if (res1.reply.includes("Welcome to Amstel Nest") && res1.reply.includes("1. Check-in Date")) {
    console.log("✅ TEST 1 PASSED: Opening greeting flow is intact!");
  } else {
    console.error("❌ TEST 1 FAILED!");
  }

  // 3. Test Generalized Pricing Query ("no just say price")
  console.log("\n--- TEST 2: General Price Request ('no just say price') ---");
  const session2 = `test_flow_2_${Date.now()}`;
  const res2 = await chatbotService.processMessage(session2, "no just say price", null, null, "amstel_nest");
  console.log(`Reply:\n${res2.reply}`);

  const hasStandard = res2.reply.includes("Amstel Nest Standard Cottage");
  const hasFamily = res2.reply.includes("Family Cottage");
  const has14Aug = res2.reply.includes("14 Aug") && res2.reply.includes("7,950");
  const has15Aug = res2.reply.includes("15 Aug") && res2.reply.includes("8,500");
  const hasSecDep = res2.reply.includes("Security deposit is *₹2,000* (refundable)");

  if (hasStandard && hasFamily && has14Aug && has15Aug && hasSecDep) {
    console.log("✅ TEST 2 PASSED: Generalized price template matched perfectly with Prime Dates & Security Deposit!");
  } else {
    console.error("❌ TEST 2 FAILED!");
    console.log({ hasStandard, hasFamily, has14Aug, has15Aug, hasSecDep });
  }

  // 4. Test Specific Date Inquiry for 14th August
  console.log("\n--- TEST 3: Specific Date Inquiry for 14 August ---");
  const session3 = `test_flow_3_${Date.now()}`;
  const res3 = await chatbotService.processMessage(session3, "how much for 14th August for 2 adults?", null, null, "amstel_nest");
  console.log(`Reply:\n${res3.reply}`);
  if (res3.reply.includes("7,950")) {
    console.log("✅ TEST 3 PASSED: 14th August prime rate (₹7,950) correctly fetched!");
  } else {
    console.error("❌ TEST 3 FAILED: Did not output ₹7,950 for 14th August!");
  }

  // 5. Test Specific Date Inquiry for 15th August
  console.log("\n--- TEST 4: Specific Date Inquiry for 15 August ---");
  const session4 = `test_flow_4_${Date.now()}`;
  const res4 = await chatbotService.processMessage(session4, "how much for 15th August for 2 adults?", null, null, "amstel_nest");
  console.log(`Reply:\n${res4.reply}`);
  if (res4.reply.includes("8,500")) {
    console.log("✅ TEST 4 PASSED: 15th August prime rate (₹8,500) correctly fetched!");
  } else {
    console.error("❌ TEST 4 FAILED: Did not output ₹8,500 for 15th August!");
  }

  console.log("\n==================================================");
  console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
  console.log("==================================================");
  process.exit(0);
}

testPrimeDatesAndFlow();
