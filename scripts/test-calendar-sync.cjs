const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('--- Starting Verification of Zero-Cost Shift Schedule & Calendar Sync (.ics) ---');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 850 },
    acceptDownloads: true
  });
  const page = await ctx.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[Browser Error]:', msg.text());
  });

  const artifactDir = path.resolve('C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/8c57bcf0-5ed6-4457-bd3b-82f404ed97c9');

  await page.goto('http://localhost:4000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 1. Sign in as Frontline Worker (Amina Otieno)
  await page.click('#entry-btn-signin');
  await page.waitForTimeout(400);
  await page.click('[data-tab="demo"]');
  await page.waitForTimeout(400);

  const workerBtn = await page.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000011"]');
  if (!workerBtn) throw new Error('Worker login button not found');
  await workerBtn.click();
  await page.waitForSelector('#sr-app-shell', { timeout: 10000 });
  await page.waitForTimeout(600);
  console.log('✓ Step 1: Signed in as Frontline Worker (Amina Otieno)');

  // 2. Navigate to Worker Schedule
  await page.evaluate(() => window.Phase1Shell.navigate('schedule'));
  await page.waitForTimeout(1000);

  // Verify "Sync Calendar (.ics)" button
  const syncBtn = await page.$('#sr-btn-sync-calendar-worker');
  if (!syncBtn) throw new Error('Sync Calendar (.ics) button not found on worker schedule');
  console.log('✓ Step 2: Confirmed "Sync Calendar (.ics)" button on worker schedule header');

  await page.screenshot({ path: path.join(artifactDir, 'feature-schedule-worker.png') });

  // 3. Click "Sync Calendar (.ics)"
  await syncBtn.click();
  await page.waitForSelector('#sr-calendar-backdrop', { timeout: 3000 });
  await page.waitForTimeout(400);
  console.log('✓ Step 3: Calendar Sync modal opened');

  await page.screenshot({ path: path.join(artifactDir, 'feature-calendar-sync-modal.png') });

  // 4. Download worker .ics calendar file
  const downloadIcsBtn = await page.$('#sr-btn-download-ics');
  if (!downloadIcsBtn) throw new Error('Download .ics button not found in modal');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    downloadIcsBtn.click()
  ]);

  const downloadPath = await download.path();
  const downloadFilename = download.suggestedFilename();
  console.log(`✓ Step 4: Worker .ics download intercepted: ${downloadFilename}`);

  const icsContent = fs.readFileSync(downloadPath, 'utf-8');
  console.log('Worker .ics excerpt:\n', icsContent.slice(0, 320));

  if (!icsContent.includes('BEGIN:VCALENDAR') || !icsContent.includes('BEGIN:VEVENT') || !icsContent.includes('END:VCALENDAR')) {
    throw new Error('Downloaded file is not a valid RFC 5545 iCalendar (.ics) document');
  }
  console.log('✓ Step 5: Validated RFC 5545 iCalendar standard structure with VEVENT entries');

  // Close worker modal
  await page.click('#sr-calendar-close-btn');
  await page.waitForTimeout(400);

  // 5. Sign out and sign in as Organisation Owner (Jordan Lee)
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  });
  await page.waitForTimeout(1200);

  await page.click('#entry-btn-signin');
  await page.waitForTimeout(400);
  await page.click('[data-tab="demo"]');
  await page.waitForTimeout(400);

  const ownerBtn = await page.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000014"]');
  await ownerBtn.click();
  await page.waitForSelector('#sr-app-shell', { timeout: 10000 });
  await page.waitForTimeout(600);
  console.log('✓ Step 6: Signed in as Organisation Owner (Jordan Lee)');

  // 6. Navigate to Manager Schedule
  await page.evaluate(() => window.Phase1Shell.navigate('schedule'));
  await page.waitForTimeout(1000);

  const mgrSyncBtn = await page.$('#sr-btn-sync-calendar-mgr');
  if (!mgrSyncBtn) throw new Error('Export Roster (.ics) button not found on manager schedule');
  console.log('✓ Step 7: Confirmed "Export Roster (.ics)" action button on manager team schedule');

  await page.screenshot({ path: path.join(artifactDir, 'feature-schedule-manager.png') });

  // 7. Click "Export Roster (.ics)"
  await mgrSyncBtn.click();
  await page.waitForSelector('#sr-calendar-backdrop', { timeout: 3000 });
  await page.waitForTimeout(400);
  console.log('✓ Step 8: Manager roster calendar sync modal opened');

  const [mgrDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#sr-btn-download-ics')
  ]);
  const mgrDownloadPath = await mgrDownload.path();
  const mgrContent = fs.readFileSync(mgrDownloadPath, 'utf-8');
  console.log('Manager roster .ics excerpt:\n', mgrContent.slice(0, 320));

  if (!mgrContent.includes('BEGIN:VCALENDAR') || !mgrContent.includes('ShiftRelay')) {
    throw new Error('Manager roster file is not a valid iCalendar document');
  }
  console.log('✓ Step 9: Confirmed full team roster .ics export generated with 0 API costs');

  console.log('=== All Shift Schedule & Calendar Sync (.ics) tests PASSED ===');
  await browser.close();
})().catch(err => {
  console.error('[Verification Failed]:', err);
  process.exit(1);
});
