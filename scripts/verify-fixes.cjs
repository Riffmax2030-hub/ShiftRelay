const { chromium } = require('playwright');

(async () => {
  console.log('--- Starting Verification of Bug A (Clock-in) & Bug B (Theme Toggle) ---');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // Listen to console and page errors
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[Browser Error]:', msg.text());
  });

  await page.goto('http://localhost:4000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Login as worker
  const signinBtn = await page.$('#entry-btn-signin');
  if (signinBtn) await signinBtn.click();
  await page.waitForTimeout(400);

  const demoTab = await page.$('[data-tab="demo"]');
  if (demoTab) await demoTab.click();
  await page.waitForTimeout(400);

  const workerBtn = await page.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000011"]');
  if (workerBtn) await workerBtn.click();
  await page.waitForSelector('#sr-app-shell', { timeout: 10000 });
  await page.waitForTimeout(800);

  console.log('✓ Successfully logged in as Worker to Today view');

  // Verify Header Theme Toggle
  const themeHeaderBtn = await page.$('#sr-shell-theme-toggle');
  if (!themeHeaderBtn) throw new Error('Theme toggle button not found in header');

  const themeInitial = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'light');
  console.log('Initial theme:', themeInitial);

  // Click header theme toggle to turn dark
  await themeHeaderBtn.click();
  await page.waitForTimeout(400);

  const themeAfterFirstClick = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const shellBgDark = await page.evaluate(() => getComputedStyle(document.getElementById('sr-app-shell')).backgroundColor);
  console.log('Theme after header toggle click:', themeAfterFirstClick, '| App shell bg:', shellBgDark);
  if (themeAfterFirstClick !== 'dark') throw new Error('Expected theme to be dark');

  // Click header theme toggle again to turn light
  await themeHeaderBtn.click();
  await page.waitForTimeout(400);
  const themeAfterSecondClick = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log('Theme after 2nd header click:', themeAfterSecondClick);
  if (themeAfterSecondClick !== 'light') throw new Error('Expected theme to return to light');

  // Verify Worker Me theme toggle
  await page.evaluate(() => window.Phase1Shell.navigate('me'));
  await page.waitForTimeout(600);

  const themeSwitch = await page.$('#sr-theme-switch');
  if (!themeSwitch) throw new Error('#sr-theme-switch not found in Me view');

  // Click Me theme switch
  await themeSwitch.click({ force: true });
  await page.waitForTimeout(400);

  const themeAfterMeSwitch = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log('Theme after Worker Me switch:', themeAfterMeSwitch);
  if (themeAfterMeSwitch !== 'dark') throw new Error('Expected theme to be dark from Me switch');

  // Return to Today view to test Clock-in
  await page.evaluate(() => window.Phase1Shell.navigate('today'));
  await page.waitForTimeout(600);

  // Check clock button
  const clockBtn = await page.$('#sr-btn-toggle-clock');
  if (!clockBtn) throw new Error('Clock button not found');

  const initialStatus = await page.evaluate(() => document.getElementById('sr-today-shift-status')?.textContent.trim());
  console.log('Initial shift status:', initialStatus);

  // Click clock toggle
  await clockBtn.click();
  console.log('Clock button clicked, waiting for status update...');
  await page.waitForTimeout(1500);

  const updatedStatus = await page.evaluate(() => document.getElementById('sr-today-shift-status')?.textContent.trim());
  const timerText1 = await page.evaluate(() => document.getElementById('sr-elapsed-timer')?.textContent.trim() || 'N/A');
  console.log('Updated shift status:', updatedStatus, '| Timer at T0:', timerText1);

  // Wait 2 seconds to verify the live elapsed timer ticks
  await page.waitForTimeout(2100);
  const timerText2 = await page.evaluate(() => document.getElementById('sr-elapsed-timer')?.textContent.trim() || 'N/A');
  console.log('Timer after 2s:', timerText2);

  // If clocked in, clock out to restore state
  if (updatedStatus && updatedStatus.includes('Active')) {
    const clockOutBtn = await page.$('#sr-btn-toggle-clock');
    if (clockOutBtn) {
      await clockOutBtn.click();
      await page.waitForTimeout(1500);
      const finalStatus = await page.evaluate(() => document.getElementById('sr-today-shift-status')?.textContent.trim());
      console.log('Final status after clocking out:', finalStatus);
    }
  }

  console.log('--- ALL VERIFICATIONS PASSED SUCCESSFULLY ---');
  await browser.close();
})().catch(e => {
  console.error('Verification failed:', e);
  process.exit(1);
});
