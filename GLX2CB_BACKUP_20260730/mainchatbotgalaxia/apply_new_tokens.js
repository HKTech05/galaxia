const fs = require('fs');

const envPaths = [
  '/home/ec2-user/galaxia/wa-chatbot/.env',
  '/home/ec2-user/galaxia/GLX2CB/mainchatbotgalaxia/.env'
];

const newTokens = {
  INSTAGRAM_TOKEN: "IGAAXTprnk4M1BZAGFYUmhkaE1qNHV1b09UU2ZAXOEZAJdWs5QmItOG5qMUxxUDNQemhGcGhoMXFCbU13MW5vLWIxMGNXeXJQd2dUTGppMFBsdXRyVUliTmxjeEdsNVJ6X2FwMm11ZAzZAGRVNtUEdiMXVXaWF1b3lxVFAyR1ctT0JaYwZDZD",
  IG_TOKEN_MOUNTVIEW: "IGAAXTprnk4M1BZAGEyQXc2dENtdlN2NDlrUVpROWItVGRYaXVyOGhwSHh0TGJpLUh2ZAm5TQTRkdDcwOGFQMU5DTldOYmcxeHExWHdKTjh5bWZAPaElVOVVaR2lIcV9Kdno1RkFpMEtKQzNQRHZATSWJaVUVLOFlzSUx6SFItbWdGQQZDZD",
  IG_TOKEN_HILLVIEW: "IGAAXTprnk4M1BZAFplbHhFeTVUMkxTeGZA1Sm5PZADByUHJsWTFNQ1llajF4X3lWeU9CdnlLeFZA5Y29oUDVlVXhLd1dvSnlqcXpjN2hEeU8tNXpJTzBidDBfTUg4RE9wNGYyZAUZADNmVvcFZAnMFVxVEN5YWE2MHRVNE93RS0wTDN3ZAwZDZD",
  IG_TOKEN_HEAVENLYVILLA: "IGAAXTprnk4M1BZAGJSSmJ6ZATliX3pJRUlfbkl2b282NkM4aDVqZAER0RGRmRHB2S3MtTXhRcDJ1dV92akVqWXhmeVNsUjc1Tkd2bnRDMGtvVUdJMmdBcUJxUTVjbFkxTDdLSzdVekNJR0pyTEs4ekpWZAkU5WTY5SlR5WGpobi1DRQZDZD",
  IG_TOKEN_AMBROSE: "IGAAXTprnk4M1BZAFllbVdCOUF3TjZAWMjlQaTJ5Y2I4TExDYTNqQXdockhQS2w2Q1ZARbmFxZAEdqSHVOZAUg3NE9jOFBSVkUwTFVOZAEhqU1VsWkpIc05EbkVxaGFIVTVEYllEbmNHQWRnMjE0VGJUU2lycTBoY2c0QVI2NFhncGcyZAwZDZD",
  IG_TOKEN_LAPARAISO: "IGAAXTprnk4M1BZAGFZAM1RXQmp4Y254QWMyRk9zZAjBZAYnBsWnhFMWQxQlBxLXhSMHBKTVlpZAnh0NjBXYXZAaWDN1eWJhWjVBS21udk1lNWpZAMFNLM1d2d1lleU10UE5raGp6Uk5GSG9TcjRVWi1XRkFXMGczN2prWmxQdW83WDZANRQZDZD",
  IG_TOKEN_AMSTELNEST: "IGAAXTprnk4M1BZAGFVNnBsQnBhX3BhYlR6bXJjcjA1NWlsc0puOUx4Y25jTktUZAE1MMGs0NF8zOHprbW1XcERseVRwUUdjQTdqMV9zWlBYNnZAQZAGxwMFFhMG5RUjBLTGFfemF6cFBpdVRRWlVGVkU2emtEMFBqSDljaWZAVb0ozdwZDZD"
};

for (const envPath of envPaths) {
  if (!fs.existsSync(envPath)) continue;
  let env = fs.readFileSync(envPath, 'utf8');

  for (const [key, val] of Object.entries(newTokens)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(env)) {
      env = env.replace(regex, `${key}=${val}`);
      console.log(`Updated ${key} in ${envPath}`);
    } else {
      env += `\n${key}=${val}`;
      console.log(`Added ${key} in ${envPath}`);
    }
  }

  fs.writeFileSync(envPath, env);
}

console.log('\nAll tokens updated successfully.');
