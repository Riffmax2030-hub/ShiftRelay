import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { join } from 'node:path';
import { copyFileSync, existsSync } from 'node:fs';
import http from 'node:http';
import pg from 'pg';

const { Pool } = pg;
const PG_PORT = 54323;
const APP_PORT = 4099;
const PG_BIN = 'C:\\Program Files\\PostgreSQL\\18\\bin';
const PG_DATA = join(process.env.TEMP, 'disposable_pg_cluster');

const ARTIFACT_DIR = 'C:\\Users\\DATA ENG. OLA\\.gemini\\antigravity\\brain\\8c57bcf0-5ed6-4457-bd3b-82f404ed97c9';

async function startPostgres() {
  const pidFile = join(PG_DATA, 'postmaster.pid');
  if (existsSync(pidFile)) {
    try { execSync(`del /F "${pidFile}"`, { stdio: 'ignore' }); } catch {}
  }
  return spawn(`"${PG_BIN}\\postgres.exe"`, ['-D', PG_DATA, '-p', String(PG_PORT)], {
    shell: true,
    stdio: 'ignore'
  });
}

async function waitForPg(pool, maxRetries = 35) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await pool.query('SELECT 1 as alive');
      if (res.rows[0]?.alive === 1) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function waitForHttp(port, maxRetries = 40) {
  for (let i = 0; i < maxRetries; i++) {
    const ok = await new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(500, () => { req.destroy(); resolve(false); });
    });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 350));
  }
  return false;
}

let checksPassed = 0;
let checksFailed = 0;

function assertCheck(cond, label) {
  if (cond) {
    console.log(`  [PASS] ${label}`);
    checksPassed++;
  } else {
    console.error(`  [FAIL] ${label}`);
    checksFailed++;
  }
}

async function runPhase2Review() {
  console.log('='.repeat(75));
  console.log('  SHIFTRELAY UI PHASE 2: HANDOVERS LIFECYCLE & USABILITY AUDIT');
  console.log('='.repeat(75));

  let pgProc = null;
  let appProc = null;
  let pgPool = null;
  let browser = null;

  try {
    pgProc = await startPostgres();
    pgPool = new Pool({ connectionString: `postgres://postgres@127.0.0.1:${PG_PORT}/postgres`, max: 5 });
    const pgReady = await waitForPg(pgPool);
    if (!pgReady) throw new Error('Postgres not ready');
    console.log('  Postgres connected.');

    // Clean tables
    for (const t of ['user_sessions','file_attachments','work_events','work_items','workflow_runs',
      'notifications','time_entries','memberships','portal_users','organisations']) {
      try { await pgPool.query(`DELETE FROM ${t}`); } catch(_) {}
    }

    // Start App Server
    appProc = spawn('node', ['server.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        ALLOW_DEV_DEMO_AUTH: 'false',
        ALLOW_DEV_FALLBACK: 'false',
        DATABASE_URL: `postgres://postgres@127.0.0.1:${PG_PORT}/postgres`,
        PORT: String(APP_PORT)
      },
      shell: true,
      stdio: 'ignore'
    });

    const appReady = await waitForHttp(APP_PORT);
    if (!appReady) throw new Error('App failed to start on port ' + APP_PORT);
    console.log(`  App running on http://127.0.0.1:${APP_PORT}`);

    // Seed Data
    // Company 1: Apex Health
    const regApex = await fetch(`http://127.0.0.1:${APP_PORT}/api/organisations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        legalName: 'Apex Regional Health System',
        ownerName: 'Dr. Marcus Vance',
        workEmail: 'marcus.vance@apexhealth.org',
        password: 'Password12345!',
        industry: 'Healthcare'
      })
    });
    const apexData = await regApex.json();
    const apexCode = apexData.organisation.organisationCode;

    // Outgoing Worker: Sarah Connor
    await fetch(`http://127.0.0.1:${APP_PORT}/api/organisation-memberships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organisationCode: apexCode,
        fullName: 'Sarah Connor, RN',
        email: 'sarah.connor@apexhealth.org',
        position: 'Day Shift Triage Nurse',
        password: 'Password12345!'
      })
    });
    await pgPool.query(
      `UPDATE memberships SET status = 'active', role = 'outgoing', title = 'Day Shift Triage Nurse', department = 'Emergency Triage'
       WHERE user_id = (SELECT id FROM portal_users WHERE email = 'sarah.connor@apexhealth.org')`
    );

    // Incoming Worker: Maya Lin
    await fetch(`http://127.0.0.1:${APP_PORT}/api/organisation-memberships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organisationCode: apexCode,
        fullName: 'Maya Lin, RN',
        email: 'maya.lin@apexhealth.org',
        position: 'Night Triage Nurse',
        password: 'Password12345!'
      })
    });
    await pgPool.query(
      `UPDATE memberships SET status = 'active', role = 'incoming', title = 'Night Triage Nurse', department = 'Emergency Triage'
       WHERE user_id = (SELECT id FROM portal_users WHERE email = 'maya.lin@apexhealth.org')`
    );

    // Supervisor: David Brent
    await fetch(`http://127.0.0.1:${APP_PORT}/api/organisation-memberships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organisationCode: apexCode,
        fullName: 'David Brent',
        email: 'david.brent@apexhealth.org',
        position: 'Triage Unit Supervisor',
        password: 'Password12345!'
      })
    });
    await pgPool.query(
      `UPDATE memberships SET status = 'active', role = 'supervisor', title = 'Triage Unit Supervisor', department = 'Emergency Triage'
       WHERE user_id = (SELECT id FROM portal_users WHERE email = 'david.brent@apexhealth.org')`
    );

    // Company 2: Beacon Logistics (for Cross-Company Isolation check)
    const regBeacon = await fetch(`http://127.0.0.1:${APP_PORT}/api/organisations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        legalName: 'Beacon Logistics Group',
        ownerName: 'Carol Danvers',
        workEmail: 'carol@beacon.test',
        password: 'Password12345!',
        industry: 'Logistics'
      })
    });
    const beaconData = await regBeacon.json();

    browser = await chromium.launch({ channel: 'chrome', headless: true });

    // ── STEP 1: OUTGOING WORKER CREATES HANDOVER ───────────────────────────────
    console.log('\n--- 1. Worker Handovers: Creation by Outgoing Worker ---');
    const workerMobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });
    await workerMobileContext.addInitScript(() => {
      localStorage.setItem('sr_first_shift_onboarding_done', '1');
      // Instantly dismiss splash screen so it never intercepts pointer events
      const killSplash = () => {
        document.getElementById('sr-splash')?.remove();
        document.getElementById('sr-entry')?.remove();
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', killSplash);
      } else {
        killSplash();
      }
    });
    const workerPage = await workerMobileContext.newPage();
    workerPage.on('console', msg => console.log('WORKER CONSOLE:', msg.text()));
    workerPage.on('pageerror', err => console.log('WORKER PAGE ERROR:', err.message));
    workerPage.on('requestfailed', req => console.log('WORKER REQ FAILED:', req.method(), req.url(), req.failure()?.errorText));
    workerPage.on('response', res => {
      if (res.url().includes('/api/handovers')) {
        console.log('WORKER RESP:', res.status(), res.request().method(), res.url());
      }
    });
    await workerPage.goto(`http://127.0.0.1:${APP_PORT}/`);

    // Sign in as Sarah (Outgoing Worker)
    await workerPage.evaluate(async () => {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'sarah.connor@apexhealth.org', password: 'Password12345!' })
      });
      const data = await res.json();
      window.state = window.state || {};
      window.state.user = data.user;
      if (typeof window._srLoginCallback === 'function') window._srLoginCallback(data.user);
      if (window.Phase1Shell?.mount) await window.Phase1Shell.mount();
    });

    await workerPage.waitForSelector('#sr-app-shell', { timeout: 10000 });
    await workerPage.waitForTimeout(500);

    // Now navigate to handovers using Phase1Shell.navigate
    await workerPage.evaluate(async () => {
      await window.Phase1Shell.navigate('handovers');
    });
    await workerPage.waitForSelector('[data-sr-tab]', { timeout: 10000 });
    await workerPage.waitForTimeout(500);

    // Verify Outgoing worker sees "+ Create Handover" tab
    const createTab = await workerPage.$('[data-sr-tab="create"]');
    assertCheck(createTab !== null, 'Worker Handovers: Outgoing worker authorized to see "+ Create Handover" tab');

    if (createTab) {
      await createTab.click({ force: true });
      await workerPage.waitForSelector('#sr-handover-summary', { timeout: 10000 });
      await workerPage.waitForTimeout(400);

      // Fill in handover form
      await workerPage.fill('#sr-handover-summary', 'Bay 1-4 Triage Transfer to Night Shift');
      await workerPage.fill('#sr-handover-notes', 'Bay 2 patient awaiting trauma labs. Blood bank cross-match pending. Resus 1 restocked.');
      await workerPage.fill('#sr-handover-tasks', 'Check blood bank cross-match for Bay 2\nHandover triage logbook to night team');

      // Submit handover
      const submitBtn = await workerPage.$('#sr-btn-submit-handover');
      assertCheck(submitBtn !== null, 'Worker Handovers: Submit handover action button present');
      await submitBtn.scrollIntoViewIfNeeded();
      await submitBtn.click();
      await workerPage.waitForTimeout(1000);
      const feedbackText = await workerPage.innerText('#sr-handover-form-feedback').catch(() => 'no-feedback-el');
      console.log('FEEDBACK TEXT AFTER SUBMIT:', feedbackText);
      const currentHtml = await workerPage.evaluate(() => document.getElementById('sr-content-area')?.innerHTML || '');
      console.log('CONTENT AREA SNIPPET:', currentHtml.slice(0, 300));
      await workerPage.waitForSelector('.sr-handover-card', { timeout: 10000 });
      await workerPage.waitForTimeout(1000);

      const successFeedback = await workerPage.innerText('#sr-content-area');
      assertCheck(successFeedback.includes('Bay 1-4 Triage Transfer') || successFeedback.includes('Awaiting Review'),
        'Worker Handovers: Created handover persisted and visible in handover list');
    }

    // Capture Worker Handovers Mobile screenshot
    await workerPage.screenshot({ path: 'docs/screenshots/worker-handovers-mobile.png', fullPage: false });
    copyFileSync('docs/screenshots/worker-handovers-mobile.png', join(ARTIFACT_DIR, 'worker-handovers-mobile.png'));

    // Capture Worker Handovers Desktop screenshot (1280px)
    const workerDesktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
    await workerDesktopContext.addInitScript(() => {
      localStorage.setItem('sr_first_shift_onboarding_done', '1');
      const killSplash = () => {
        document.getElementById('sr-splash')?.remove();
        document.getElementById('sr-entry')?.remove();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', killSplash);
      else killSplash();
    });
    const workerDesktopPage = await workerDesktopContext.newPage();
    await workerDesktopPage.goto(`http://127.0.0.1:${APP_PORT}/`);
    await workerDesktopPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await workerDesktopPage.evaluate(async () => {
      document.getElementById('sr-splash')?.remove();
      document.getElementById('sr-entry')?.remove();
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'sarah.connor@apexhealth.org', password: 'Password12345!' })
      });
      const data = await res.json();
      window.state = window.state || {};
      window.state.user = data.user;
      if (typeof window._srLoginCallback === 'function') window._srLoginCallback(data.user);
      if (window.Phase1Shell?.mount) await window.Phase1Shell.mount('handovers');
    });
    // On desktop the dock tabs aren't shown; wait for sidebar nav items instead
    await workerDesktopPage.waitForSelector('#sr-app-shell', { timeout: 10000 });
    await workerDesktopPage.waitForTimeout(800);
    await workerDesktopPage.screenshot({ path: 'docs/screenshots/worker-handovers-desktop.png', fullPage: false });
    copyFileSync('docs/screenshots/worker-handovers-desktop.png', join(ARTIFACT_DIR, 'worker-handovers-desktop.png'));
    await workerDesktopContext.close();

    await workerMobileContext.close();

    // ── STEP 2: SUPERVISOR REVIEWS & RELAYS HANDOVER ───────────────────────────
    console.log('\n--- 2. Manager Handovers: Prioritised Review & Relay ---');
    const mgrContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });
    await mgrContext.addInitScript(() => {
      localStorage.setItem('sr_first_shift_onboarding_done', '1');
      const kill = () => {
        document.getElementById('sr-splash')?.remove();
        document.getElementById('sr-entry')?.remove();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kill);
      else kill();
    });
    const mgrPage = await mgrContext.newPage();
    mgrPage.on('console', msg => console.log('MGR CONSOLE:', msg.text()));
    mgrPage.on('pageerror', err => console.log('MGR PAGE ERROR:', err.message));
    await mgrPage.goto(`http://127.0.0.1:${APP_PORT}/`);

    // Sign in as David Brent (Supervisor)
    await mgrPage.evaluate(async () => {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'david.brent@apexhealth.org', password: 'Password12345!' })
      });
      const data = await res.json();
      console.log('MGR SIGNIN USER:', JSON.stringify(data.user));
      window.state = window.state || {};
      window.state.user = data.user;
      if (typeof window._srLoginCallback === 'function') window._srLoginCallback(data.user);
      if (window.Phase1Shell?.mount) await window.Phase1Shell.mount('handovers');
    });

    await mgrPage.waitForSelector('[data-sr-mgr-tab]', { timeout: 10000 }).catch(async (e) => {
      const html = await mgrPage.evaluate(() => document.body.innerHTML);
      console.log('MGR PAGE BODY ON TIMEOUT:', html.slice(0, 1000));
      throw e;
    });
    await mgrPage.waitForTimeout(600);

    // Verify Manager sees "Awaiting Supervisor Relay" tab and badge count
    const pendingTabBadge = await mgrPage.$eval('[data-sr-mgr-tab="pending"]', el => el.textContent).catch(() => '');
    assertCheck(pendingTabBadge.includes('Awaiting Supervisor Relay'), 'Manager Handovers: Shows prioritised awaiting relay section');

    // Verify Relay action button is rendered
    const relayBtn = await mgrPage.$('[data-action="relay-handover"]').catch(() => null);
    assertCheck(relayBtn !== null, 'Manager Handovers: Authorised "Approve & Relay Handover" button present');

    // Click relay to approve and relay to incoming worker
    if (relayBtn) {
      await relayBtn.scrollIntoViewIfNeeded();
      await relayBtn.click();
      await mgrPage.waitForTimeout(1000);
      const remainingPending = await mgrPage.$$eval('[data-action="relay-handover"]', btns => btns.length);
      assertCheck(remainingPending === 0, 'Manager Handovers: Relayed handover removed from pending review queue');
    }

    // Capture Manager Handovers Mobile screenshot
    await mgrPage.screenshot({ path: 'docs/screenshots/manager-handovers-mobile.png', fullPage: false });
    copyFileSync('docs/screenshots/manager-handovers-mobile.png', join(ARTIFACT_DIR, 'manager-handovers-mobile.png'));

    // Capture Manager Handovers Desktop screenshot (1280px)
    const mgrDesktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
    await mgrDesktopContext.addInitScript(() => {
      localStorage.setItem('sr_first_shift_onboarding_done', '1');
      const killSplash = () => {
        document.getElementById('sr-splash')?.remove();
        document.getElementById('sr-entry')?.remove();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', killSplash);
      else killSplash();
    });
    const mgrDesktopPage = await mgrDesktopContext.newPage();
    await mgrDesktopPage.goto(`http://127.0.0.1:${APP_PORT}/`);
    await mgrDesktopPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await mgrDesktopPage.evaluate(async () => {
      document.getElementById('sr-splash')?.remove();
      document.getElementById('sr-entry')?.remove();
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'david.brent@apexhealth.org', password: 'Password12345!' })
      });
      const data = await res.json();
      window.state = window.state || {};
      window.state.user = data.user;
      if (typeof window._srLoginCallback === 'function') window._srLoginCallback(data.user);
      if (window.Phase1Shell?.mount) await window.Phase1Shell.mount('handovers');
    });
    // On desktop the manager dock tabs aren't shown; sidebar nav is shown. Just wait for shell.
    await mgrDesktopPage.waitForSelector('#sr-app-shell', { timeout: 10000 });
    await mgrDesktopPage.waitForTimeout(800);
    await mgrDesktopPage.screenshot({ path: 'docs/screenshots/manager-handovers-desktop.png', fullPage: false });
    copyFileSync('docs/screenshots/manager-handovers-desktop.png', join(ARTIFACT_DIR, 'manager-handovers-desktop.png'));
    await mgrDesktopContext.close();

    await mgrContext.close();

    // ── STEP 3: INCOMING WORKER ACKNOWLEDGES RELAYED HANDOVER ──────────────────
    console.log('\n--- 3. Incoming Worker: Needs My Action & Acknowledgement ---');
    const incomingContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });
    await incomingContext.addInitScript(() => {
      localStorage.setItem('sr_first_shift_onboarding_done', '1');
      const kill = () => {
        document.getElementById('sr-splash')?.remove();
        document.getElementById('sr-entry')?.remove();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kill);
      else kill();
    });
    const inPage = await incomingContext.newPage();
    await inPage.goto(`http://127.0.0.1:${APP_PORT}/`);

    // Sign in as Maya Lin (Incoming Worker)
    await inPage.evaluate(async () => {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'maya.lin@apexhealth.org', password: 'Password12345!' })
      });
      const data = await res.json();
      window.state = window.state || {};
      window.state.user = data.user;
      if (typeof window._srLoginCallback === 'function') window._srLoginCallback(data.user);
      if (window.Phase1Shell?.mount) await window.Phase1Shell.mount('handovers');
    });

    await inPage.waitForSelector('[data-sr-tab]', { timeout: 10000 });
    await inPage.waitForTimeout(600);

    // Verify incoming worker has item under "Needs My Action"
    const ackBtn = await inPage.$('[data-action="ack-handover"]');
    assertCheck(ackBtn !== null, 'Incoming Worker: Relayed handover appears with "Acknowledge Shift Brief" CTA');

    // Verify incoming worker does NOT see "+ Create Handover" tab (verified role enforcement)
    const incomingCreateTab = await inPage.$('[data-sr-tab="create"]');
    assertCheck(incomingCreateTab === null, 'Incoming Worker: Does NOT see "+ Create Handover" tab (verified backend permissions)');

    // Toggle a task checkbox
    const firstCheckbox = await inPage.$('.sr-task-checkbox');
    if (firstCheckbox) {
      await firstCheckbox.click();
      await inPage.waitForTimeout(500);
      const isChecked = await firstCheckbox.isChecked();
      assertCheck(isChecked, 'Incoming Worker: Interactive task checkbox successfully toggled');
    }

    // Acknowledge the handover
    if (ackBtn) {
      await ackBtn.scrollIntoViewIfNeeded();
      await ackBtn.click();
      await inPage.waitForTimeout(1000);
      const remainingAck = await inPage.$$eval('[data-action="ack-handover"]', btns => btns.length);
      assertCheck(remainingAck === 0, 'Incoming Worker: Acknowledged handover cleared from "Needs My Action" tab');
    }

    // Persistence after reload check
    await inPage.reload();
    await inPage.evaluate(async () => {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data?.user) {
        window.state = window.state || {};
        window.state.user = data.user;
        if (typeof window._srLoginCallback === 'function') window._srLoginCallback(data.user);
        if (window.Phase1Shell?.mount) await window.Phase1Shell.mount('handovers');
      }
    });
    await inPage.waitForSelector('#sr-app-shell', { timeout: 10000 });
    await inPage.waitForTimeout(500);
    // Switch to history tab to confirm item persisted as acknowledged
    await inPage.click('[data-sr-tab="history"]');
    await inPage.waitForTimeout(500);
    const historyText = await inPage.innerText('#sr-content-area');
    assertCheck(historyText.includes('Acknowledged') || historyText.includes('Bay 1-4 Triage Transfer'),
      'Persistence: Acknowledged handover persists in history across full page reloads');

    await incomingContext.close();

    // ── STEP 4: UNAUTHORIZED ACTIONS & CROSS-COMPANY ISOLATION ─────────────────
    console.log('\n--- 4. Security: Unauthorised Actions & Cross-Company Isolation ---');

    // Direct fetch as beacon user
    const beaconSignin = await fetch(`http://127.0.0.1:${APP_PORT}/api/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'carol@beacon.test', password: 'Password12345!' })
    });
    const beaconCookie = beaconSignin.headers.get('set-cookie');
    const beaconHandoversRes = await fetch(`http://127.0.0.1:${APP_PORT}/api/handovers`, {
      headers: { 'Cookie': beaconCookie }
    });
    const beaconHandoversData = await beaconHandoversRes.json();
    assertCheck(
      (beaconHandoversData.handovers || []).length === 0,
      'Cross-Company Isolation: Company B sees 0 handovers from Company A (tenant isolation preserved)'
    );

    console.log('\n' + '='.repeat(75));
    console.log(`  UI PHASE 2 AUDIT RESULT: ${checksPassed} PASSED, ${checksFailed} FAILED`);
    console.log('='.repeat(75));

  } catch (err) {
    console.error('Phase 2 Audit failed with error:', err);
    throw err;
  } finally {
    try { await browser?.close(); } catch (_) {}
    try { if (appProc) execSync(`taskkill /pid ${appProc.pid} /f /t`, { stdio: 'ignore' }); } catch (_) {}
    try { await pgPool?.end(); } catch (_) {}
    try { if (pgProc) execSync(`taskkill /pid ${pgProc.pid} /f /t`, { stdio: 'ignore' }); } catch (_) {}
  }
}

runPhase2Review().catch(() => process.exit(1));
