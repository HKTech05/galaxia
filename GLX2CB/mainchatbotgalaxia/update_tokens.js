/**
 * Update .env with new tokens
 * Run on EC2: node update_tokens.js
 */
const fs = require("fs");
const envPath = "/home/ec2-user/galaxia/wa-chatbot/.env";

const newTokens = {
  IG_TOKEN_AMBROSE: "EAAazkOMLfJQBRSgpo7xrK7436eKVtrVgzE6g7qEAaqAm49CcV9JZBse8nzDWKmEWJWIXBtCTUsdBWQMPEq3BZAX6FZC5HwyPZCuDDpQTu53ZCTAhpdEZBYJZBjQUxg3ZCSEjYZAD8DZBU7WkeyPO926WWxvaGXCcc9VNULQnljId20o74wfO8MB2ZCN5S96ZAKKXeHoIFRkTtPl2VRZBmxSxPLeOCAAZDZD",
  IG_TOKEN_AMSTELNEST: "EAAazkOMLfJQBRWoSj1ZBAWLRVzwd9gOJ74zdpZC1u0rISgzZBzKQwsO5h8TWSChYgLVzqZASmxnqHWO6P8NNfBLnooZAgCJByvtj4NbeJMAbAvboVl2K4FsvvNpZANYvSRBgB5tWnI9t2nsLgyQXkYOkPUMZAFhtTDchHp5fRWzw1QYDHYMPdXDOxYP8guABWPxLHrfGnD2ORDGlp7AAnx5lAZDZD",
  IG_TOKEN_HEAVENLYVILLA: "EAAazkOMLfJQBRW1HHZBDAJW7ZCX3iZAXkNE9dZCFctxyLMOm6k2frnHqNXetUHTjDobSGPLVfMRlXKuZAKBZA8Tp1Cjlkxct9vGHu7hDc9SfFYvJFsTZClaW6nHALlBXCFbKX4PhZBAOF0gkBLN3VKGwXtB2YqNI1VFVjPkvN231aXZB1ZCczsaGDG8xjs0rGaTmhtxdHiPZAf6CsARZB96SffSZBlgZDZD",
  IG_TOKEN_HILLVIEW: "EAAazkOMLfJQBRcUSfKaUhuOX8yAn01fZAVLBcsA4x1VWNh1NEnrS78vjO9GrdJYjgq3zTBbYzO6aWXt6xkuI7qAYZCQda4YpEnuLbyUFEx2bYfjmjRplxjAZCv8fnCVzlYZBTmwbU12lRuOmHLAjQAKVtYOrobO0sqETMZAufpYrVp06aJZAuZACDsPOKxDAhBqybsDM9XZBnqq9i1N0QYdlRgZDZD",
  IG_TOKEN_LAPARAISO: "EAAazkOMLfJQBRf1HrrCZBfMWfcipm2n5AXJwdZBUAvoyEyBOuJcMo7kaWzbPKzMJuaYIZBIYGwtLDiZBcjYZAXGRSUPuNK0v3DR01YRIGnpprbFZAQzecev2Ak8ZCwx4GkmWYvWZAPb3GEmkgkYN8hV7ZA8pFvK7aSEix9kRtLo4FenZBQj30q7YwWWznupt5tRQrpZAbcRwUisPVCgpNJ5OvMa5QZDZD",
  IG_TOKEN_MOUNTVIEW: "EAAazkOMLfJQBRaPYC71OfoQep6vFh2mpJr3GaAEf8naEb72pcS0lCTBAr8Kc9ZAtFn4wXGo7f9eXZA1SLFZCfIHJqyLBNa3pP1nb0SyyiZC0rkukSxeFlMCUOgEbBhAfXiUO9WoGTiXv3r7Vyf9KMX08xxvqp5ifkI88ktLJgzwwZC0tPWhMyCROr6t0aXMowib4ByIura102S5RVoGLwsgZDZD",
};

let env = fs.readFileSync(envPath, "utf8");

for (const [key, val] of Object.entries(newTokens)) {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(env)) {
    env = env.replace(regex, `${key}=${val}`);
    console.log(`✅ Updated ${key}`);
  } else {
    console.log(`⚠️  ${key} not found in .env — skipping`);
  }
}

fs.writeFileSync(envPath, env);
console.log("\nTokens updated. Restart wa-chatbot to apply.");
