const https = require("https");

const token = "EAAazkOMLfJQBResB5i7axERZBJig9Xdz6wLojnTQxX6zAEXEkUYmFxkpYcz8Vwfo28zylUNStNkCeZAGT4fV7aVc8jvPWiYWn5rxYiWy7MrkOSfObf47NKW32EkZCYPXeMeIHJwMIu38vNLcnB4WTKAGU5lbyotz7QcOUwGzKjb4NKH5Lo7Xpn4Tpz8PjpRhQlJvFeM2ILAWwFnhzr6EAZDZD"; // Ambrose EA token

function debugToken(inputToken) {
  return new Promise((resolve) => {
    // We can debug a token by calling /debug_token with a Page Access Token or a System User Access Token as the token, and the token-to-debug as input_token
    const url = `https://graph.facebook.com/v21.0/debug_token?input_token=${inputToken}&access_token=${inputToken}`;
    https.get(url, (res) => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve({ raw: body });
        }
      });
    }).on("error", e => resolve({ error: e.message }));
  });
}

async function main() {
  console.log("=== Debugging Page Access Token ===");
  const res = await debugToken(token);
  console.log(JSON.stringify(res, null, 2));
}

main();
