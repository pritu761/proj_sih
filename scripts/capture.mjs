import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(".screenshots");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});

const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});

async function shot(name, opts = {}) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: !!opts.fullPage });
  console.log("captured", name);
}

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await shot("01-login", { fullPage: true });

await page.fill("#email", "admin@aicte.gov.in");
await page.fill("#password", "AdminPassword@123");
await page.click('button[type="submit"]');
await page.waitForURL("http://localhost:3000/", { timeout: 20000 });
await page.waitForLoadState("networkidle");
await shot("02-dashboard", { fullPage: true });

await page.goto("http://localhost:3000/cases", { waitUntil: "networkidle" });
await shot("03-cases", { fullPage: true });

// Find a case detail link
const caseHref = await page.evaluate(() => {
  const a = Array.from(document.querySelectorAll('a[href^="/cases/"]')).find(
    (el) => /\/cases\/[^/]+$/.test(el.getAttribute("href") || "") && !el.getAttribute("href").includes("/new")
  );
  return a?.getAttribute("href") || null;
});
if (caseHref) {
  await page.goto(`http://localhost:3000${caseHref}`, { waitUntil: "networkidle" });
  await shot("04-case-detail", { fullPage: true });
}

await page.goto("http://localhost:3000/institutions", { waitUntil: "networkidle" });
await shot("05-institutions", { fullPage: true });

const instHref = await page.evaluate(() => {
  const a = document.querySelector('a[href^="/institutions/"]');
  return a?.getAttribute("href") || null;
});
if (instHref) {
  await page.goto(`http://localhost:3000${instHref}`, { waitUntil: "networkidle" });
  await shot("06-institution-detail", { fullPage: true });
}

await page.goto("http://localhost:3000/alerts", { waitUntil: "networkidle" });
await shot("07-alerts", { fullPage: true });

await page.goto("http://localhost:3000/reports", { waitUntil: "networkidle" });
await shot("08-reports", { fullPage: true });

await page.goto("http://localhost:3000/audit", { waitUntil: "networkidle" });
await shot("09-audit", { fullPage: true });

await page.goto("http://localhost:3000/cases/new", { waitUntil: "networkidle" });
await shot("10-new-case", { fullPage: true });

// Mobile pass
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await shot("11-dashboard-mobile", { fullPage: true });
await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await shot("12-login-mobile", { fullPage: true });

await browser.close();
console.log("done");
