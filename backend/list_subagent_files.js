const fs = require('fs');

try {
  const dirPath = 'C:\\Users\\krish\\.gemini\\antigravity\\brain\\2403b294-f270-43f6-a3a2-7bdca3e78dee';
  if (fs.existsSync(dirPath)) {
    console.log("Directory exists!");
    const listFiles = (path) => {
      const items = fs.readdirSync(path);
      for (const item of items) {
        const fullPath = path + '/' + item;
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          listFiles(fullPath);
        } else {
          console.log(fullPath);
        }
      }
    };
    listFiles(dirPath);
  } else {
    console.log("Directory does not exist:", dirPath);
  }
} catch (err) {
  console.error("Error:", err);
}
