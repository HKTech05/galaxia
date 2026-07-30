/**
 * Update .env with latest IG tokens from Instagram settings page
 * Run on EC2: node update_tokens2.js
 */
const fs = require("fs");
const envPath = "/home/ec2-user/galaxia/wa-chatbot/.env";

const newTokens = {
  IG_TOKEN_AMBROSE: "EAAazkOMLfJQBResB5i7axERZBJig9Xdz6wLojnTQxX6zAEXEkUYmFxkpYcz8Vwfo28zylUNStNkCeZAGT4fV7aVc8jvPWiYWn5rxYiWy7MrkOSfObf47NKW32EkZCYPXeMeIHJwMIu38vNLcnB4WTKAGU5lbyotz7QcOUwGzKjb4NKH5Lo7Xpn4Tpz8PjpRhQlJvFeM2ILAWwFnhzr6EAZDZD",
  IG_TOKEN_AMSTELNEST: "EAAazkOMLfJQBRWC0pXvjpvZA4Pj57YiINMRlGuPS16wveUoZCkBVyZCRgrQ4pWNsSFaLRWDXBAvDYJByKw49HR6XzXdxNwiMiaHwGe8qZAcZCYHcZBsHS95FT8EKB0IBFl8ZBUpmleEHo1lxSsHbgfKdQGF5COVFLw7USI9YYg9AP2g0wUXZCbSyCxtQP8lTYMqYqfoveZBPzZCsPZBlGHjhRtuGQZDZD",
  IG_TOKEN_HEAVENLYVILLA: "EAAazkOMLfJQBRYL1laSektLjrDidK6cZAHatTdEQ3CufXkLEZBHmDBVh56nkbKTUfltR79LeZAPUlFNEOP1iLQNvuHrWZCtJORxboeReH7Xr64C5EhAYToLOZA9BZCSPOMIlaiOXc4766LNIaYahSZAO5Ua4WNklKU4ES7dWlUhakhsZBggvgHr7507wKWXAjov2lSE2UfRH0WspPAU5ec0cwgZDZD",
  IG_TOKEN_HILLVIEW: "EAAazkOMLfJQBRfvpiM7EKuVfmZBbu3FXGx10Vzf7yJ2CZAoazmbNM3AkOVOdwQX5Fht6lgS1y7B7NTqzt7bIVqZClowfKfqGXABr4iMbMhBLBlJBSHQVvB1DudunabVGvdhrRyr4bUbFa8CVQlwOB21ncDbp8tz5uNk7nJyZBWqGBfdVpRBlSu76CVxtHJeT6ftl0bUmBdYp5J4BnWJWqQZDZD",
  IG_TOKEN_LAPARAISO: "EAAazkOMLfJQBRQTFM6cBualUgR1dQi2x0PNAtH8XirZB5TizQjW5ZBJyG0v3rbKTBWXtjWl5it8hVd8dGVlr8KY3HUApldIdY4jjxbt7zFfaX34wL7G1vRubXIAKQyAqtnKLlt9TD3an3HFGDGa0L7x0bZBdlZBG4NAghwWlgzplL6YbF2IV7aeUB4toxTYc9lRGxLf4JDVx4zTSdIAXJQZDZD",
  IG_TOKEN_MOUNTVIEW: "EAAazkOMLfJQBRTKSoZBo99mofixAal8XGIkZBcZCNvraoy9shLaZCNAKzNYoHrOf3h7j2uvRbQ0ZCmSBfRjQCPZATTFMpRKAACWXZAz5cRR4ZARRQ2IJAjmmwhWKBGs3JkpKFBBzkP6rOSUWRLF9LSQ8GZAMYRWFGk110GZBmxHRY3i4WooOWBhdZBBpB0avTsQzlJ36YKp6MbENTgUDygiVHAT8wZDZD",
};

let env = fs.readFileSync(envPath, "utf8");

for (const [key, val] of Object.entries(newTokens)) {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(env)) {
    env = env.replace(regex, `${key}=${val}`);
    console.log(`Updated ${key}`);
  } else {
    console.log(`NOT FOUND: ${key}`);
  }
}

fs.writeFileSync(envPath, env);
console.log("\nDone. Restarting wa-chatbot...");

const { execSync } = require("child_process");
execSync("pm2 restart wa-chatbot --update-env", { stdio: "inherit" });

// Wait and verify tokens work
setTimeout(async () => {
  const https = require("https");
  require("dotenv").config({ path: envPath, override: true });
  
  // Quick test: verify Amstel Nest token
  const token = newTokens.IG_TOKEN_AMSTELNEST;
  const url = `https://graph.facebook.com/v21.0/me?access_token=${token}`;
  https.get(url, (res) => {
    let body = "";
    res.on("data", c => body += c);
    res.on("end", () => {
      console.log("\nToken test (Amstel Nest):", body);
      console.log("\nREADY - send hi from any IG account now!");
    });
  });
}, 3000);
