const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

async function main() {
  console.log("Launching Chromium headful session...");
  // Use persistent context if possible, or new context
  const userDataDir = path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "User Data");
  
  let context;
  let browser;
  try {
    // Try launching using channel chrome to reuse login if possible
    browser = await chromium.launch({
      channel: "chrome",
      headless: false
    });
    context = await browser.newContext();
  } catch (e) {
    console.log("Could not launch system Chrome, launching bundled Chromium...", e.message);
    browser = await chromium.launch({ headless: false });
    context = await browser.newContext();
  }

  const page = await context.newPage();

  console.log("Navigating to Meta Developer App Review / Permissions page...");
  await page.goto("https://developers.facebook.com/apps/1886284726107284/app-review/permissions/", { waitUntil: "domcontentloaded", timeout: 45000 }).catch(e => console.log("Goto error:", e.message));

  await page.waitForTimeout(3000);

  const screenshotPath = path.join(__dirname, "..", "..", "..", "..", ".gemini", "antigravity", "brain", "df41fe0e-efb7-419f-96de-29df7354ce87", "permissions_page.png");
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  console.log("Screenshot saved to:", screenshotPath);
  console.log("Page title:", await page.title());
  console.log("Page URL:", page.url());

  // Also check Graph API Explorer
  console.log("\nNavigating to Graph API Explorer...");
  await page.goto("https://developers.facebook.com/tools/explorer/1886284726107284/", { waitUntil: "domcontentloaded", timeout: 45000 }).catch(e => console.log("Explorer goto error:", e.message));
  await page.waitForTimeout(3000);

  const explorerScreenshotPath = path.join(__dirname, "..", "..", "..", "..", ".gemini", "antigravity", "brain", "df41fe0e-efb7-419f-96de-29df7354ce87", "explorer_page.png");
  await page.screenshot({ path: explorerScreenshotPath, fullPage: true }).catch(() => {});
  console.log("Explorer Screenshot saved to:", explorerScreenshotPath);
  console.log("Explorer URL:", page.url());

  // Keep browser open for 15 seconds so user can see it or interact if needed
  await page.waitForTimeout(15000);
  await browser.close();
}

main().catch(e => console.error("Fatal error:", e));
