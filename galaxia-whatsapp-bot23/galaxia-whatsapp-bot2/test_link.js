require("dotenv").config({ path: "/home/ec2-user/galaxia/wa-chatbot/.env" });
const https = require("https");

const pages = [
  { name: "Ambrose", token: process.env.IG_TOKEN_AMBROSE, pageId: process.env.IG_PAGE_ID_AMBROSE },
];

function apiCall(method, path, token) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v21.0${path}?access_token=${token}`;
    https.get(url, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve(JSON.parse(body)));
    });
  });
}

(async () => {
  for (const p of pages) {
    const res = await apiCall("GET", `/${p.pageId}&fields=name,instagram_business_account`, p.token);
    console.log(`Page: ${p.name}`);
    console.log(JSON.stringify(res, null, 2));
  }
})();
