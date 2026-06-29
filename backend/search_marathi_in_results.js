const fs = require('fs');

try {
  const content = fs.readFileSync('c:\\Users\\krish\\OneDrive\\Desktop\\FINAL PROJ\\GLX2\\backend\\search_results.txt', 'utf8');
  const blocks = content.split('==================================================');
  const writer = fs.createWriteStream('c:\\Users\\krish\\OneDrive\\Desktop\\FINAL PROJ\\GLX2\\backend\\marathi_matches.txt');
  for (const block of blocks) {
    if (block.toLowerCase().includes('marathi')) {
      writer.write(block.trim() + '\n');
      writer.write("--------------------------------------------------\n");
    }
  }
  writer.end();
  console.log("Written marathi matches to marathi_matches.txt");
} catch (err) {
  console.error(err);
}
