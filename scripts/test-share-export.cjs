const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('--- Starting Verification of Zero-Cost Share, Export & Offline Sync ---');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true
  });
  const page = await ctx.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[Browser Error]:', msg.text());
  });

  const artifactDir = path.resolve('C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/8c57bcf0-5ed6-4457-bd3b-82f404ed97c9');

  await page.goto('http://localhost:4000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 1. Sign in as Jordan Lee (Owner) to view Handovers with full oversight
  await page.click('#entry-btn-signin');
  await page.waitForTimeout(400);
  await page.click('[data-tab="demo"]');
  await page.waitForTimeout(400);

  const ownerBtn = await page.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000014"]');
  if (!ownerBtn) throw new Error('Owner login button not found');
  await ownerBtn.click();
  await page.waitForSelector('#sr-app-shell', { timeout: 10000 });
  await page.waitForTimeout(600);
  console.log('✓ Step 1: Signed in as Organisation Owner');

  // Seed a sample handover if none exists so we have rich content to share & export
  await page.evaluate(async () => {
    await fetch('/api/handovers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notes: 'Critical refrigeration temperature held at 3.8C. All 4 ICU bay telemetry monitors checked. Zero adverse incidents during 12h cycle.',
        assignedTo: '00000000-0000-4000-8000-000000000011',
        shiftStatus: 'green',
        handover: {
          summary: 'Intensive Care Unit Night Shift Brief & Handover Dossier',
          actions: [
            { title: 'Re-calibrate telemetry unit 3 at 08:00', priority: 'high', owner: 'Amina Otieno', due: '08:00' },
            { title: 'Verify pharmacy narcotic reconciliation logs', priority: 'medium', owner: 'Jordan Lee', due: '09:30' },
            { title: 'Inspect sterile storage temperature sensors', priority: 'low', owner: 'Staff', due: '11:00' }
          ],
          missing_context: []
        }
      })
    });
  });
  await page.waitForTimeout(400);

  // 2. Navigate to Handovers view
  await page.evaluate(() => window.Phase1Shell.navigate('handovers'));
  await page.waitForTimeout(800);

  // Check if "Export All" button is present in the header
  const exportAllBtn = await page.$('#sr-btn-export-all-mgr, #sr-btn-export-all-worker');
  console.log('Export All button present:', !!exportAllBtn);
  if (!exportAllBtn) throw new Error('Export All button not found in handovers view');

  // Take screenshot of Handovers view with Export All button and Share buttons
  await page.screenshot({ path: path.join(artifactDir, 'feature-share-handovers-list.png'), fullPage: true });
  console.log('✓ Step 2: Handovers list captured with Export All and Share actions');

  // 3. Find and click the Share button on the first handover card
  const shareBtn = await page.$('.sr-btn-share-handover');
  if (!shareBtn) {
    // If completed tab has handovers, click completed tab
    console.log('Looking for handovers in completed tab...');
    await page.click('[data-sr-mgr-tab="completed"]');
    await page.waitForTimeout(600);
  }

  const shareBtnFound = await page.$('.sr-btn-share-handover');
  if (!shareBtnFound) throw new Error('No handover card with Share button found');

  await shareBtnFound.click();
  await page.waitForTimeout(500);

  // Verify Share Hub Modal opens
  const shareModal = await page.$('#sr-share-modal-root');
  if (!shareModal) throw new Error('Share Hub Modal failed to open');
  console.log('✓ Step 3: Share Hub Modal opened successfully');

  // Verify all 5 channels are present in modal
  const bluetoothBtn = await page.$('#sr-share-btn-bluetooth');
  const emailBtn = await page.$('#sr-share-btn-email');
  const excelBtn = await page.$('#sr-share-btn-excel');
  const wordBtn = await page.$('#sr-share-btn-word');
  const printBtn = await page.$('#sr-share-btn-print');

  if (!bluetoothBtn || !emailBtn || !excelBtn || !wordBtn || !printBtn) {
    throw new Error('One or more of the 5 share channels is missing from the modal');
  }
  console.log('✓ Step 4: All 5 zero-cost channels (Bluetooth, Email, Excel, Word, Print) confirmed in UI');

  await page.screenshot({ path: path.join(artifactDir, 'feature-share-hub-modal.png') });

  // 4. Test Excel Export Download
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    excelBtn.click()
  ]);
  const downloadPath = await download.path();
  const downloadFilename = download.suggestedFilename();
  console.log(`✓ Step 5: Excel download intercepted: ${downloadFilename} (temp path: ${downloadPath})`);
  const fileContent = fs.readFileSync(downloadPath, 'utf-8');
  console.log('Downloaded Excel CSV preview:\n', fileContent.slice(0, 300));
  if (!fileContent.includes('ShiftRelay Official Shift Handover Report')) {
    throw new Error('Downloaded file does not contain expected ShiftRelay handover dossier content');
  }

  // 5. Close Share modal
  await page.click('#sr-share-close-btn');
  await page.waitForTimeout(300);

  // 6. Test Offline Sync & Conflict Resolution Modal
  const syncPill = await page.$('#sr-shell-sync');
  if (!syncPill) throw new Error('Sync pill in header not found');
  await syncPill.click();
  await page.waitForTimeout(500);

  const offlineModal = await page.$('#sr-offline-modal-root');
  if (!offlineModal) throw new Error('Offline Sync & Conflict Resolution modal failed to open');
  console.log('✓ Step 6: Offline Sync & Conflict Resolution modal opened successfully');

  await page.screenshot({ path: path.join(artifactDir, 'feature-offline-sync-modal.png') });

  // Close Offline modal
  await page.click('#sr-offline-close-btn');
  await page.waitForTimeout(300);

  console.log('=== All Share, Export & Offline Sync verifications PASSED ===');
  await browser.close();
})().catch(err => {
  console.error('[Verification Failed]:', err);
  process.exit(1);
});
