import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { join } from 'node:path';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import http from 'node:http';
import pg from 'pg';

const { Pool } = pg;
const PG_PORT = 54323;
const APP_PORT = 4098;
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

function assertCheck(cond, label, extra = '') {
  if (cond) {
    console.log(`  [PASS] ${label}`);
    checksPassed++;
  } else {
    console.error(`  [FAIL] ${label}${extra ? ' -> ' + extra : ''}`);
    checksFailed++;
  }
}

let reqCounter = 1;
async function makeJsonRequest(port, path, method = 'GET', body = null, cookie = '') {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      'x-forwarded-for': `10.8.${Math.floor(reqCounter / 250)}.${reqCounter % 250 + 1}`
    };
    reqCounter++;
    if (cookie) headers['Cookie'] = cookie;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: json || data });
      });
    });
    req.on('error', err => resolve({ status: 0, error: err.message }));
    if (payload) req.write(payload);
    req.end();
  });
}

async function runPhase4Review() {
  console.log('='.repeat(75));
  console.log('  SHIFTRELAY UI PHASE 4: NOTIFICATIONS & WORKER ME VERIFICATION AUDIT');
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
    for (const t of ['user_sessions','leave_requests','file_attachments','work_events','work_items','workflow_runs',
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
    if (!appReady) throw new Error('App server not ready');
    console.log(`  Production app server connected on port ${APP_PORT}.`);

    // ── Setup: Register Company A (Apex Health Systems) ──
    const regResA = await makeJsonRequest(APP_PORT, '/api/organisations', 'POST', {
      legalName: 'Apex Health Systems',
      industry: 'Healthcare',
      ownerName: 'Alice Chief',
      workEmail: 'alice@apex.test',
      password: 'Password12345!'
    });
    const orgCodeA = regResA.body?.organisation?.organisationCode;
    const orgIdA = regResA.body?.organisation?.organisationId;

    // Enrol Bob Specialist in Company A
    await makeJsonRequest(APP_PORT, '/api/organisation-memberships', 'POST', {
      organisationCode: orgCodeA,
      fullName: 'Bob Specialist',
      email: 'bob@apex.test',
      position: 'Trauma Specialist',
      password: 'Password12345!'
    });
    await pgPool.query(
      `UPDATE memberships SET status = 'active', role = 'incoming', title = 'Trauma Specialist', department = 'Trauma Unit'
       WHERE user_id = (SELECT id FROM portal_users WHERE email = 'bob@apex.test')`
    );
    const bobRow = (await pgPool.query("SELECT id, user_id FROM memberships WHERE user_id = (SELECT id FROM portal_users WHERE email = 'bob@apex.test')")).rows[0];
    const bobMembershipIdA = bobRow.id;
    const bobUserId = bobRow.user_id;

    // ── Setup: Register Company B (Metro Logistics) ──
    const regResB = await makeJsonRequest(APP_PORT, '/api/organisations', 'POST', {
      legalName: 'Metro Logistics Hub',
      industry: 'Logistics',
      ownerName: 'Brian Director',
      workEmail: 'brian@metro.test',
      password: 'Password12345!'
    });
    const orgIdB = regResB.body?.organisation?.organisationId;

    // Give Bob a second active membership in Company B (created earlier so Company A is active on login)
    const bobMembershipIdB = (await pgPool.query(
      `INSERT INTO memberships (id, user_id, organisation_id, role, title, department, status, created_at)
       VALUES (gen_random_uuid(), $1, $2, 'outgoing', 'Dispatcher', 'Operations', 'active', NOW() - interval '1 hour') RETURNING id`,
      [bobUserId, orgIdB]
    )).rows[0].id;

    // Ensure Bob's membership in Company A has the latest created_at so it is the active membership upon sign-in
    await pgPool.query(
      `UPDATE memberships SET status = 'active', role = 'incoming', title = 'Trauma Specialist', department = 'Trauma Unit', created_at = NOW()
       WHERE id = $1`,
      [bobMembershipIdA]
    );

    // Seed notifications for Bob in Company A: 2 unread, 1 read
    await pgPool.query(
      `INSERT INTO notifications (id, organisation_id, recipient_membership_id, message, read_at, created_at)
       VALUES
       (gen_random_uuid(), $1, $2, 'Safety checklist update required for Trauma Unit', NULL, NOW() - interval '5 minutes'),
       (gen_random_uuid(), $1, $2, 'Handover brief submitted for Shift A', NULL, NOW() - interval '15 minutes'),
       (gen_random_uuid(), $1, $2, 'Welcome to Apex Health Systems', NOW() - interval '1 hour', NOW() - interval '2 hours')`,
      [orgIdA, bobMembershipIdA]
    );

    // Seed notification for Bob in Company B: 1 unread
    await pgPool.query(
      `INSERT INTO notifications (id, organisation_id, recipient_membership_id, message, read_at, created_at)
       VALUES
       (gen_random_uuid(), $1, $2, 'Shift assignment confirmed at Metro Warehouse', NULL, NOW() - interval '10 minutes')`,
      [orgIdB, bobMembershipIdB]
    );

    // ── Launch Browser Audit ──
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    await context.addInitScript(() => {
      localStorage.setItem('sr_first_shift_onboarding_done', '1');
      const killSplash = () => {
        document.getElementById('sr-splash')?.remove();
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', killSplash);
      } else {
        killSplash();
      }
    });

    const page = await context.newPage();

    console.log('\n--- 1. Authentication & Session Setup ---');
    await page.goto(`http://127.0.0.1:${APP_PORT}`);
    await page.waitForSelector('#app-view', { state: 'attached' });

    // Authenticate as Bob Specialist via supported sign-in API and login callback
    const loginRes = await page.evaluate(async () => {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bob@apex.test', password: 'Password12345!' })
      });
      const data = await res.json();
      if (window._srLoginCallback) window._srLoginCallback(data.user);
      return data;
    });
    assertCheck(loginRes.user?.email === 'bob@apex.test', 'Authenticated as Bob Specialist via supported sign-in', loginRes.user?.name);

    await page.waitForSelector('#sr-app-shell', { timeout: 8000 });
    console.log('  Frontline shell loaded for Bob Specialist.');

    // ── Test Group A: Worker Me (Profile) Screen ──
    console.log('\n--- 2. Worker Me: Real Identity, Membership, Preferences & Security ---');
    // Navigate to Worker Me via sidebar/dock button
    const meNavBtn = await page.waitForSelector('[data-sr-view="me"]');
    await meNavBtn.click();
    await page.waitForSelector('.sr-me-container', { timeout: 5000 });

    // Verify real identity data
    const heroName = await page.textContent('.sr-me-hero-name');
    assertCheck(heroName?.includes('Bob Specialist'), 'Worker Me renders real name (Bob Specialist)', heroName);

    const roleBadge = await page.textContent('.sr-me-role-badge');
    assertCheck(roleBadge?.toLowerCase().includes('trauma specialist'), 'Worker Me renders verified role badge (Trauma Specialist)', roleBadge);

    const heroSub = await page.textContent('.sr-me-hero-sub');
    assertCheck(heroSub?.includes('bob@apex.test') && heroSub?.includes('Apex Health Systems'), 'Worker Me displays company & unit in hero meta', heroSub);

    // Verify membership list details
    const orgVal = await page.textContent('.sr-me-info-row:nth-child(1) .sr-me-info-val');
    assertCheck(orgVal?.includes('Apex Health Systems'), 'Membership card displays correct facility legal name', orgVal);

    const deptVal = await page.textContent('.sr-me-info-row:nth-child(2) .sr-me-info-val');
    assertCheck(deptVal?.includes('Trauma Unit'), 'Membership card displays assigned unit', deptVal);

    // Strict Prohibition Check: verify NO reliability scores, NO reputation badges, NO endorsed skills
    const pageHtml = await page.content();
    const hasReliabilityScore = pageHtml.includes('Reliability Score') || pageHtml.includes('Attendance Rating') || pageHtml.includes('Performance Score');
    assertCheck(!hasReliabilityScore, 'Strict Rule: NO invented reliability scores or performance ratings exist', 'Clean');

    const hasEndorsements = pageHtml.includes('Skill Endorsement') || pageHtml.includes('Worker Badges') || pageHtml.includes('Reputation Badge');
    assertCheck(!hasEndorsements, 'Strict Rule: NO unverified credential or gamified reputation badges exist', 'Clean');

    // Test Theme Toggle
    await page.evaluate(() => {
      const sw = document.getElementById('sr-theme-switch');
      if (sw) {
        sw.checked = !sw.checked;
        sw.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(200);
    const toggledTheme = await page.evaluate(() => document.documentElement.dataset.theme || document.documentElement.getAttribute('data-theme'));
    assertCheck(toggledTheme === 'dark', 'Theme toggle activates dark mode theme (data-theme="dark")', toggledTheme);
    const descText = await page.textContent('#sr-theme-status-desc');
    assertCheck(descText?.includes('Dark theme is active'), 'Theme description accurately reflects active skin state', descText);
    // Switch back to light
    await page.evaluate(() => {
      const sw = document.getElementById('sr-theme-switch');
      if (sw) {
        sw.checked = false;
        sw.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(200);

    // Test Help & Guidance Accordion
    const accordionHeader = await page.waitForSelector('.sr-accordion-item:nth-child(1) .sr-accordion-header');
    await accordionHeader.click();
    const isAccordionOpen = await page.evaluate(() => {
      return document.querySelector('.sr-accordion-item:nth-child(1)')?.classList.contains('open');
    });
    assertCheck(isAccordionOpen, 'Frontline Help accordion expands guidance content on tap');

    // Test Password Change Validation & Endpoint
    console.log('\n--- 3. Security: Password Change Validation & Updating ---');
    // A: Test short password validation
    await page.fill('#sr-me-current-pw', 'Password12345!');
    await page.fill('#sr-me-new-pw', 'short');
    await page.fill('#sr-me-confirm-pw', 'short');
    // Clear required constraints if browser prevents submit, or test JS validation
    await page.evaluate(() => {
      document.getElementById('sr-me-new-pw')?.removeAttribute('minlength');
      document.getElementById('sr-me-confirm-pw')?.removeAttribute('minlength');
    });
    await page.click('#sr-btn-pw-submit');
    await page.waitForTimeout(200);
    let feedback = await page.textContent('#sr-pw-feedback');
    assertCheck(feedback?.includes('at least 10 characters'), 'Password change rejects passwords under 10 chars', feedback);

    // B: Test password mismatch
    await page.fill('#sr-me-new-pw', 'ValidNewPassword123!');
    await page.fill('#sr-me-confirm-pw', 'MismatchPassword123!');
    await page.click('#sr-btn-pw-submit');
    await page.waitForTimeout(200);
    feedback = await page.textContent('#sr-pw-feedback');
    assertCheck(feedback?.includes('do not match'), 'Password change rejects mismatched passwords', feedback);

    // C: Test wrong current password (server 400 rejection)
    await page.fill('#sr-me-current-pw', 'WrongCurrentPassword999!');
    await page.fill('#sr-me-new-pw', 'BrandNewPassword123!');
    await page.fill('#sr-me-confirm-pw', 'BrandNewPassword123!');
    await page.click('#sr-btn-pw-submit');
    await page.waitForSelector('.sr-form-feedback.error', { timeout: 4000 });
    feedback = await page.textContent('#sr-pw-feedback');
    assertCheck(feedback?.includes('not correct'), 'Backend rejects incorrect current password with clear message', feedback);

    // D: Test valid password change
    await page.fill('#sr-me-current-pw', 'Password12345!');
    await page.fill('#sr-me-new-pw', 'SuperSecretPass12345!');
    await page.fill('#sr-me-confirm-pw', 'SuperSecretPass12345!');
    await page.click('#sr-btn-pw-submit');
    await page.waitForSelector('.sr-form-feedback.success', { timeout: 4000 });
    feedback = await page.textContent('#sr-pw-feedback');
    assertCheck(feedback?.includes('successfully'), 'Valid password change succeeds with confirmation alert', feedback);

    // Verify backend actually updated password
    const testLogin = await makeJsonRequest(APP_PORT, '/api/auth/sign-in', 'POST', {
      email: 'bob@apex.test',
      password: 'SuperSecretPass12345!'
    });
    assertCheck(testLogin.status === 200, 'User can authenticate with newly updated password via backend', `Status: ${testLogin.status}`);

    // Test Safe Sign Out with Offline Queue Check
    console.log('\n--- 4. Session Protection: Safe Logout Behavior ---');
    // Inject mock offline item into OfflineQueue storage using scoped key
    await page.evaluate(() => {
      const user = window._srState?.user || JSON.parse(localStorage.getItem('shiftrelay-user-data') || '{}');
      const item = {
        id: 'test-offline-1',
        url: '/api/handovers',
        method: 'POST',
        userId: user.id,
        organisationId: user.organisation_id,
        createdAt: new Date().toISOString()
      };
      const key = `shiftrelay_offline_queue_${user.id}_${user.organisation_id}`;
      localStorage.setItem(key, JSON.stringify([item]));
    });
    await page.click('#sr-btn-me-signout');
    await page.waitForSelector('#sr-unsent-work-dialog', { timeout: 3000 });
    const dialogTitle = await page.textContent('#unsent-title');
    assertCheck(dialogTitle?.includes('Unsent Offline Updates'), 'Safe logout intercepts sign-out when offline work is pending', dialogTitle);

    // Cancel logout
    await page.click('#sr-btn-cancel-logout');
    await page.waitForTimeout(200);
    const dialogGone = !(await page.$('#sr-unsent-work-dialog'));
    assertCheck(dialogGone, 'Cancel button dismisses unsent warning and keeps user signed in');

    // Clean up offline queue
    await page.evaluate(() => {
      const user = window._srState?.user || JSON.parse(localStorage.getItem('shiftrelay-user-data') || '{}');
      const key = `shiftrelay_offline_queue_${user.id}_${user.organisation_id}`;
      localStorage.removeItem(key);
    });

    // ── Test Group B: Notifications Bell & Accessible Flyout/Sheet ──
    console.log('\n--- 5. Notifications: Header Bell & Accessible Panel ---');
    // Verify genuine unread count on header bell badge
    const badgeText = await page.textContent('#sr-shell-bell-badge');
    assertCheck(badgeText?.trim() === '2', 'Header bell displays genuine unread count (2)', badgeText);

    const bellBtn = await page.waitForSelector('#sr-shell-bell');
    const ariaPopup = await bellBtn.getAttribute('aria-haspopup');
    const ariaExpandedBefore = await bellBtn.getAttribute('aria-expanded');
    assertCheck(ariaPopup === 'dialog' && ariaExpandedBefore === 'false', 'Bell button exposes aria-haspopup="dialog" and aria-expanded="false"');

    // Open notification flyout on desktop
    await bellBtn.click();
    await page.waitForSelector('.sr-notif-panel-wrap.open', { timeout: 3000 });
    const ariaExpandedAfter = await bellBtn.getAttribute('aria-expanded');
    assertCheck(ariaExpandedAfter === 'true', 'Opening panel sets aria-expanded="true" on bell');

    // Verify items in panel
    const notifItems = await page.$$('.sr-notif-item');
    assertCheck(notifItems.length >= 3, 'Notifications panel renders all fetched notifications (>= 3)', `Found: ${notifItems.length}`);

    // Verify unread badges/indicators
    const unreadItems = await page.$$('.sr-notif-item.unread');
    assertCheck(unreadItems.length === 2, 'Exactly 2 notifications have unread styling & indicator dots', `Unread count: ${unreadItems.length}`);

    // Verify timestamps are rendered
    const firstTime = await page.textContent('.sr-notif-item-time');
    assertCheck(firstTime?.includes('ago') || firstTime?.includes('Just now'), 'Timestamps formatted clearly (relative / localized)', firstTime);

    // Test Keyboard Accessibility: Escape key closes panel and restores focus
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const isPanelClosed = !(await page.evaluate(() => {
      const w = document.getElementById('sr-notif-panel-wrap');
      return w?.classList.contains('open');
    }));
    assertCheck(isPanelClosed, 'Pressing Escape key closes notifications panel');

    const focusedBell = await page.evaluate(() => document.activeElement?.id);
    assertCheck(focusedBell === 'sr-shell-bell', 'Closing via Escape restores focus to #sr-shell-bell', focusedBell);

    // Open panel again for mark-as-read actions
    await bellBtn.click();
    await page.waitForSelector('.sr-notif-panel-wrap.open');

    // Test Mark Single Notification as Read
    const singleMarkBtn = await page.waitForSelector('.sr-notif-mark-single');
    await singleMarkBtn.click();
    await page.waitForTimeout(400);

    const newBadgeText = await page.textContent('#sr-shell-bell-badge');
    assertCheck(newBadgeText?.trim() === '1', 'Marking single notification decrements unread count to 1', newBadgeText);

    // Test Mark All Read Button
    const markAllBtn = await page.waitForSelector('#sr-notif-mark-all-btn');
    await markAllBtn.click();
    await page.waitForTimeout(500);

    const badgeHidden = await page.evaluate(() => {
      const b = document.getElementById('sr-shell-bell-badge');
      return !b || b.style.display === 'none' || b.textContent === '0';
    });
    assertCheck(badgeHidden, 'Mark all read clears unread badge on header bell', `Badge hidden: ${badgeHidden}`);

    const markAllDisabled = await page.evaluate(() => {
      return document.getElementById('sr-notif-mark-all-btn')?.disabled;
    });
    assertCheck(markAllDisabled, 'Mark all read button disables when no unread notifications remain');

    // ── Test Group C: Notification Click Routing ──
    console.log('\n--- 6. Notification Click Navigation (Authorized Destinations Only) ---');
    // Close panel
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Seed a new handover notification directly in DB
    await pgPool.query(
      `INSERT INTO notifications (id, organisation_id, recipient_membership_id, message, read_at, created_at)
       VALUES (gen_random_uuid(), $1, $2, 'Handover brief submitted for Night Shift', NULL, NOW())`,
      [orgIdA, bobMembershipIdA]
    );

    // Trigger realtime refresh (simulating SSE event)
    await page.evaluate(() => window.refreshShellNotifications());
    await page.waitForTimeout(400);

    const updatedBellBadge = await page.textContent('#sr-shell-bell-badge');
    assertCheck(updatedBellBadge?.trim() === '1', 'Realtime refresh / SSE update reflects incoming notification count', updatedBellBadge);

    // Open panel and click the handover notification
    await bellBtn.click();
    await page.waitForSelector('.sr-notif-panel-wrap.open');

    const handoverNotifItem = await page.waitForSelector('.sr-notif-item[data-dest="handovers"]');
    await handoverNotifItem.click();
    await page.waitForTimeout(600);

    // Verify destination is authorized handovers view and panel is closed
    const activeView = await page.evaluate(() => {
      return document.querySelector('.sr-nav-btn.active, .sr-dock-item.active')?.getAttribute('data-sr-view');
    });
    assertCheck(activeView === 'handovers', 'Clicking handover notification routes to authorized Handovers view', activeView);

    // ── Test Group D: Company Context Switching Notification Isolation ──
    console.log('\n--- 7. Company Switching: Immediate Cache & Notification Clearing ---');
    // Open Context Switcher Modal
    await page.click('#sr-btn-context');
    await page.waitForSelector('#sr-context-modal');

    // Switch to Metro Logistics
    const switchBtn = await page.waitForSelector(`[data-switch-membership="${bobMembershipIdB}"]`);
    await switchBtn.click();

    await page.waitForSelector('#sr-app-shell', { timeout: 8000 });
    await page.waitForTimeout(500);

    // Verify context switcher displays Metro Logistics
    const currentOrg = await page.textContent('.sr-context-pill-org');
    assertCheck(currentOrg?.includes('Metro Logistics Hub'), 'Context switched to Metro Logistics Hub', currentOrg);

    // Verify bell count for Metro Logistics Hub (should be 1, because we seeded 1 for Company B)
    const metroBadge = await page.textContent('#sr-shell-bell-badge');
    assertCheck(metroBadge?.trim() === '1', 'Company context switch immediately isolates and loads new company notifications (1)', metroBadge);

    // Open panel in Company B
    await page.click('#sr-shell-bell');
    await page.waitForSelector('.sr-notif-panel-wrap.open');
    const metroNotifMsg = await page.textContent('.sr-notif-item-msg');
    assertCheck(metroNotifMsg?.includes('Metro Warehouse'), 'Notifications list displays only Company B scoped messages', metroNotifMsg);
    await page.keyboard.press('Escape');

    // ── Test Group E: Screenshots & Responsive Verification ──
    console.log('\n--- 8. Screenshots & Responsive Verification ---');
    // Desktop: Worker Me screenshot
    await page.click('#sr-shell-avatar');
    await page.waitForSelector('.sr-me-container');
    const desktopMePath = join(ARTIFACT_DIR, 'worker-me-desktop.png');
    await page.screenshot({ path: desktopMePath, fullPage: false });
    console.log(`  Saved screenshot: ${desktopMePath}`);

    // Desktop: Notifications Flyout screenshot
    await page.click('#sr-shell-bell');
    await page.waitForSelector('.sr-notif-panel-wrap.open');
    const desktopNotifPath = join(ARTIFACT_DIR, 'notifications-desktop.png');
    await page.screenshot({ path: desktopNotifPath, fullPage: false });
    console.log(`  Saved screenshot: ${desktopNotifPath}`);

    // Mobile Viewport (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    // Mobile: Notifications Sheet screenshot
    const mobileNotifPath = join(ARTIFACT_DIR, 'notifications-mobile.png');
    await page.screenshot({ path: mobileNotifPath, fullPage: false });
    console.log(`  Saved screenshot: ${mobileNotifPath}`);

    // Mobile: Worker Me screenshot
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await page.click('.sr-dock-item[data-sr-view="me"]');
    await page.waitForSelector('.sr-me-container');
    const mobileMePath = join(ARTIFACT_DIR, 'worker-me-mobile.png');
    await page.screenshot({ path: mobileMePath, fullPage: false });
    console.log(`  Saved screenshot: ${mobileMePath}`);

    console.log('\n' + '='.repeat(75));
    console.log(`  AUDIT COMPLETE: ${checksPassed} checks passed, ${checksFailed} checks failed.`);
    console.log('='.repeat(75));

  } catch (err) {
    console.error('Fatal test error:', err);
    checksFailed++;
  } finally {
    if (browser) await browser.close();
    if (appProc) {
      try { process.kill(appProc.pid); } catch {}
    }
    if (pgPool) await pgPool.end();
    if (pgProc) {
      try { process.kill(pgProc.pid); } catch {}
    }
  }

  process.exit(checksFailed > 0 ? 1 : 0);
}

runPhase4Review();
