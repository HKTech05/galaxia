const https = require("https");

const token = "EAAazkOMLfJQBResB5i7axERZBJig9Xdz6wLojnTQxX6zAEXEkUYmFxkpYcz8Vwfo28zylUNStNkCeZAGT4fV7aVc8jvPWiYWn5rxYiWy7MrkOSfObf47NKW32EkZCYPXeMeIHJwMIu38vNLcnB4WTKAGU5lbyotz7QcOUwGzKjb4NKH5Lo7Xpn4Tpz8PjpRhQlJvFeM2ILAWwFnhzr6EAZDZD"; // Ambrose EA token

function getAppInfo() {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v21.0/1886284726107284?fields=id,name,status,category,gdp_v2_status&access_token=${token}`;
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
  const info = await getAppInfo();
  console.log(JSON.stringify(info, null, 2));
}

main();
