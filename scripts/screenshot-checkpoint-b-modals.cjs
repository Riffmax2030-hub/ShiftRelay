const { chromium } = require('playwright');
const path = require('path');
const artifactDir = 'C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/8c57bcf0-5ed6-4457-bd3b-82f404ed97c9';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const signinBtn = await page.$('#entry-btn-signin');
  if (signinBtn) await signinBtn.click();
  await page.waitForTimeout(400);
  const demoTab = await page.$('[data-tab="demo"]');
  if (demoTab) await demoTab.click();
  await page.waitForTimeout(400);

  const workerBtn = await page.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000011"]');
  if (workerBtn) await workerBtn.click();
  await page.waitForSelector('#sr-app-shell', { timeout: 8000 });
  await page.waitForTimeout(1000);

  // Open notifications panel
  const bell = await page.$('#sr-shell-bell');
  if (bell) await bell.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(artifactDir, 'checkpoint-b-notifications-desktop.png') });
  console.log('Saved notifications screenshot');

  // Close notifications
  const closeNotif = await page.$('#sr-notif-close-btn');
  if (closeNotif) await closeNotif.click();
  await page.waitForTimeout(500);

  // Open context switcher modal
  const contextPill = await page.$('#sr-btn-context');
  if (contextPill) await contextPill.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(artifactDir, 'checkpoint-b-context-switcher-modal.png') });
  console.log('Saved context switcher modal screenshot');

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
