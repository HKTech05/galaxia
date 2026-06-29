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
    try {
      const obj = JSON.parse(line);
      if (obj.step_index >= 622 && obj.type === 'USER_INPUT') {
        console.log(`[USER_INPUT] Step: ${obj.step_index}`);
        console.log(obj.content);
        console.log("==========================================");
      }
    } catch (e) {}
  }
}

search();
