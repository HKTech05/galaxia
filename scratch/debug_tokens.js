const https = require("https");

const tokens = {
  ambrose: "EAAazkOMLfJQBResB5i7axERZBJig9Xdz6wLojnTQxX6zAEXEkUYmFxkpYcz8Vwfo28zylUNStNkCeZAGT4fV7aVc8jvPWiYWn5rxYiWy7MrkOSfObf47NKW32EkZCYPXeMeIHJwMIu38vNLcnB4WTKAGU5lbyotz7QcOUwGzKjb4NKH5Lo7Xpn4Tpz8PjpRhQlJvFeM2ILAWwFnhzr6EAZDZD",
  amstelnest: "EAAazkOMLfJQBRWC0pXvjpvZA4Pj57YiINMRlGuPS16wveUoZCkBVyZCRgrQ4pWNsSFaLRWDXBAvDYJByKw49HR6XzXdxNwiMiaHwGe8qZAcZCYHcZBsHS95FT8EKB0IBFl8ZBUpmleEHo1lxSsHbgfKdQGF5COVFLw7USI9YYg9AP2g0wUXZCbSyCxtQP8lTYMqYqfoveZBPzZCsPZBlGHjhRtuGQZDZD",
  heavenlyvilla: "EAAazkOMLfJQBRYL1laSektLjrDidK6cZAHatTdEQ3CufXkLEZBHmDBVh56nkbKTUfltR79LeZAPUlFNEOP1iLQNvuHrWZCtJORxboeReH7Xr64C5EhAYToLOZA9BZCSPOMIlaiOXc4766LNIaYahSZAO5Ua4WNklKU4ES7dWlUhakhsZBggvgHr7507wKWXAjov2lSE2UfRH0WspPAU5ec0cwgZDZD",
  hillview: "EAAazkOMLfJQBRfvpiM7EKuVfmZBbu3FXGx10Vzf7yJ2CZAoazmbNM3AkOVOdwQX5Fht6lgS1y7B7NTqzt7bIVqZClowfKfqGXABr4iMbMhBLBlJBSHQVvB1DudunabVGvdhrRyr4bUbFa8CVQlwOB21ncDbp8tz5uNk7nJyZBWqGBfdVpRBlSu76CVxtHJeT6ftl0bUmBdYp5J4BnWJWqQZDZD",
  laparaiso: "EAAazkOMLfJQBRQTFM6cBualUgR1dQi2x0PNAtH8XirZB5TizQjW5ZBJyG0v3rbKTBWXtjWl5it8hVd8dGVlr8KY3HUApldIdY4jjxbt7zFfaX34wL7G1vRubXIAKQyAqtnKLlt9TD3an3HFGDGa0L7x0bZBdlZBG4NAghwWlgzplL6YbF2IV7aeUB4toxTYc9lRGxLf4JDVx4zTSdIAXJQZDZD",
  mountview: "EAAazkOMLfJQBRTKSoZBo99mofixAal8XGIkZBcZCNvraoy9shLaZCNAKzNYoHrOf3h7j2uvRbQ0ZCmSBfRjQCPZATTFMpRKAACWXZAz5cRR4ZARRQ2IJAjmmwhWKBGs3JkpKFBBzkP6rOSUWRLF9LSQ8GZAMYRWFGk110GZBmxHRY3i4WooOWBhdZBBpB0avTsQzlJ36YKp6MbENTgUDygiVHAT8wZDZD"
};

function debugToken(name, token) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v21.0/app?access_token=${token}`;
    https.get(url, (res) => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => {
        try {
          resolve({ name, status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ name, status: res.statusCode, raw: body });
        }
      });
    }).on("error", e => resolve({ name, error: e.message }));
  });
}

async function main() {
  console.log("=== Debugging all Page Access Tokens ===");
  for (const [name, token] of Object.entries(tokens)) {
    const res = await debugToken(name, token);
    console.log(`${name}: status=${res.status}, app=${res.data?.name || "unknown"} (App ID: ${res.data?.id || "unknown"})`);
  }
}

main();
