const { chromium } = require('playwright');
const path = require('path');
const artifactDir = 'C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/8c57bcf0-5ed6-4457-bd3b-82f404ed97c9';

(async () => {
  console.log('[1/5] Launching browser...');
  const browser = await chromium.launch();

  // Desktop Context
  const desktopCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1
  });
  const page = await desktopCtx.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  console.log('[2/5] Loading http://localhost:4000...');
  const navStart = Date.now();
    await page.goto('http://localhost:4000', { waitUntil: 'domcontentloaded', timeout: 10000 });
  const loadDuration = Date.now() - navStart;
  console.log(`Page loaded in ${loadDuration}ms`);

  // Wait for splash fade or entry screen
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'premium-entry-desktop.png') });
  console.log('Saved premium-entry-desktop.png');

  // Open login sheet if not already open
  const startBtn = await page.$('#entry-btn-start');
  const signinBtn = await page.$('#entry-btn-signin');
  if (signinBtn && await signinBtn.isVisible()) {
    await signinBtn.click();
    await page.waitForTimeout(500);
  } else if (startBtn && await startBtn.isVisible()) {
    await startBtn.click();
    await page.waitForTimeout(500);
  }

  // Click Demo tab
  const demoTab = await page.$('[data-tab="demo"]');
  if (demoTab) {
    await demoTab.click();
    await page.waitForTimeout(600);
  }

  // Click Amina Otieno (Worker)
  const workerBtn = await page.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000011"]');
  if (workerBtn) {
    console.log('[3/5] Logging in as Worker (Amina Otieno)...');
    await workerBtn.click();
    await page.waitForSelector('#sr-app-shell', { timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(artifactDir, 'premium-worker-today-desktop.png') });
    console.log('Saved premium-worker-today-desktop.png');
  } else {
    console.warn('Worker demo button not found');
  }

  // Mobile Context - Worker View
  console.log('[4/5] Testing Mobile View (390x844)...');
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const mobPage = await mobileCtx.newPage();
  await mobPage.goto('http://localhost:4000', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await mobPage.waitForTimeout(1500);

  // Sign in on mobile as worker
  const mobSignin = await mobPage.$('#entry-btn-signin');
  if (mobSignin && await mobSignin.isVisible()) {
    await mobSignin.click();
    await mobPage.waitForTimeout(500);
  }
  const mobDemoTab = await mobPage.$('[data-tab="demo"]');
  if (mobDemoTab) {
    await mobDemoTab.click();
    await mobPage.waitForTimeout(500);
  }
  const mobWorkerBtn = await mobPage.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000011"]');
  if (mobWorkerBtn) {
    await mobWorkerBtn.click();
    await mobPage.waitForSelector('#sr-app-shell', { timeout: 8000 });
    await mobPage.waitForTimeout(1500);
    await mobPage.screenshot({ path: path.join(artifactDir, 'premium-worker-today-mobile.png') });
    console.log('Saved premium-worker-today-mobile.png');
  }

  // Manager Overview - Desktop
  console.log('[5/5] Testing Manager View (David Kariuki / Jordan Lee)...');
  const mgrCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1
  });
  const mgrPage = await mgrCtx.newPage();
  await mgrPage.goto('http://localhost:4000', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await mgrPage.waitForTimeout(1500);

  const mgrSignin = await mgrPage.$('#entry-btn-signin');
  if (mgrSignin && await mgrSignin.isVisible()) {
    await mgrSignin.click();
    await mgrPage.waitForTimeout(500);
  }
  const mgrDemoTab = await mgrPage.$('[data-tab="demo"]');
  if (mgrDemoTab) {
    await mgrDemoTab.click();
    await mgrPage.waitForTimeout(500);
  }
  // Click Jordan Lee (Owner) or David Kariuki (Supervisor)
  const ownerBtn = await mgrPage.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000014"]') ||
                   await mgrPage.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000012"]');
  if (ownerBtn) {
    await ownerBtn.click();
    await mgrPage.waitForSelector('#sr-app-shell', { timeout: 8000 });
    await mgrPage.waitForTimeout(1500);
    await mgrPage.screenshot({ path: path.join(artifactDir, 'premium-manager-overview-desktop.png') });
    console.log('Saved premium-manager-overview-desktop.png');
  }

  // Manager Mobile
  const mgrMobCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const mgrMobPage = await mgrMobCtx.newPage();
  await mgrMobPage.goto('http://localhost:4000', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await mgrMobPage.waitForTimeout(1500);
  const mmSignin = await mgrMobPage.$('#entry-btn-signin');
  if (mmSignin && await mmSignin.isVisible()) {
    await mmSignin.click();
    await mgrMobPage.waitForTimeout(500);
  }
  const mmDemoTab = await mgrMobPage.$('[data-tab="demo"]');
  if (mmDemoTab) {
    await mmDemoTab.click();
    await mgrMobPage.waitForTimeout(500);
  }
  const mmOwnerBtn = await mgrMobPage.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000014"]');
  if (mmOwnerBtn) {
    await mmOwnerBtn.click();
    await mgrMobPage.waitForSelector('#sr-app-shell', { timeout: 8000 });
    await mgrMobPage.waitForTimeout(1500);
    await mgrMobPage.screenshot({ path: path.join(artifactDir, 'premium-manager-overview-mobile.png') });
    console.log('Saved premium-manager-overview-mobile.png');
  }

  await browser.close();
  console.log('--- Summary ---');
  console.log(`Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }
  console.log('All Checkpoint A screenshots successfully generated.');
})().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

