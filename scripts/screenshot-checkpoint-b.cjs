const { chromium } = require('playwright');
const path = require('path');
const artifactDir = 'C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/8c57bcf0-5ed6-4457-bd3b-82f404ed97c9';

(async () => {
  const browser = await chromium.launch();

  // Desktop Context - Owner (Jordan Lee)
  const dCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const dPage = await dCtx.newPage();
  await dPage.goto('http://localhost:4000', { waitUntil: 'domcontentloaded' });
  await dPage.waitForTimeout(2000);

  const dSignin = await dPage.$('#entry-btn-signin');
  if (dSignin) await dSignin.click();
  await dPage.waitForTimeout(400);
  const dDemo = await dPage.$('[data-tab="demo"]');
  if (dDemo) await dDemo.click();
  await dPage.waitForTimeout(400);

  const ownerBtn = await dPage.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000014"]');
  if (ownerBtn) await ownerBtn.click();
  await dPage.waitForSelector('#sr-app-shell', { timeout: 8000 });
  await dPage.waitForTimeout(1000);

  const ownerViews = [
    ['schedule', 'checkpoint-b-manager-schedule-desktop.png'],
    ['team', 'checkpoint-b-team-directory-desktop.png'],
    ['handovers', 'checkpoint-b-manager-handovers-desktop.png'],
    ['approvals', 'checkpoint-b-approvals-desktop.png'],
    ['settings', 'checkpoint-b-owner-settings-desktop.png']
  ];

  for (const [v, filename] of ownerViews) {
    await dPage.evaluate((viewName) => window.Phase1Shell.navigate(viewName), v);
    await dPage.waitForTimeout(1200);
    await dPage.screenshot({ path: path.join(artifactDir, filename) });
    console.log(`Saved ${filename}`);
  }

  // Mobile Context - Owner
  const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mPage = await mCtx.newPage();
  await mPage.goto('http://localhost:4000', { waitUntil: 'domcontentloaded' });
  await mPage.waitForTimeout(1500);

  const mSignin = await mPage.$('#entry-btn-signin');
  if (mSignin) await mSignin.click();
  await mPage.waitForTimeout(400);
  const mDemo = await mPage.$('[data-tab="demo"]');
  if (mDemo) await mDemo.click();
  await mPage.waitForTimeout(400);

  const mOwnerBtn = await mPage.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000014"]');
  if (mOwnerBtn) await mOwnerBtn.click();
  await mPage.waitForSelector('#sr-app-shell', { timeout: 8000 });
  await mPage.waitForTimeout(1000);

  const ownerMobileViews = [
    ['team', 'checkpoint-b-team-directory-mobile.png'],
    ['settings', 'checkpoint-b-owner-settings-mobile.png']
  ];

  for (const [v, filename] of ownerMobileViews) {
    await mPage.evaluate((viewName) => window.Phase1Shell.navigate(viewName), v);
    await mPage.waitForTimeout(1200);
    await mPage.screenshot({ path: path.join(artifactDir, filename) });
    console.log(`Saved ${filename}`);
  }

  // Worker Context - Amina Otieno
  const wCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const wPage = await wCtx.newPage();
  await wPage.goto('http://localhost:4000', { waitUntil: 'domcontentloaded' });
  await wPage.waitForTimeout(1500);

  const wSignin = await wPage.$('#entry-btn-signin');
  if (wSignin) await wSignin.click();
  await wPage.waitForTimeout(400);
  const wDemo = await wPage.$('[data-tab="demo"]');
  if (wDemo) await wDemo.click();
  await wPage.waitForTimeout(400);

  const wBtn = await wPage.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000011"]');
  if (wBtn) await wBtn.click();
  await wPage.waitForSelector('#sr-app-shell', { timeout: 8000 });
  await wPage.waitForTimeout(1000);

  const workerViews = [
    ['schedule', 'checkpoint-b-worker-schedule-desktop.png'],
    ['handovers', 'checkpoint-b-worker-handovers-desktop.png'],
    ['me', 'checkpoint-b-worker-me-desktop.png']
  ];

  for (const [v, filename] of workerViews) {
    await wPage.evaluate((viewName) => window.Phase1Shell.navigate(viewName), v);
    await wPage.waitForTimeout(1200);
    await wPage.screenshot({ path: path.join(artifactDir, filename) });
    console.log(`Saved ${filename}`);
  }

  // Worker Mobile Views
  const wmCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const wmPage = await wmCtx.newPage();
  await wmPage.goto('http://localhost:4000', { waitUntil: 'domcontentloaded' });
  await wmPage.waitForTimeout(1500);

  const wmSignin = await wmPage.$('#entry-btn-signin');
  if (wmSignin) await wmSignin.click();
  await wmPage.waitForTimeout(400);
  const wmDemo = await wmPage.$('[data-tab="demo"]');
  if (wmDemo) await wmDemo.click();
  await wmPage.waitForTimeout(400);

  const wmBtn = await wmPage.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000011"]');
  if (wmBtn) await wmBtn.click();
  await wmPage.waitForSelector('#sr-app-shell', { timeout: 8000 });
  await wmPage.waitForTimeout(1000);

  const wmViews = [
    ['schedule', 'checkpoint-b-worker-schedule-mobile.png'],
    ['handovers', 'checkpoint-b-worker-handovers-mobile.png'],
    ['me', 'checkpoint-b-worker-me-mobile.png']
  ];

  for (const [v, filename] of wmViews) {
    await wmPage.evaluate((viewName) => window.Phase1Shell.navigate(viewName), v);
    await wmPage.waitForTimeout(1200);
    await wmPage.screenshot({ path: path.join(artifactDir, filename) });
    console.log(`Saved ${filename}`);
  }

  await browser.close();
  console.log('All Checkpoint B screenshots generated.');
})().catch(e => { console.error('Error:', e); process.exit(1); });
