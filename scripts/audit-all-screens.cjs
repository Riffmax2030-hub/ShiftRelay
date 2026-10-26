const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('response', resp => {
    if (resp.status() >= 400) networkErrors.push(`${resp.status()} ${resp.url()}`);
  });

  await page.goto('http://localhost:4000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Login as Jordan Lee (Owner) to test Manager/Owner screens
  const signinBtn = await page.$('#entry-btn-signin');
  if (signinBtn) await signinBtn.click();
  await page.waitForTimeout(500);

  const demoTab = await page.$('[data-tab="demo"]');
  if (demoTab) await demoTab.click();
  await page.waitForTimeout(500);

  const ownerBtn = await page.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000014"]');
  if (ownerBtn) await ownerBtn.click();
  await page.waitForSelector('#sr-app-shell', { timeout: 8000 });
  await page.waitForTimeout(1000);

  console.log('--- Testing Manager/Owner Views ---');
  const views = ['overview', 'schedule', 'team', 'handovers', 'approvals', 'settings'];
  for (const v of views) {
    consoleErrors.length = 0;
    networkErrors.length = 0;
    console.log(`Navigating to: ${v}`);
    await page.evaluate((viewName) => window.Phase1Shell.navigate(viewName), v);
    await page.waitForTimeout(1200);

    const content = await page.$eval('#sr-content-area', el => el.innerText);
    const hasRetry = content.toLowerCase().includes('retry');
    const hasError = content.toLowerCase().includes('could not load') || content.toLowerCase().includes('error');
    console.log(`  [${v}] hasRetry: ${hasRetry}, hasError: ${hasError}`);
    if (hasRetry || hasError) {
      console.log(`  Content snippet: ${content.slice(0, 200)}...`);
    }
    if (networkErrors.length > 0) {
      console.log(`  Network errors on ${v}:`, networkErrors);
    }
    if (consoleErrors.length > 0) {
      console.log(`  Console errors on ${v}:`, consoleErrors);
    }
  }

  // Now test Worker Views
  console.log('--- Testing Worker Views ---');
  const workerCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const wpage = await workerCtx.newPage();
  await wpage.goto('http://localhost:4000', { waitUntil: 'domcontentloaded' });
  await wpage.waitForTimeout(2000);

  const wSignin = await wpage.$('#entry-btn-signin');
  if (wSignin) await wSignin.click();
  await wpage.waitForTimeout(500);
  const wDemo = await wpage.$('[data-tab="demo"]');
  if (wDemo) await wDemo.click();
  await wpage.waitForTimeout(500);
  const wBtn = await wpage.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000011"]');
  if (wBtn) await wBtn.click();
  await wpage.waitForSelector('#sr-app-shell', { timeout: 8000 });
  await wpage.waitForTimeout(1000);

  const workerViews = ['today', 'schedule', 'handovers', 'me'];
  for (const wv of workerViews) {
    console.log(`Navigating worker to: ${wv}`);
    await wpage.evaluate((viewName) => window.Phase1Shell.navigate(viewName), wv);
    await wpage.waitForTimeout(1200);

    const content = await wpage.$eval('#sr-content-area', el => el.innerText);
    const hasRetry = content.toLowerCase().includes('retry');
    const hasError = content.toLowerCase().includes('could not load') || content.toLowerCase().includes('error');
    console.log(`  [${wv}] hasRetry: ${hasRetry}, hasError: ${hasError}`);
    if (hasRetry || hasError) {
      console.log(`  Content snippet: ${content.slice(0, 200)}...`);
    }
  }

  await browser.close();
})().catch(e => { console.error('Error:', e); process.exit(1); });
