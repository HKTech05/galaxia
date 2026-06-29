const fs = require('fs');

try {
  const content = fs.readFileSync('c:\\Users\\krish\\OneDrive\\Desktop\\FINAL PROJ\\GLX2\\backend\\search_results.txt', 'utf8');
  const lines = content.split('\n');
  const matches = lines.filter(line => line.startsWith('Match in'));
  const uniqueFolders = new Set();
  for (const m of matches) {
    const match = m.match(/brain\\([^\\]+)/);
    if (match) {
      uniqueFolders.add(match[1]);
    }
  }
  console.log("Unique matching conversation folders:");
  console.log(Array.from(uniqueFolders));
} catch (err) {
  console.error(err);
}
