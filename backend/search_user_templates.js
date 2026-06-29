const fs = require('fs');
const path = require('path');
const readline = require('readline');

const brainDir = 'C:\\Users\\krish\\.gemini\\antigravity\\brain';
const folders = [
  '0ffdf3b3-3dda-4270-bf1f-b3095e5b6e69',
  '1a520f5a-af33-44d0-b48d-263a60abcb34',
  '5d4b5563-83bd-4d92-bb02-dc37b665e251',
  '7caada7f-4dd7-45d2-b349-acfe4dd8d347',
  'd51d5468-8aa5-432b-bd42-97602133f30d',
  'd6f09fc3-7be1-466d-8752-a888347b6393'
];

async function scan() {
  for (const folder of folders) {
    const filePath = path.join(brainDir, folder, '.system_generated', 'logs', 'transcript_full.jsonl');
    if (!fs.existsSync(filePath)) continue;

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      try {
        const obj = JSON.parse(line);
        if (obj.type === 'USER_INPUT') {
          const lower = obj.content.toLowerCase();
          if (lower.includes('template') || lower.includes('whatsapp') || lower.includes('alert') || lower.includes('bot')) {
            console.log(`[Folder: ${folder}] [Step: ${obj.step_index}]`);
            console.log(obj.content);
            console.log("--------------------------------------------------");
          }
        }
      } catch (err) {}
    }
  }
}

scan();
