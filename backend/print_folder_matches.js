const fs = require('fs');

try {
  const content = fs.readFileSync('c:\\Users\\krish\\OneDrive\\Desktop\\FINAL PROJ\\GLX2\\backend\\search_results.txt', 'utf8');
  const blocks = content.split('==================================================');
  const targetFolders = ['1a520f5a', '7caada7f', 'd51d5468', 'd6f09fc3'];
  for (const block of blocks) {
    if (targetFolders.some(f => block.includes(f))) {
      console.log(block.trim());
      console.log("==========================================");
    }
  }
} catch (err) {
  console.error(err);
}
