const https = require("https");

const igToken = "IGAAXTprnk4M1BZAFpsUWx6bGt3bUFsdmdWc1RSNFFyT2ExLTFKNG94ZAHNSQ2ZAubV9sU2tfVnBjRXIwQl9fZAXVSYjRUTGNuOXpoaERWRlFWenN1Nm9scnBzZAW5NQnNQVFdSWHVFOXR6MGE0WU56N3RoXzZA0aThIRWZALVld5blEtVQZDZD"; // Ambrose IGAA token

function debugIgTokenApp(token) {
  return new Promise((resolve) => {
    // If the token is expired, we might get an error. But let's try to query debug_token with the App Access Token or Page Access Token if we want,
    // or just query graph.facebook.com/debug_token?input_token=...&access_token=...
    // Wait, the Page Access Tokens (EAA...) are valid. We can use one of them as the access_token to debug the IGAA token!
    const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=EAAazkOMLfJQBResB5i7axERZBJig9Xdz6wLojnTQxX6zAEXEkUYmFxkpYcz8Vwfo28zylUNStNkCeZAGT4fV7aVc8jvPWiYWn5rxYiWy7MrkOSfObf47NKW32EkZCYPXeMeIHJwMIu38vNLcnB4WTKAGU5lbyotz7QcOUwGzKjb4NKH5Lo7Xpn4Tpz8PjpRhQlJvFeM2ILAWwFnhzr6EAZDZD`;
    
    https.get(debugUrl, (res) => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    }).on("error", e => resolve({ error: e.message }));
  });
}

async function main() {
  console.log("=== Debugging IGAA Token via debug_token endpoint ===");
  const res = await debugIgTokenApp(igToken);
  console.log(JSON.stringify(res, null, 2));
}

main();
