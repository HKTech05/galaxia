const fs = require('fs');

try {
  const content = fs.readFileSync('c:\\Users\\krish\\OneDrive\\Desktop\\FINAL PROJ\\GLX2\\backend\\template_chat_history_all.txt', 'utf8');
  const blocks = content.split('--------------------------------------------------');
  console.log(`Total blocks: ${blocks.length}`);
  
  let matchCount = 0;
  for (const block of blocks) {
    const lower = block.toLowerCase();
    if (lower.includes('marathi') || lower.includes('translation')) {
      if (lower.includes('chef') || lower.includes('kitchen') || lower.includes('checklist') || lower.includes('order')) {
        matchCount++;
        console.log(`=== MATCH ${matchCount} ===`);
        console.log(block.trim());
        console.log("==========================================");
      }
    }
  }
} catch (err) {
  console.error(err);
}
