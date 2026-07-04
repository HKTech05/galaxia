const { chromium } = require("playwright");
const path = require("path");

async function main() {
  console.log("Launching Chromium via Playwright...");
  const browser = await chromium.launch({
    headless: false, // Show UI window so user can log in if needed
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();
  console.log("Navigating to Meta Developers App Dashboard...");
  await page.goto("https://developers.facebook.com/apps/1886284726107284/", { waitUntil: "networkidle", timeout: 30000 }).catch(e => console.log("Navigation note:", e.message));

  const screenshotPath = path.join("C:", "Users", "krish", ".gemini", "antigravity", "brain", "df41fe0e-efb7-419f-96de-29df7354ce87", "meta_dashboard.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log("Screenshot saved to:", screenshotPath);
  console.log("Current Page Title:", await page.title());
  console.log("Current URL:", page.url());

  // Keep open for a moment
  await page.waitForTimeout(5000);
  await browser.close();
}

main().catch(e => console.error("Error:", e));
