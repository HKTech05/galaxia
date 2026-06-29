const fs = require('fs');

try {
  const content = fs.readFileSync('c:\\Users\\krish\\OneDrive\\Desktop\\FINAL PROJ\\GLX2\\backend\\search_results.txt', 'utf8');
  const lines = content.split('\n');
  const matches = lines.filter(line => line.startsWith('Match in'));
  console.log("All matches found:");
  console.log(matches);
} catch (err) {
  console.error(err);
}
