const https = require("https");

const rawToken = "IGAAXTprnk4M1BZAGE1akVzOXE5Sm90bkhhd1lNRUNJdU9CX0kwWF_QRUhDQ3dQQ3k0bGF5Rzk3VlFpQ2VnMXFaSzBiZAHlrMkFVRjZA3c2cyN2llcER4SFgyeDJGVnhWcHc5NktIOVlIbG1pMXU4RDhhUlRPTzVNVmhwVkJVaWZA3ZAwZDZD";

function testToken(t) {
  return new Promise((resolve) => {
    const url = `https://graph.instagram.com/v21.0/me?access_token=${t}`;
    https.get(url, (res) => {
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
  console.log("Testing raw Hill View token...");
  console.log(await testToken(rawToken));

  // Try replacing _ with -
  const t2 = rawToken.replace("_QRUh", "-QRUh");
  console.log("\nTesting Hill View token with - instead of _:");
  console.log(await testToken(t2));
}

main();
