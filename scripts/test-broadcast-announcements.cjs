const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('--- Starting Verification of Supervisor Shift Broadcast Announcements ---');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await ctx.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[Browser Error]:', msg.text());
  });

  const artifactDir = path.resolve('C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/8c57bcf0-5ed6-4457-bd3b-82f404ed97c9');

  await page.goto('http://localhost:4000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 1. Sign in as Organisation Owner (Jordan Lee)
  await page.click('#entry-btn-signin');
  await page.waitForTimeout(400);
  await page.click('[data-tab="demo"]');
  await page.waitForTimeout(400);

  const ownerBtn = await page.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000014"]');
  if (!ownerBtn) throw new Error('Owner login button not found');
  await ownerBtn.click();
  await page.waitForSelector('#sr-app-shell', { timeout: 10000 });
  await page.waitForTimeout(600);
  console.log('✓ Step 1: Signed in as Organisation Owner (Jordan Lee)');

  // 2. Navigate to Manager Overview
  await page.evaluate(() => window.Phase1Shell.navigate('overview'));
  await page.waitForTimeout(800);

  // Verify "Broadcast Notice" button exists
  const broadcastBtn = await page.$('#sr-btn-open-broadcast');
  if (!broadcastBtn) throw new Error('Broadcast Notice button not found on Manager Overview');
  console.log('✓ Step 2: Confirmed "Broadcast Notice" action button on overview header');

  // 3. Click "Broadcast Notice" to open composer modal
  await broadcastBtn.click();
  await page.waitForSelector('#sr-broadcast-backdrop', { timeout: 3000 });
  await page.waitForTimeout(400);
  console.log('✓ Step 3: Broadcast composer modal opened');

  await page.screenshot({ path: path.join(artifactDir, 'feature-broadcast-modal.png') });

  // 4. Fill in Critical Safety Announcement
  await page.fill('#sr-broadcast-input-title', 'Emergency Cold Chain Protocol Active');
  await page.fill('#sr-broadcast-input-msg', 'Temperature anomaly detected in Bay 2 medical cold storage. All active shift personnel must verify telemetry and manually record temperature logs immediately.');

  // Submit announcement
  await page.click('#sr-broadcast-submit-btn');
  await page.waitForTimeout(1000);

  // 5. Verify announcement appears in Manager Overview list
  const overviewText = await page.evaluate(() => document.getElementById('sr-content-area')?.textContent || '');
  if (!overviewText.includes('Emergency Cold Chain Protocol Active')) {
    throw new Error('Broadcast announcement not listed in Manager Overview after publication');
  }
  console.log('✓ Step 4: Published announcement successfully listed under Active Shift Broadcasts');

  await page.screenshot({ path: path.join(artifactDir, 'feature-broadcast-manager-overview.png'), fullPage: true });

  // 6. Sign out and sign in as Frontline Worker (Amina Otieno)
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

  const workerBtn = await page.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000011"]');
  if (!workerBtn) throw new Error('Worker login button not found');
  await workerBtn.click();
  await page.waitForSelector('#sr-app-shell', { timeout: 10000 });
  await page.waitForTimeout(800);
  console.log('✓ Step 5: Signed in as Frontline Worker (Amina Otieno)');

  // 7. Verify Pinned Red Alert Banner is present at top of Worker dashboard
  const banner = await page.$('.sr-broadcast-banner.severity-critical');
  if (!banner) throw new Error('Pinned critical broadcast banner not displayed for worker');
  const bannerText = await page.evaluate(() => document.querySelector('.sr-broadcast-banner')?.textContent || '');
  console.log('Worker banner headline:', bannerText.slice(0, 150).replace(/\s+/g, ' '));
  if (!bannerText.includes('Emergency Cold Chain Protocol Active')) {
    throw new Error('Banner does not contain the expected broadcast headline');
  }
  console.log('✓ Step 6: Pinned critical safety banner successfully rendered on worker dashboard');

  await page.screenshot({ path: path.join(artifactDir, 'feature-broadcast-worker-banner.png') });

  // 8. Worker acknowledges the announcement
  const ackBtn = await page.$('.sr-btn-ack-broadcast');
  if (!ackBtn) throw new Error('Acknowledge button not found on broadcast banner');
  await ackBtn.click();
  await page.waitForTimeout(1000);
  console.log('✓ Step 7: Worker clicked "Acknowledge Notice" and recorded signature');

  // 9. Sign back in as Jordan Lee (Owner) to verify real-time acknowledgement audit trail
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

  const ownerBtn2 = await page.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000014"]');
  await ownerBtn2.click();
  await page.waitForSelector('#sr-app-shell', { timeout: 10000 });
  await page.waitForTimeout(600);

  await page.evaluate(() => window.Phase1Shell.navigate('overview'));
  await page.waitForTimeout(800);

  const updatedOverview = await page.evaluate(() => document.getElementById('sr-content-area')?.textContent || '');
  console.log('Manager overview audit excerpt:', updatedOverview.slice(updatedOverview.indexOf('Staff Acknowledged'), updatedOverview.indexOf('Staff Acknowledged') + 60));
  if (!updatedOverview.includes('Amina Otieno')) {
    throw new Error('Amina Otieno is not listed in the broadcast acknowledgements list');
  }
  console.log('✓ Step 8: Confirmed Amina Otieno listed in live acknowledgement audit trail');

  await page.screenshot({ path: path.join(artifactDir, 'feature-broadcast-audit-acknowledged.png'), fullPage: true });

  console.log('=== All Supervisor Shift Broadcast Announcement tests PASSED ===');
  await browser.close();
})().catch(err => {
  console.error('[Verification Failed]:', err);
  process.exit(1);
});
