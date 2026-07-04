/**
 * Tool to update IG tokens on EC2 and restart wa-chatbot.
 * Pass tokens object or run directly.
 */
const https = require("https");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PEM_PATH = "c:\\Users\\krish\\OneDrive\\Desktop\\FINAL PROJ\\GLX2\\backend\\galaxia-deploy-key.pem";
const EC2_HOST = "ec2-user@65.1.183.241";

/**
 * Validate a token against Meta Graph API
 */
function testToken(token) {
  return new Promise((resolve) => {
    const host = token.startsWith("EAA") ? "graph.facebook.com" : "graph.instagram.com";
    const url = `https://${host}/v21.0/me?access_token=${token}`;
    https.get(url, (res) => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => {
        try {
          resolve({ ok: res.statusCode === 200, status: res.statusCode, host, data: JSON.parse(body) });
        } catch {
          resolve({ ok: false, status: res.statusCode, host, raw: body });
        }
      });
    }).on("error", e => resolve({ ok: false, error: e.message }));
  });
}

async function applyTokensOnEc2(tokensObj) {
  console.log("=== 1. Validating Provided Tokens ===");
  for (const [key, token] of Object.entries(tokensObj)) {
    if (!token) continue;
    const res = await testToken(token);
    if (res.ok) {
      console.log(`✅ ${key}: Valid (${res.host}) -> Name: "${res.data.name || res.data.username}", ID: ${res.data.id}`);
    } else {
      console.error(`❌ ${key}: INVALID (${res.status}) -> ${JSON.stringify(res.data || res.raw || res.error)}`);
    }
  }

  console.log("\n=== 2. Creating EC2 Update Script ===");
  const updateScript = `
const fs = require("fs");
const envPath = "/home/ec2-user/galaxia/wa-chatbot/.env";
let env = fs.readFileSync(envPath, "utf8");
const newTokens = ${JSON.stringify(tokensObj, null, 2)};

for (const [k, v] of Object.entries(newTokens)) {
  if (!v) continue;
  const regex = new RegExp(\`^\${k}=.*\$\`, "m");
  if (regex.test(env)) {
    env = env.replace(regex, \`\${k}=\${v}\`);
    console.log(\`Updated \${k}\`);
  } else {
    env += \`\\n\${k}=\${v}\`;
    console.log(\`Added \${k}\`);
  }
}
fs.writeFileSync(envPath, env);
console.log("ENV updated successfully.");
`;

  const scriptPath = path.join(__dirname, "temp_ec2_update.js");
  fs.writeFileSync(scriptPath, updateScript);

  console.log("\n=== 3. Uploading Update Script to EC2 ===");
  try {
    execSync(`Get-Content "${scriptPath}" | ssh -i "${PEM_PATH}" -o StrictHostKeyChecking=no ${EC2_HOST} "node -"`, { shell: "powershell.exe", stdio: "inherit" });
    fs.unlinkSync(scriptPath);
  } catch (e) {
    console.error("Failed to upload update script:", e.message);
    return;
  }

  console.log("\n=== 4. Restarting wa-chatbot PM2 process on EC2 ===");
  try {
    execSync(`ssh -i "${PEM_PATH}" -o StrictHostKeyChecking=no ${EC2_HOST} "pm2 restart wa-chatbot"`, { stdio: "inherit" });
  } catch (e) {
    console.error("Failed to restart wa-chatbot:", e.message);
    return;
  }

  console.log("\n=== 5. Verifying All Property Tokens on EC2 ===");
  try {
    execSync(`ssh -i "${PEM_PATH}" -o StrictHostKeyChecking=no ${EC2_HOST} "node /home/ec2-user/galaxia/galaxia-whatsapp-bot23/galaxia-whatsapp-bot2/test_ig_tokens.js"`, { stdio: "inherit" });
  } catch (e) {
    console.error("Verification failed:", e.message);
  }
}

module.exports = { testToken, applyTokensOnEc2 };

if (require.main === module) {
  // Can be invoked with tokens passed as JSON argument or environment
  const arg = process.argv[2];
  if (arg) {
    try {
      const tokensObj = JSON.parse(arg);
      applyTokensOnEc2(tokensObj);
    } catch (e) {
      console.error("Invalid JSON argument:", e.message);
    }
  } else {
    console.log("Usage: node scratch/update_and_restart.js '{\"IG_TOKEN_AMBROSE\":\"...\"}'");
  }
}
