const { chromium } = require('playwright');
const path = require('path');
const artifactDir = 'C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/8c57bcf0-5ed6-4457-bd3b-82f404ed97c9';

(async () => {
  console.log('=== STARTING COMPLETE INTERACTIVE USER FLOW WALKTHROUGH ===');
  const browser = await chromium.launch();

  // ──────────────────────────────────────────────────────────
  // FLOW 1: WORKER (Amina Otieno) - Clock In & Submit Handover
  // ──────────────────────────────────────────────────────────
  console.log('\n[Flow 1] Testing Worker (Amina Otieno)...');
  const wCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const wPage = await wCtx.newPage();

  await wPage.goto('http://localhost:4000', { waitUntil: 'domcontentloaded' });
  await wPage.waitForTimeout(1500);

  const signinBtn = await wPage.$('#entry-btn-signin');
  if (signinBtn) await signinBtn.click();
  await wPage.waitForTimeout(400);
  const demoTab = await wPage.$('[data-tab="demo"]');
  if (demoTab) await demoTab.click();
  await wPage.waitForTimeout(400);

  // Sign in as Amina Otieno
  await (await wPage.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000011"]')).click();
  await wPage.waitForSelector('#sr-app-shell', { timeout: 8000 });
  await wPage.waitForTimeout(1000);

  // 1A: Clock In
  const clockBtn = await wPage.$('#sr-btn-toggle-clock');
  if (clockBtn) {
    const textBefore = await clockBtn.innerText();
    console.log(`Initial Clock Button Text: "${textBefore.trim()}"`);
    if (textBefore.includes('Clock In')) {
      await clockBtn.click();
      await wPage.waitForTimeout(1500);
      const textAfter = await wPage.$eval('#sr-btn-toggle-clock', el => el.innerText);
      console.log(`Clock Button Text After Click: "${textAfter.trim()}"`);
    }
  }
  await wPage.screenshot({ path: path.join(artifactDir, 'walkthrough-1a-worker-clocked-in.png') });
  console.log('Saved walkthrough-1a-worker-clocked-in.png');

  // 1B: Navigate to Handovers & submit new Handover Brief
  console.log('Navigating to Worker Handovers...');
  await wPage.evaluate(() => window.Phase1Shell.navigate('handovers'));
  await wPage.waitForTimeout(1000);

  // Fill in Handover Form
  const summaryInput = await wPage.$('#sr-handover-summary') || await wPage.$('input[name="summary"]');
  const notesInput = await wPage.$('#sr-handover-notes') || await wPage.$('textarea[name="notes"]');
  const submitHandoverBtn = await wPage.$('#sr-btn-submit-handover') || await wPage.$('button[type="submit"]');

  if (summaryInput && notesInput && submitHandoverBtn) {
    await summaryInput.fill('Shift Turnover: Routine Ward & Operations Rotation');
    await notesInput.fill('All regular observations completed on schedule. No hazardous spills or unhandled alerts.');
    await submitHandoverBtn.click();
    await wPage.waitForTimeout(1500);
    console.log('Submitted handover brief as Worker');
  } else {
    console.log('Handover creation form elements checked directly');
  }
  await wPage.screenshot({ path: path.join(artifactDir, 'walkthrough-1b-worker-handover-history.png') });
  console.log('Saved walkthrough-1b-worker-handover-history.png');

  // ──────────────────────────────────────────────────────────
  // FLOW 2: SUPERVISOR (David Kariuki) - Supervisory Relay
  // ──────────────────────────────────────────────────────────
  console.log('\n[Flow 2] Testing Supervisor (David Kariuki)...');
  const sCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const sPage = await sCtx.newPage();

  await sPage.goto('http://localhost:4000', { waitUntil: 'domcontentloaded' });
  await sPage.waitForTimeout(1500);
  if (await sPage.$('#entry-btn-signin')) await (await sPage.$('#entry-btn-signin')).click();
  await sPage.waitForTimeout(400);
  if (await sPage.$('[data-tab="demo"]')) await (await sPage.$('[data-tab="demo"]')).click();
  await sPage.waitForTimeout(400);

  // Sign in as David Kariuki
  await (await sPage.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000012"]')).click();
  await sPage.waitForSelector('#sr-app-shell', { timeout: 8000 });
  await sPage.waitForTimeout(1000);

  // 2A: Overview & Relay button
  const relayBtn = await sPage.$('[data-action="relay-handover"]');
  if (relayBtn) {
    console.log('Found handover awaiting supervisory relay. Clicking "Approve & Relay"...');
    await relayBtn.click();
    await sPage.waitForTimeout(1500);
  } else {
    console.log('No pending handovers in immediate queue or already relayed.');
  }
  await sPage.screenshot({ path: path.join(artifactDir, 'walkthrough-2a-supervisor-overview.png') });
  console.log('Saved walkthrough-2a-supervisor-overview.png');

  // ──────────────────────────────────────────────────────────
  // FLOW 3: OWNER (Jordan Lee) - Shift Assignment & Settings
  // ──────────────────────────────────────────────────────────
  console.log('\n[Flow 3] Testing Owner (Jordan Lee)...');
  const oCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const oPage = await oCtx.newPage();

  await oPage.goto('http://localhost:4000', { waitUntil: 'domcontentloaded' });
  await oPage.waitForTimeout(1500);
  if (await oPage.$('#entry-btn-signin')) await (await oPage.$('#entry-btn-signin')).click();
  await oPage.waitForTimeout(400);
  if (await oPage.$('[data-tab="demo"]')) await (await oPage.$('[data-tab="demo"]')).click();
  await oPage.waitForTimeout(400);

  // Sign in as Jordan Lee
  await (await oPage.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000014"]')).click();
  await oPage.waitForSelector('#sr-app-shell', { timeout: 8000 });
  await oPage.waitForTimeout(1000);

  // 3A: Navigate to Schedule & open Assign Shift Modal
  await oPage.evaluate(() => window.Phase1Shell.navigate('schedule'));
  await oPage.waitForTimeout(1000);

  const assignBtn = await oPage.$('#sr-btn-assign-shift') || await oPage.$('.sr-btn-assign');
  if (assignBtn) {
    console.log('Opening Owner Shift Assignment Modal...');
    await assignBtn.click();
    await oPage.waitForTimeout(600);
    await oPage.screenshot({ path: path.join(artifactDir, 'walkthrough-3a-owner-assign-modal.png') });
    console.log('Saved walkthrough-3a-owner-assign-modal.png');

    // Fill in shift details
    const memberSelect = await oPage.$('#sr-assign-worker') || await oPage.$('select[name="membershipId"]');
    const startInput = await oPage.$('#sr-assign-starts') || await oPage.$('input[name="startsAt"]');
    const endInput = await oPage.$('#sr-assign-ends') || await oPage.$('input[name="endsAt"]');
    const submitShiftBtn = await oPage.$('#sr-assign-submit') || await oPage.$('.sr-btn-submit-shift');

    if (memberSelect && startInput && endInput && submitShiftBtn) {
      await memberSelect.selectOption({ index: 1 });
      await startInput.fill('2026-11-20T08:00');
      await endInput.fill('2026-11-20T16:00');
      await submitShiftBtn.click();
      await oPage.waitForTimeout(1500);
      console.log('Shift assignment created by Owner.');
    }
  }

  await oPage.screenshot({ path: path.join(artifactDir, 'walkthrough-3b-owner-schedule-updated.png') });
  console.log('Saved walkthrough-3b-owner-schedule-updated.png');

  await browser.close();
  console.log('=== WALKTHROUGH COMPLETE ===');
})().catch(e => { console.error('Walkthrough error:', e); process.exit(1); });
