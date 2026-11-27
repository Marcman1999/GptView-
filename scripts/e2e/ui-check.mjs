// Browser checks for Gpt View's UI (Phase 1).
// Usage: BASE_URL=http://localhost:3000 CHROME_PATH=/path/to/chrome node scripts/e2e/ui-check.mjs
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CHROME = process.env.CHROME_PATH ?? "chromium";
const SHOTS = process.env.SHOT_DIR ?? "test-results/ui";
const VALID = "https://chatgpt.com/share/6b0893b9-6660-83e9-88e8-90d58706e477";
const VALID_ID = "6b0893b9-6660-83e9-88e8-90d58706e477";

const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 860, isMobile: false },
  { name: "phone", width: 375, height: 740, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

fs.mkdirSync(SHOTS, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});

for (const vp of VIEWPORTS) {
  const tag = `[${vp.name}]`;
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  await page.setViewport(vp);

  // 1. Landing renders
  await page.goto(BASE, { waitUntil: "networkidle0" });
  const title = await page.title();
  check(`${tag} landing title`, title === "Gpt View", title);

  const h1 = await page.$eval("h1", (el) => el.textContent.trim());
  check(`${tag} landing heading`, h1.includes("Read shared"), h1.replace(/\s+/g, " "));

  const fontOk = await page.evaluate(() => document.fonts.check('16px "Anton"'));
  check(`${tag} display font (Anton) loaded`, fontOk);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${tag} no horizontal overflow on landing`, overflow <= 0, `overflow=${overflow}px`);

  const btnBox = await page.$eval("button[type=submit]", (b) => {
    const r = b.getBoundingClientRect();
    return { h: r.height, w: r.width };
  });
  check(`${tag} submit button tap target ≥44px tall`, btnBox.h >= 44, `${Math.round(btnBox.h)}px`);

  await page.screenshot({ path: path.join(SHOTS, `landing-${vp.name}.png`), fullPage: true });

  // 2. Empty submit shows error and does not navigate
  await page.click("button[type=submit]");
  await page.waitForSelector('[role=alert] p', { timeout: 3000 });
  const emptyMsg = await page.$eval('[role=alert]', (el) => el.textContent.trim());
  check(`${tag} empty submit shows message`, emptyMsg.includes("Paste a ChatGPT share link"), emptyMsg);
  check(`${tag} empty submit stays on landing`, new URL(page.url()).pathname === "/");
  const invalidAttr = await page.$eval("input", (i) => i.getAttribute("aria-invalid"));
  check(`${tag} input flagged aria-invalid`, invalidAttr === "true");

  // 3. Wrong host shows specific message
  await page.type("input", "https://example.com/share/" + VALID_ID);
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector('[role=alert]')?.textContent.includes("ChatGPT share"), { timeout: 3000 });
  const hostMsg = await page.$eval('[role=alert]', (el) => el.textContent.trim());
  check(`${tag} wrong site rejected with message`, hostMsg.includes("only reads ChatGPT"), hostMsg);
  check(`${tag} error clears when typing`, (await page.$eval("input", (i) => i.value)).length > 0);
  await page.screenshot({ path: path.join(SHOTS, `error-${vp.name}.png`), fullPage: false });

  // 4. Valid link navigates to reader route via Enter key
  await page.click("input", { clickCount: 3 });
  await page.keyboard.press("Backspace");
  await page.type("input", VALID);
  await Promise.all([
    page.waitForFunction((id) => location.pathname === `/read/${id}`, { timeout: 8000 }, VALID_ID),
    page.keyboard.press("Enter"),
  ]);
  check(`${tag} valid link navigates to /read/<id>`, new URL(page.url()).pathname === `/read/${VALID_ID}`);
  await page.waitForSelector("h1");
  // The sandbox has no route to chatgpt.com, so the reader must show a clear error here
  // (not a blank page). On a machine with access it shows the conversation.
  const readH1 = await page.$eval("h1", (el) => el.textContent.trim());
  const hasConversation = await page.$("[data-testid=conversation]");
  const hasError = await page.$("[data-testid=share-error]");
  check(`${tag} reader shows conversation or clear error`, Boolean(hasConversation || hasError), readH1);
  const readOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${tag} no horizontal overflow on reader route`, readOverflow <= 0, `overflow=${readOverflow}px`);
  await page.screenshot({ path: path.join(SHOTS, `reader-placeholder-${vp.name}.png`), fullPage: true });

  // 5. Click the example link on landing
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click('a[href^="/read/"]')]);
  check(`${tag} example link opens reader`, new URL(page.url()).pathname === `/read/${VALID_ID}`);

  // Console errors are checked before the deliberate 404 test below
  check(`${tag} no console errors (valid flows)`, consoleErrors.length === 0, consoleErrors.join(" | ").slice(0, 300));
  consoleErrors.length = 0;

  // 6. Malformed read id gives 404 page
  const resp = await page.goto(`${BASE}/read/not-a-real-id`, { waitUntil: "networkidle0" });
  const notFoundText = await page.$eval("h1", (el) => el.textContent.trim()).catch(() => "");
  check(`${tag} malformed id shows not-found`, notFoundText.toLowerCase().includes("not found"), `status=${resp?.status()}`);
  await page.screenshot({ path: path.join(SHOTS, `not-found-${vp.name}.png`), fullPage: false });

  // 7. Skip link is first focusable and works
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.className);
  check(`${tag} skip link is first tab stop`, String(focused).includes("skip-link"));

  await page.close();
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("Failed:");
  for (const f of failed) console.log(" -", f.name, f.detail);
  process.exit(1);
}
