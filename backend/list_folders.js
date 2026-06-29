const fs = require('fs');

try {
  const dirPath = 'C:\\Users\\krish\\.gemini\\antigravity\\brain';
  if (fs.existsSync(dirPath)) {
    const items = fs.readdirSync(dirPath);
    console.log("Folders in brain:");
    console.log(items);
  } else {
    console.log("Brain dir does not exist");
  }
} catch (err) {
  console.error(err);
}
