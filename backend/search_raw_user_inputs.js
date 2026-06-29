const fs = require('fs');

try {
  const content = fs.readFileSync('c:\\Users\\krish\\OneDrive\\Desktop\\FINAL PROJ\\GLX2\\backend\\template_chat_history_all.txt', 'utf8');
  const blocks = content.split('--------------------------------------------------');
  let idx = 0;
  for (const block of blocks) {
    const trimmed = block.trim();
    if (trimmed && trimmed.includes('[Step:')) {
      idx++;
      console.log(`=== BLOCK ${idx} ===`);
      console.log(trimmed);
      console.log("==========================================");
    }
  }
} catch (err) {
  console.error(err);
}
