require('dotenv').config();
const dynamicDataService = require('../services/ai/DynamicDataService');

async function testService() {
  console.log("--- TEST 1: Santorini on July 26th (Should be SOLD OUT) ---");
  const res26 = await dynamicDataService.checkStaycationAvailability('ambrose', '2026-07-26', '2026-07-27', 'santorini');
  console.log('Result 26th:\n', JSON.stringify(res26, null, 2));

  console.log("\n--- TEST 2: Santorini on July 28th (Should be AVAILABLE) ---");
  const res28 = await dynamicDataService.checkStaycationAvailability('ambrose', '2026-07-28', '2026-07-29', 'santorini');
  console.log('Result 28th:\n', JSON.stringify(res28, null, 2));

  process.exit(0);
}

testService();
