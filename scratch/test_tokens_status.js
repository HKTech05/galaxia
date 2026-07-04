const https = require("https");

const tokenSets = {
  update_tokens2: {
    AMBROSE: "EAAazkOMLfJQBResB5i7axERZBJig9Xdz6wLojnTQxX6zAEXEkUYmFxkpYcz8Vwfo28zylUNStNkCeZAGT4fV7aVc8jvPWiYWn5rxYiWy7MrkOSfObf47NKW32EkZCYPXeMeIHJwMIu38vNLcnB4WTKAGU5lbyotz7QcOUwGzKjb4NKH5Lo7Xpn4Tpz8PjpRhQlJvFeM2ILAWwFnhzr6EAZDZD",
    AMSTELNEST: "EAAazkOMLfJQBRWC0pXvjpvZA4Pj57YiINMRlGuPS16wveUoZCkBVyZCRgrQ4pWNsSFaLRWDXBAvDYJByKw49HR6XzXdxNwiMiaHwGe8qZAcZCYHcZBsHS95FT8EKB0IBFl8ZBUpmleEHo1lxSsHbgfKdQGF5COVFLw7USI9YYg9AP2g0wUXZCbSyCxtQP8lTYMqYqfoveZBPzZCsPZBlGHjhRtuGQZDZD",
    HEAVENLYVILLA: "EAAazkOMLfJQBRYL1laSektLjrDidK6cZAHatTdEQ3CufXkLEZBHmDBVh56nkbKTUfltR79LeZAPUlFNEOP1iLQNvuHrWZCtJORxboeReH7Xr64C5EhAYToLOZA9BZCSPOMIlaiOXc4766LNIaYahSZAO5Ua4WNklKU4ES7dWlUhakhsZBggvgHr7507wKWXAjov2lSE2UfRH0WspPAU5ec0cwgZDZD",
    HILLVIEW: "EAAazkOMLfJQBRfvpiM7EKuVfmZBbu3FXGx10Vzf7yJ2CZAoazmbNM3AkOVOdwQX5Fht6lgS1y7B7NTqzt7bIVqZClowfKfqGXABr4iMbMhBLBlJBSHQVvB1DudunabVGvdhrRyr4bUbFa8CVQlwOB21ncDbp8tz5uNk7nJyZBWqGBfdVpRBlSu76CVxtHJeT6ftl0bUmBdYp5J4BnWJWqQZDZD",
    LAPARAISO: "EAAazkOMLfJQBRQTFM6cBualUgR1dQi2x0PNAtH8XirZB5TizQjW5ZBJyG0v3rbKTBWXtjWl5it8hVd8dGVlr8KY3HUApldIdY4jjxbt7zFfaX34wL7G1vRubXIAKQyAqtnKLlt9TD3an3HFGDGa0L7x0bZBdlZBG4NAghwWlgzplL6YbF2IV7aeUB4toxTYc9lRGxLf4JDVx4zTSdIAXJQZDZD",
    MOUNTVIEW: "EAAazkOMLfJQBRTKSoZBo99mofixAal8XGIkZBcZCNvraoy9shLaZCNAKzNYoHrOf3h7j2uvRbQ0ZCmSBfRjQCPZATTFMpRKAACWXZAz5cRR4ZARRQ2IJAjmmwhWKBGs3JkpKFBBzkP6rOSUWRLF9LSQ8GZAMYRWFGk110GZBmxHRY3i4WooOWBhdZBBpB0avTsQzlJ36YKp6MbENTgUDygiVHAT8wZDZD",
  },
  update_ig_env: {
    AMBROSE: "IGAAXTprnk4M1BZAFpsUWx6bGt3bUFsdmdWc1RSNFFyT2ExLTFKNG94ZAHNSQ2ZAubV9sU2tfVnBjRXIwQl9fZAXVSYjRUTGNuOXpoaERWRlFWenN1Nm9scnBzZAW5NQnNQVFdSWHVFOXR6MGE0WU56N3RoXzZA0aThIRWZALVld5blEtVQZDZD",
    AMSTELNEST: "IGAAXTprnk4M1BZAGFqQjR0eHdHWkFteDJXWUI0UlZA3SWVLdEZAaN2VNcnJ5S2xseC1PXzJvSDM4MnF0XzZATdFl0SktHNkZAiaXFkd01UWTRZAQ2otT1JGM1g3Vm51V2prNERQaVo2bXp0a2N2c2RKUW5maWNSWktmRkNaNTg0alZAocwZDZD",
    HEAVENLYVILLA: "IGAAXTprnk4M1BZAGJ6NHhiRXdSMkFCejNobW9jcXcxVFJiTEFaT3FwZAVJTcjhtUGdRMFp2TVhNRW4xVkxLcnRtdzJ1Yk1neV9CYUZADQkk5MWZA5N2pVRWZA2dlRrSUxvaTBycHdBbjlycUNjQUJqRFdMM3ZA5YWhaTXBPMUFVZA24wOAZDZD",
    HILLVIEW: "IGAAXTprnk4M1BZAFpyQmFkLUswdFFTaUtjWEd0UDZASWHNSbFAyelo5SEtYVWdTVWwzcXQ2OUZAPUkpZARThZAc05ab2tNTjNPTFhOaEZARXzB3UDViaVVKeG4zc3lfekg1VWxVMlZApempjTkV0XzIwblVRQVBmQ3BlRjNDR0N3MXQ4OAZDZD",
    LAPARAISO: "IGAAXTprnk4M1BZAGFJZAzlqTDhmRkxqMDVGTWZAZAdDVmNmxZANUdHMzZATemNvTUlCdk9pV1dUanNkU29BQzJTYnVLN0hyUkVUWV9OaWhSaEdybHNlbU16dUw4ZA2ZAkSkh2ZATdOblg0Qkk0UkRDdEFhbzRUSUFXQXdUUm05WEZAPT3JrUQZDZD",
    MOUNTVIEW: "IGAAXTprnk4M1BZAGE5RnJOUGN6ZA1hkdlpNT2kyNmlUaWJ2LWQ2QU16WXU4cjFkSkRGRXlMQ2pyYkVuUFVzcGx3UXFDQ0dZAeThQdUdYdUI3NTNxRjlWRXQtZA29HTXJsbDM1RHVmeGZAfLURqamdXRFFQYjBIM2otaHFiMGhvQmM2NAZDZD",
  }
};

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
    }).on("error", (e) => resolve({ status: 500, data: { error: e.message } }));
  });
}

async function testToken(name, token) {
  const igRes = await fetchUrl(`https://graph.instagram.com/v21.0/me?access_token=${token}`);
  const fbRes = await fetchUrl(`https://graph.facebook.com/v21.0/me?access_token=${token}`);

  console.log(`[${name}]`);
  console.log(`  -> IG Graph: status=${igRes.status}, data=${JSON.stringify(igRes.data)}`);
  console.log(`  -> FB Graph: status=${fbRes.status}, data=${JSON.stringify(fbRes.data)}`);
}

async function main() {
  console.log("--- Testing update_tokens2 (EA... Facebook tokens) ---");
  for (const [prop, token] of Object.entries(tokenSets.update_tokens2)) {
    await testToken(`EA_${prop}`, token);
  }

  console.log("\n--- Testing update_ig_env (IGAA... Instagram Login tokens) ---");
  for (const [prop, token] of Object.entries(tokenSets.update_ig_env)) {
    await testToken(`IGAA_${prop}`, token);
  }
}

main();
