const fs = require('fs');
const readline = require('readline');

async function search() {
  const filePath = 'C:\\Users\\krish\\.gemini\\antigravity\\brain\\d6f09fc3-7be1-466d-8752-a888347b6393\\.system_generated\\logs\\transcript.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('marathi') || lowerLine.includes('translation') || lowerLine.includes('chef') || lowerLine.includes('kitchen') || lowerLine.includes('checklist')) {
      try {
        const obj = JSON.parse(line);
        if (obj.type === 'USER_INPUT') {
          console.log(`[USER_INPUT] Step: ${obj.step_index}`);
          console.log(obj.content);
          console.log("------------------------------------------");
        } else if (obj.type === 'PLANNER_RESPONSE' && (lowerLine.includes('template') || lowerLine.includes('marathi'))) {
          console.log(`[PLANNER_RESPONSE] Step: ${obj.step_index}`);
          console.log(obj.content);
          console.log("------------------------------------------");
        }
      } catch (e) {}
    }
  }
}

search();
