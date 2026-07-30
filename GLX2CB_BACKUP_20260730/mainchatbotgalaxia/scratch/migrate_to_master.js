const fs = require('fs');
const path = require('path');

const baseDir = 'C:\\Users\\krish\\OneDrive\\Desktop\\FINAL PROJ\\GLX2CB';
const masterDir = path.join(baseDir, 'mainchatbotgalaxia');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else if (exists) {
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

console.log("=== STARTING MASTER FOLDER MIGRATION ===");
console.log("Target Master Directory:", masterDir);

// 1. Create master directory
if (!fs.existsSync(masterDir)) {
  fs.mkdirSync(masterDir, { recursive: true });
}

// 2. Copy production app from galaxia-whatsapp-bot2/galaxia-whatsapp-bot2
const bot2Source = path.join(baseDir, 'galaxia-whatsapp-bot2', 'galaxia-whatsapp-bot2');
console.log("Copying production app from:", bot2Source);
copyRecursiveSync(bot2Source, masterDir);

// 3. Copy any extra scratch files from galaxia-whatsapp-bot23/galaxia-whatsapp-bot2/scratch
const bot23Scratch = path.join(baseDir, 'galaxia-whatsapp-bot23', 'galaxia-whatsapp-bot2', 'scratch');
const masterScratch = path.join(masterDir, 'scratch');
if (fs.existsSync(bot23Scratch)) {
  console.log("Syncing scratch test files...");
  copyRecursiveSync(bot23Scratch, masterScratch);
}

// 4. Create legacy_scripts directory and copy root scripts from bot23
const bot23Root = path.join(baseDir, 'galaxia-whatsapp-bot23');
const legacyDir = path.join(masterDir, 'legacy_scripts');
if (!fs.existsSync(legacyDir)) {
  fs.mkdirSync(legacyDir, { recursive: true });
}

if (fs.existsSync(bot23Root)) {
  console.log("Preserving legacy root scripts from bot23...");
  const items = fs.readdirSync(bot23Root);
  items.forEach(item => {
    const fullPath = path.join(bot23Root, item);
    if (fs.statSync(fullPath).isFile()) {
      fs.copyFileSync(fullPath, path.join(legacyDir, item));
    }
  });
}

// 5. Copy AI_Bots_Code folder into mainchatbotgalaxia
const aiBotsSrc = path.join(baseDir, 'AI_Bots_Code');
const aiBotsDest = path.join(masterDir, 'AI_Bots_Code');
if (fs.existsSync(aiBotsSrc)) {
  console.log("Preserving AI_Bots_Code folder...");
  copyRecursiveSync(aiBotsSrc, aiBotsDest);
}

// 6. Copy top-level GALAXIA1 folder into mainchatbotgalaxia/GALAXIA1
const topVaultSrc = path.join(baseDir, 'GALAXIA1');
const vaultDest = path.join(masterDir, 'GALAXIA1');
if (fs.existsSync(topVaultSrc)) {
  console.log("Preserving top-level GALAXIA1 Vault files...");
  copyRecursiveSync(topVaultSrc, vaultDest);
}

console.log("=== MASTER FOLDER MIGRATION COMPLETE ===");
