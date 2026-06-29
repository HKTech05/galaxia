const fs = require('fs');
const readline = require('readline');

async function search() {
  const filePath = 'C:\\Users\\krish\\.gemini\\antigravity\\brain\\5d4b5563-83bd-4d92-bb02-dc37b665e251\\.system_generated\\logs\\transcript.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log("=== Matching Lines ===");
  for await (const line of rl) {
    if (line.toLowerCase().includes('marathi') || line.toLowerCase().includes('chef') || line.toLowerCase().includes('kitchen')) {
      // Print truncated line to avoid cluttering output
      try {
        const obj = JSON.parse(line);
        if (obj.content) {
          const contentStr = typeof obj.content === 'string' ? obj.content : JSON.stringify(obj.content);
          if (contentStr.toLowerCase().includes('marathi') || contentStr.toLowerCase().includes('template')) {
            console.log(`[Step ${obj.step_index}] Type: ${obj.type}`);
            console.log(contentStr.substring(0, 1000));
            console.log("------------------------------------------");
          }
        }
      } catch (e) {
        if (line.length > 500) {
          console.log(line.substring(0, 500) + "...");
        } else {
          console.log(line);
        }
      }
    }
  }
}

search();
