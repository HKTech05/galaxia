require('dotenv').config();
const fs = require('fs');
const path = require('path');
const chatbotService = require('../services/ai/ChatbotService');

const testCases = [
  // --- BOT 1: DIGITAL DIARIES (WADALA) ---
  { id: 1, name: "DD Simple Greeting", bot: "digital_diaries", input: "hi" },
  { id: 2, name: "DD Sandy Screen 2-hour slot check", bot: "digital_diaries", input: "is sandy screen available tomorrow at 4pm for 2 hours?" },
  { id: 3, name: "DD 3-hour Cine Love slot cap at 10pm", bot: "digital_diaries", input: "ajj ke liye konse slots available hai for 3 hours in cinelove" },
  { id: 4, name: "DD Alcohol refusal check", bot: "digital_diaries", input: "can we bring beer or whiskey to digital diaries?" },
  { id: 5, name: "DD Smoking refusal check", bot: "digital_diaries", input: "is smoking cigarettes or vape allowed inside?" },
  { id: 6, name: "DD Outside food refusal check", bot: "digital_diaries", input: "can I bring outside pizza and cake?" },
  { id: 7, name: "DD Movie Time add-on pricing", bot: "digital_diaries", input: "what are the add-on charges for balloons and cake in movie time?" },
  { id: 8, name: "DD Celebration package inclusions", bot: "digital_diaries", input: "what is included in celebration package?" },
  { id: 9, name: "DD Kids age & pricing policy", bot: "digital_diaries", input: "can I bring my 6 year old child?" },
  { id: 10, name: "DD Staycation redirect check", bot: "digital_diaries", input: "do you have private pool villas in karjat?" },
  { id: 11, name: "DD Human mode escalation", bot: "digital_diaries", input: "I want to speak with a human support staff" },
  { id: 12, name: "DD Collaboration inquiry", bot: "digital_diaries", input: "we want to do an instagram promotion brand collab" },
  { id: 13, name: "DD Unanswered call response", bot: "digital_diaries", input: "nobody is picking up my call" },
  { id: 14, name: "DD Phone call request", bot: "digital_diaries", input: "give me phone number to call" },
  { id: 15, name: "DD >1 hour UI selection instructions", bot: "digital_diaries", input: "how to select 3 hours on website?" },

  // --- BOT 2: AMSTEL NEST ---
  { id: 16, name: "Amstel Dot Greeting Flow", bot: "amstel_nest", input: "." },
  { id: 17, name: "Amstel Hi Greeting Flow", bot: "amstel_nest", input: "hii" },
  { id: 18, name: "Amstel 6+ Group Discount Inquiry", bot: "amstel_nest", input: "we are 6 people, is there any discount for amstel nest standard cottage?" },
  { id: 19, name: "Amstel 8 Adults Occupancy Calculation", bot: "amstel_nest", input: "how much for 8 adults on 10th August in amstel nest?" },
  { id: 20, name: "Amstel 2 Sharing vs 3 Sharing Breakdown", bot: "amstel_nest", input: "what is the price difference between 2 sharing and 3 sharing standard cottage?" },
  { id: 21, name: "Amstel Single Cottage Tariff Mon-Thu", bot: "amstel_nest", input: "what is the rate for 1 standard cottage on Monday?" },
  { id: 22, name: "Amstel Saturday Rate Check", bot: "amstel_nest", input: "how much for Saturday night in amstel nest?" },
  { id: 23, name: "Amstel Family Cottage Rate", bot: "amstel_nest", input: "what is the rate for family cottage?" },
  { id: 24, name: "Amstel Food Timings", bot: "amstel_nest", input: "what are the food timings at amstel nest?" },
  { id: 25, name: "Amstel Common Pool & Canal Swimming", bot: "amstel_nest", input: "is there a common pool or canal for swimming at amstel nest?" },
  { id: 26, name: "Amstel Food Menu Link", bot: "amstel_nest", input: "send me the food menu for amstel nest" },
  { id: 27, name: "Amstel Caretaker Number", bot: "amstel_nest", input: "what is the caretaker number for amstel nest?" },
  { id: 28, name: "Amstel Late Checkout Fees", bot: "amstel_nest", input: "what are late checkout charges if we checkout at 3pm?" },
  { id: 29, name: "Amstel Flexi 21-Hour Weekday Checkin", bot: "amstel_nest", input: "can we check in at 8pm on Wednesday?" },
  { id: 30, name: "Amstel Alcohol & Hookah Rules", bot: "amstel_nest", input: "can we bring liquor and hookah to amstel nest?" },
  { id: 31, name: "Amstel Hookah Provision Check", bot: "amstel_nest", input: "do you provide hookah there?" },
  { id: 32, name: "Amstel Nearby Waterfalls", bot: "amstel_nest", input: "is there any waterfall near amstel nest?" },
  { id: 33, name: "Amstel 80-20 Payment Rule", bot: "amstel_nest", input: "how much deposit to pay online?" },
  { id: 34, name: "Amstel Cash Prepayment Rule", bot: "amstel_nest", input: "can I pay full amount in cash before booking?" },
  { id: 35, name: "Amstel Cancellation Policy", bot: "amstel_nest", input: "what is the cancellation policy if I cancel 15 days before?" },

  // --- BOT 3: STAYCATION & AMBROSE ---
  { id: 36, name: "Staycation Generic Price Summary", bot: "staycation", input: "price" },
  { id: 37, name: "Staycation Rates Inquiry", bot: "staycation", input: "rates" },
  { id: 38, name: "Ambrose Theme Villas List", bot: "staycation", input: "tell me about ambrose villas" },
  { id: 39, name: "Ambrose Santorini Theme Villa", bot: "staycation", input: "how much for santorini villa on Friday?" },
  { id: 40, name: "Ambrose Bamboosa Villa Capacity", bot: "staycation", input: "how many people can stay in bamboosa villa?" },
  { id: 41, name: "La Paraiso Villa Details & Food", bot: "staycation", input: "is food included in la paraiso villa?" },
  { id: 42, name: "Mount View Apartment Details", bot: "staycation", input: "what are mount view apartment rates?" },
  { id: 43, name: "Hill View Apartment Details", bot: "staycation", input: "how to reach hill view from karjat station?" },
  { id: 44, name: "Heavenly Villa Details", bot: "staycation", input: "does heavenly villa have private indoor pool?" },
  { id: 45, name: "Staycation Security Deposit Rule", bot: "staycation", input: "is security deposit required for villas?" },
  { id: 46, name: "Staycation Toiletries Included", bot: "staycation", input: "do you provide toothbrush and towel?" },
  { id: 47, name: "Staycation Google Reviews Inquiry", bot: "staycation", input: "why are some google reviews bad for property?" },
  { id: 48, name: "Staycation Power Backup Condition", bot: "staycation", input: "is there power backup or generator if light goes?" },
  { id: 49, name: "Staycation Booking Transfer Policy", bot: "staycation", input: "can I transfer my weekend booking to next week?" },
  { id: 50, name: "Existing Booking Inquiry", bot: "staycation", input: "I have a question about my existing booking" }
];

async function run50Simulations() {
  console.log("=== STARTING 50 DETAILED TEST SIMULATIONS ===");
  const results = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const tc of testCases) {
    const startTime = Date.now();
    console.log(`\n--------------------------------------------------`);
    console.log(`[SIM ${tc.id}/50] ${tc.name} | Bot: ${tc.bot}`);
    console.log(`User Input: "${tc.input}"`);

    try {
      const sessionId = `sim_${tc.id}_${Date.now()}`;
      const res = await chatbotService.processMessage(sessionId, tc.input, null, null, tc.bot);
      const reply = res.reply || "";
      const latency = Date.now() - startTime;

      // Quality Checks:
      const hasDoubleAsterisks = reply.includes("**");
      const isNotEmpty = reply.trim().length > 10;
      const isSuccess = isNotEmpty && !hasDoubleAsterisks;

      if (isSuccess) {
        passedCount++;
      } else {
        failedCount++;
      }

      console.log(`Response Snippet:\n${reply.substring(0, 200)}...`);
      console.log(`Latency: ${latency}ms | Clean Formatting: ${!hasDoubleAsterisks ? "PASS" : "FAIL"}`);

      results.push({
        id: tc.id,
        name: tc.name,
        bot: tc.bot,
        input: tc.input,
        reply: reply,
        latency: latency,
        cleanFormatting: !hasDoubleAsterisks,
        status: isSuccess ? "PASS" : "FAIL"
      });
    } catch (err) {
      console.error(`[SIM ${tc.id}] ERROR:`, err.message);
      failedCount++;
      results.push({
        id: tc.id,
        name: tc.name,
        bot: tc.bot,
        input: tc.input,
        error: err.message,
        status: "FAIL"
      });
    }
  }

  console.log(`\n==================================================`);
  console.log(`=== 50 SIMULATIONS SUMMARY ===`);
  console.log(`TOTAL SIMULATIONS: ${testCases.length}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);
  console.log(`SUCCESS RATE: ${((passedCount / testCases.length) * 100).toFixed(1)}%`);
  console.log(`==================================================`);

  // Write full summary report artifact
  const reportPath = path.resolve(__dirname, "../../REPORT_50_SIMULATIONS.md");
  let markdown = `# 50 Detailed Test Simulations Report\n\n`;
  markdown += `**Execution Timestamp**: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\n`;
  markdown += `**Total Simulations**: 50\n`;
  markdown += `**Passed**: ${passedCount}\n`;
  markdown += `**Failed**: ${failedCount}\n`;
  markdown += `**Success Rate**: ${((passedCount / testCases.length) * 100).toFixed(1)}%\n\n`;
  markdown += `| Sim ID | Test Name | Bot Target | Customer Query | Status | Formatting |\n`;
  markdown += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  results.forEach(r => {
    markdown += `| #${r.id} | ${r.name} | \`${r.bot}\` | "${r.input}" | **${r.status}** | ${r.cleanFormatting ? "Clean" : "Issues"} |\n`;
  });

  markdown += `\n\n## Detailed Responses Per Simulation\n\n`;
  results.forEach(r => {
    markdown += `### Simulation #${r.id}: ${r.name}\n`;
    markdown += `- **Bot Target**: \`${r.bot}\`\n`;
    markdown += `- **Customer Query**: "${r.input}"\n`;
    markdown += `- **Response**:\n\n${r.reply}\n\n---\n\n`;
  });

  fs.writeFileSync(reportPath, markdown, "utf8");
  console.log(`Saved detailed report to: ${reportPath}`);

  // Write JSON artifact
  fs.writeFileSync(
    path.resolve(__dirname, "test_50_sim_results.json"),
    JSON.stringify(results, null, 2),
    "utf8"
  );

  process.exit(0);
}

run50Simulations();
