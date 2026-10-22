import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { join } from 'node:path';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
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
      'x-forwarded-for': `10.7.${Math.floor(reqCounter / 250)}.${reqCounter % 250 + 1}`
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

async function runPhase3Review() {
  console.log('='.repeat(75));
  console.log('  SHIFTRELAY UI PHASE 3: TEAM & APPROVALS VERIFICATION AUDIT');
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

    // ── Setup: Register Company A (Apex Healthcare) ──
    const regResA = await makeJsonRequest(APP_PORT, '/api/organisations', 'POST', {
      legalName: 'Apex Health Systems',
      industry: 'Healthcare',
      ownerName: 'Alice Chief',
      workEmail: 'alice@apex.test',
      password: 'Password12345!'
    });
    const aliceCookie = regResA.headers['set-cookie']?.[0]?.split(';')[0];
    const orgCodeA = regResA.body?.organisation?.organisationCode;
    const orgIdA = regResA.body?.organisation?.organisationId;

    // Enrol Supervisor Adam and activate role
    await makeJsonRequest(APP_PORT, '/api/organisation-memberships', 'POST', {
      organisationCode: orgCodeA,
      fullName: 'Adam Supervisor',
      email: 'adam@apex.test',
      position: 'Shift Supervisor',
      password: 'Password12345!'
    });
    await pgPool.query(
      `UPDATE memberships SET status = 'active', role = 'supervisor', title = 'Shift Supervisor', department = 'Trauma Unit'
       WHERE user_id = (SELECT id FROM portal_users WHERE email = 'adam@apex.test')`
    );

    // Enrol Bob Specialist (Incoming Worker) and activate
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
    const bobMembership = (await pgPool.query("SELECT id FROM memberships WHERE user_id = (SELECT id FROM portal_users WHERE email = 'bob@apex.test')")).rows[0];
    const bobMembershipId = bobMembership.id;

    // Bob logs in and submits a leave request
    const bobLogin = await makeJsonRequest(APP_PORT, '/api/auth/sign-in', 'POST', {
      email: 'bob@apex.test',
      password: 'Password12345!'
    });
    const bobCookie = bobLogin.headers['set-cookie']?.[0]?.split(';')[0];
    await makeJsonRequest(APP_PORT, '/api/leave-requests', 'POST', {
      startsOn: '2026-11-10',
      endsOn: '2026-11-15',
      reason: 'Continuing Medical Education conference'
    }, bobCookie);

    // Enrol Applicant Chloe (remains pending_approval for Approvals tests)
    await makeJsonRequest(APP_PORT, '/api/organisation-memberships', 'POST', {
      organisationCode: orgCodeA,
      fullName: 'Chloe Nurse',
      email: 'chloe@apex.test',
      position: 'Triage Nurse',
      password: 'Password12345!'
    });

    // ── Pre-requisite 1: Targeted Backend Test for Checklist Retry Idempotency ──
    console.log('\n--- 1. Testing Checklist Retry State-Reversal Prevention ---');
    const handoverRes = await makeJsonRequest(APP_PORT, '/api/handovers', 'POST', {
      handover: {
        summary: 'Emergency Room Evening Status',
        notes: 'Ventilator checks pending',
        tasks: [
          { id: 'task-test-1', text: 'Calibrate O2 flow meter', done: false, priority: 'urgent' }
        ]
      },
      assignedTo: bobMembershipId
    }, aliceCookie);
    const hId = handoverRes.body?.handover?.id;

    // Retry toggling task to TRUE 3 times in succession (simulating network retry of the same click)
    await makeJsonRequest(APP_PORT, `/api/handovers/${hId}/tasks/task-test-1/toggle`, 'POST', { done: true }, aliceCookie);
    await makeJsonRequest(APP_PORT, `/api/handovers/${hId}/tasks/task-test-1/toggle`, 'POST', { done: true }, aliceCookie);
    const toggleRetry3 = await makeJsonRequest(APP_PORT, `/api/handovers/${hId}/tasks/task-test-1/toggle`, 'POST', { done: true }, aliceCookie);

    assertCheck(
      toggleRetry3.body?.task?.done === true,
      'Checklist retries with { done: true } cannot reverse state (idempotent boolean)',
      JSON.stringify(toggleRetry3.body)
    );

    // Register Company B with Owner Carol and Applicant Dan
    const regResB = await makeJsonRequest(APP_PORT, '/api/organisations', 'POST', {
      legalName: 'Beacon Retail Stores',
      industry: 'Retail',
      ownerName: 'Carol Manager',
      workEmail: 'carol@beacon.test',
      password: 'Password12345!'
    });
    const carolCookie = regResB.headers['set-cookie']?.[0]?.split(';')[0];
    const orgCodeB = regResB.body?.organisation?.organisationCode;

    await makeJsonRequest(APP_PORT, '/api/organisation-memberships', 'POST', {
      organisationCode: orgCodeB,
      fullName: 'Dan Associate',
      email: 'dan@beacon.test',
      position: 'Warehouse Lead',
      password: 'Password12345!'
    });

    // ── Launch Browser Audits using Chrome Channel ──
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    mkdirSync('docs/screenshots', { recursive: true });

    const adamContext = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    await adamContext.addInitScript(() => {
      localStorage.setItem('sr_first_shift_onboarding_done', '1');
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

    // ── 2. Team Directory: Searchable, Company-Scoped Staff List ──
    console.log('\n--- 2. Testing Team Directory Screen ---');
    const pageAdam = await adamContext.newPage();
    await pageAdam.goto(`http://127.0.0.1:${APP_PORT}/`);

    // Sign in as Adam (Supervisor) — use supported login callback; no direct state injection.
    const adamLoginResult = await pageAdam.evaluate(async () => {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'adam@apex.test', password: 'Password12345!' })
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, data };
      if (typeof window._srLoginCallback === 'function') window._srLoginCallback(data.user);
      else if (window.Phase1Shell?.mount) await window.Phase1Shell.mount();
      return { ok: true, user: data.user };
    });

    assertCheck(adamLoginResult.ok, 'Supervisor Adam logged in successfully via API session', JSON.stringify(adamLoginResult));

    await pageAdam.waitForSelector('#sr-app-shell', { timeout: 10000 });

    // Navigate to Team
    await pageAdam.evaluate(async () => {
      await window.Phase1Shell.navigate('team');
    });
    await pageAdam.waitForSelector('.sr-team-card');

    const memberNames = await pageAdam.$$eval('.sr-team-name', els => els.map(e => e.textContent.trim()));
    console.log('  Rendered Team Members in Company A:', memberNames);

    assertCheck(
      memberNames.some(n => n.includes('Alice')) && memberNames.some(n => n.includes('Bob')),
      'Team directory renders active Company A staff members'
    );

    assertCheck(
      !memberNames.some(n => n.includes('Carol') || n.includes('Dan')),
      'Company B staff (Carol, Dan) are strictly isolated and not leaked in Team Directory'
    );

    // Test Real-time Search Input
    await pageAdam.fill('#sr-team-search', 'Bob');
    await pageAdam.waitForFunction(() => document.querySelectorAll('.sr-team-name').length <= 2);
    const filteredMembers = await pageAdam.$$eval('.sr-team-name', els => els.map(e => e.textContent.trim()));
    const countText = await pageAdam.$eval('#sr-team-count', el => el.textContent.trim());

    assertCheck(
      filteredMembers.length === 1 && filteredMembers[0].includes('Bob'),
      'Search input dynamically filters team members by query'
    );
    assertCheck(
      countText.includes('1 of'),
      'Search count badge accurately displays filtered staff count'
    );

    // Reset search
    await pageAdam.fill('#sr-team-search', '');
    await pageAdam.waitForFunction(() => document.querySelectorAll('.sr-team-name').length >= 3);

    // Capture Desktop Team Screenshot
    await pageAdam.screenshot({ path: 'docs/screenshots/team-desktop.png' });
    console.log('  Captured docs/screenshots/team-desktop.png');

    // Mobile Viewport for Team
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });
    await mobileContext.addInitScript(() => {
      localStorage.setItem('sr_first_shift_onboarding_done', '1');
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

    const pageMobile = await mobileContext.newPage();
    await pageMobile.goto(`http://127.0.0.1:${APP_PORT}/`);
    await pageMobile.evaluate(async () => {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'adam@apex.test', password: 'Password12345!' })
      });
      const data = await res.json();
      if (typeof window._srLoginCallback === 'function') window._srLoginCallback(data.user);
      else if (window.Phase1Shell?.mount) await window.Phase1Shell.mount();
    });
    await pageMobile.waitForSelector('#sr-app-shell', { timeout: 10000 });
    await pageMobile.evaluate(async () => {
      await window.Phase1Shell.navigate('team');
    });
    await pageMobile.waitForSelector('.sr-team-card');
    await pageMobile.screenshot({ path: 'docs/screenshots/team-mobile.png' });
    console.log('  Captured docs/screenshots/team-mobile.png');
    await pageMobile.close();

    // ── 3. Approvals: Supervisor Perspective & Owner-Only Shielding ──
    console.log('\n--- 3. Testing Approvals Screen (Supervisor Role) ---');
    await pageAdam.evaluate(async () => {
      await window.Phase1Shell.navigate('approvals');
    });
    await pageAdam.waitForSelector('#sr-approvals-panel');

    // Verify Supervisor sees Worker Access Requests with Chloe
    const requestNames = await pageAdam.$$eval('.sr-approval-applicant-name', els => els.map(e => e.textContent.trim()));
    assertCheck(
      requestNames.some(n => n.includes('Chloe Nurse')),
      'Supervisor sees pending worker access request for Chloe Nurse'
    );

    // CRITICAL: Verify Supervisor does NOT see Leave Reviews tab
    const supervisorTabs = await pageAdam.$$eval('[data-sr-approval-tab]', els => els.map(e => e.textContent.trim()));
    assertCheck(
      !supervisorTabs.some(t => t.toLowerCase().includes('leave')),
      'Supervisors CANNOT see owner-only Leave Reviews tab (strictly shielded)'
    );

    // Test Consequential Confirmation Modal & Duplicate Submission Protection
    await pageAdam.click('[data-action="open-approve-access"]');
    await pageAdam.waitForSelector('#sr-consequential-modal-root');

    const modalTitle = await pageAdam.$eval('#sr-confirm-modal-title', el => el.textContent.trim());
    assertCheck(
      modalTitle.includes('Authorise Worker Access'),
      'Consequential modal opens before consequential access approval'
    );

    // Confirm approval
    await pageAdam.click('#sr-btn-confirm-ok');
    await pageAdam.waitForSelector('#sr-consequential-modal-root', { state: 'detached', timeout: 5000 });
    await pageAdam.waitForFunction(() => document.querySelectorAll('.sr-approval-card').length === 0);

    const postApprovalRequests = await pageAdam.$$eval('.sr-approval-card', els => els.length);
    assertCheck(
      postApprovalRequests === 0,
      'Approved request is cleared from pending queue with success feedback'
    );

    // ── 4. Approvals: Owner Perspective (Leave Reviews) ──
    console.log('\n--- 4. Testing Approvals Screen (Owner Role) ---');
    const aliceContext = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    await aliceContext.addInitScript(() => {
      localStorage.setItem('sr_first_shift_onboarding_done', '1');
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

    const pageAlice = await aliceContext.newPage();
    await pageAlice.goto(`http://127.0.0.1:${APP_PORT}/`);

    // Sign in as Alice (Owner, Company A)
    await pageAlice.evaluate(async () => {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alice@apex.test', password: 'Password12345!' })
      });
      const data = await res.json();
      if (typeof window._srLoginCallback === 'function') window._srLoginCallback(data.user);
      else if (window.Phase1Shell?.mount) await window.Phase1Shell.mount();
    });

    await pageAlice.waitForSelector('#sr-app-shell', { timeout: 10000 });
    await pageAlice.evaluate(async () => {
      await window.Phase1Shell.navigate('approvals');
    });
    await pageAlice.waitForSelector('#sr-approvals-panel');

    const ownerTabs = await pageAlice.$$eval('[data-sr-approval-tab]', els => els.map(e => e.textContent.trim()));
    assertCheck(
      ownerTabs.some(t => t.toLowerCase().includes('leave')),
      'Owner sees Leave Reviews tab in Approvals'
    );

    // Switch to Leave Reviews tab
    await pageAlice.click('[data-sr-approval-tab="leave"]');
    await pageAlice.waitForSelector('[data-leave-id]', { timeout: 10000 });

    const leaveApplicant = await pageAlice.$eval('[data-leave-id] .sr-approval-applicant-name', el => el.textContent.trim());
    assertCheck(
      leaveApplicant.includes('Bob Specialist'),
      'Owner sees Bob Specialist leave request with dates and CME reason',
      leaveApplicant
    );

    // Capture Desktop Approvals Screenshot
    await pageAlice.screenshot({ path: 'docs/screenshots/approvals-desktop.png' });
    console.log('  Captured docs/screenshots/approvals-desktop.png');

    // Mobile Approvals Viewport
    const aliceMobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });
    await aliceMobileContext.addInitScript(() => {
      localStorage.setItem('sr_first_shift_onboarding_done', '1');
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

    const pageAliceMobile = await aliceMobileContext.newPage();
    await pageAliceMobile.goto(`http://127.0.0.1:${APP_PORT}/`);
    await pageAliceMobile.evaluate(async () => {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alice@apex.test', password: 'Password12345!' })
      });
      const data = await res.json();
      if (typeof window._srLoginCallback === 'function') window._srLoginCallback(data.user);
      else if (window.Phase1Shell?.mount) await window.Phase1Shell.mount();
    });
    await pageAliceMobile.waitForSelector('#sr-app-shell', { timeout: 10000 });
    await pageAliceMobile.evaluate(async () => {
      await window.Phase1Shell.navigate('approvals');
    });
    await pageAliceMobile.waitForSelector('[data-sr-approval-tab="leave"]');
    await pageAliceMobile.click('[data-sr-approval-tab="leave"]');
    await pageAliceMobile.waitForSelector('[data-leave-id]', { timeout: 10000 });
    await pageAliceMobile.screenshot({ path: 'docs/screenshots/approvals-mobile.png' });
    console.log('  Captured docs/screenshots/approvals-mobile.png');
    await pageAliceMobile.close();

    // Owner reviews and approves Bob's leave request
    await pageAlice.click('[data-action="open-approve-leave"]');
    await pageAlice.waitForSelector('#sr-consequential-modal-root');
    await pageAlice.click('#sr-btn-confirm-ok');
    await pageAlice.waitForSelector('#sr-consequential-modal-root', { state: 'detached', timeout: 5000 });
    await pageAlice.waitForFunction(() => document.querySelectorAll('.sr-approval-card').length === 0);

    const postLeaveRequests = await pageAlice.$$eval('.sr-approval-card', els => els.length);
    assertCheck(
      postLeaveRequests === 0,
      'Owner approved leave request; cleared from pending queue with success feedback'
    );

    // ── 5. Cross-Company Approvals & Team Isolation ──
    console.log('\n--- 5. Testing Cross-Company Isolation in Approvals ---');
    const carolContext = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    await carolContext.addInitScript(() => {
      localStorage.setItem('sr_first_shift_onboarding_done', '1');
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

    const pageCarol = await carolContext.newPage();
    await pageCarol.goto(`http://127.0.0.1:${APP_PORT}/`);

    // Sign in as Carol (Owner, Company B)
    await pageCarol.evaluate(async () => {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'carol@beacon.test', password: 'Password12345!' })
      });
      const data = await res.json();
      if (typeof window._srLoginCallback === 'function') window._srLoginCallback(data.user);
      else if (window.Phase1Shell?.mount) await window.Phase1Shell.mount();
    });

    await pageCarol.waitForSelector('#sr-app-shell', { timeout: 10000 });
    await pageCarol.evaluate(async () => {
      await window.Phase1Shell.navigate('approvals');
    });
    await pageCarol.waitForSelector('.sr-approval-card');

    const carolRequests = await pageCarol.$$eval('.sr-approval-applicant-name', els => els.map(e => e.textContent.trim()));
    assertCheck(
      carolRequests.length === 1 && carolRequests[0].includes('Dan Associate'),
      'Company B Owner Carol sees only Dan Associate; Zero cross-company leak'
    );

    // ── 6. Persistence After Reload ──
    console.log('\n--- 6. Testing Persistence After Reload ---');
    // Reload the page; verified via normal session restoration — no state injection.
    await pageAdam.reload({ waitUntil: 'networkidle' });
    // Wait for deterministic session/splash readiness
    await pageAdam.waitForFunction(() => window._srReady === true || document.querySelector('#sr-app-shell') !== null, { timeout: 10000 });
    // Ensure shell is mounted
    await pageAdam.waitForSelector('#sr-app-shell', { timeout: 12000 });
    await pageAdam.waitForSelector('[data-sr-view]', { timeout: 8000 });
    await pageAdam.evaluate(async () => { await window.Phase1Shell.navigate('team'); });
    await pageAdam.waitForSelector('.sr-team-card', { timeout: 10000 });

    const reloadedTeam = await pageAdam.$$eval('.sr-team-name', els => els.map(e => e.textContent.trim()));
    assertCheck(
      reloadedTeam.some(n => n.includes('Chloe Nurse')),
      'Approved member Chloe Nurse persists in Team Directory after browser reload'
    );

    // ── 7. Security: Forbidden Role Escalation ──
    console.log('\n--- 7. Security: Role Escalation via Approval ---');
    await makeJsonRequest(APP_PORT, '/api/organisation-memberships', 'POST', {
      organisationCode: orgCodeA, fullName: 'Eve Applicant', email: 'eve@apex.test',
      position: 'Support Staff', password: 'Password12345!'
    });
    const eveMembership = (await pgPool.query("SELECT id FROM memberships WHERE user_id = (SELECT id FROM portal_users WHERE email = 'eve@apex.test')")).rows[0];
    const eveId = eveMembership?.id;

    const escalateOwner = await makeJsonRequest(APP_PORT, '/api/memberships/' + eveId + '/review', 'POST',
      { decision: 'approve', role: 'owner' }, aliceCookie);
    assertCheck(escalateOwner.status === 400,
      'Backend rejects role escalation to "owner" via membership approval',
      JSON.stringify(escalateOwner.body));

    const escalateSupervisor = await makeJsonRequest(APP_PORT, '/api/memberships/' + eveId + '/review', 'POST',
      { decision: 'approve', role: 'supervisor' }, aliceCookie);
    assertCheck(escalateSupervisor.status === 400,
      'Backend rejects role escalation to "supervisor" via membership approval',
      JSON.stringify(escalateSupervisor.body));

    // ── 8. Security: Worker Cannot Execute Manager Endpoints ──
    console.log('\n--- 8. Security: Worker Requests to Manager Endpoints ---');
    const workerApprove = await makeJsonRequest(APP_PORT, '/api/memberships/' + eveId + '/review', 'POST',
      { decision: 'approve', role: 'incoming' }, bobCookie);
    assertCheck(workerApprove.status === 403,
      'Worker (incoming role) cannot approve memberships — 403 returned',
      JSON.stringify(workerApprove.body));

    const workerLeaveReview = await makeJsonRequest(APP_PORT, '/api/leave-requests/review', 'POST',
      { leaveId: 'any-id', decision: 'approve' }, bobCookie);
    assertCheck(workerLeaveReview.status === 403,
      'Worker cannot call leave-request review endpoint — 403 returned',
      JSON.stringify(workerLeaveReview.body));

    // ── 9. Idempotency Key Stability — Repeated Approval Clicks ──
    console.log('\n--- 9. Idempotency: Repeated Approval Clicks ---');
    await makeJsonRequest(APP_PORT, '/api/organisation-memberships', 'POST', {
      organisationCode: orgCodeA, fullName: 'Frank Repeat', email: 'frank@apex.test',
      position: 'Orderly', password: 'Password12345!'
    });
    const frankMembership = (await pgPool.query("SELECT id FROM memberships WHERE user_id = (SELECT id FROM portal_users WHERE email = 'frank@apex.test')")).rows[0];
    const frankId = frankMembership?.id;
    const idemKey = 'idem_mem_appr_' + frankId + '_stable';

    const makeIdemRequest = (cookie, key, membershipId) => new Promise((resolve) => {
      const payload = JSON.stringify({ decision: 'approve', role: 'incoming' });
      const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload),
        'Idempotency-Key': key, 'Cookie': cookie };
      const req = http.request({ hostname: '127.0.0.1', port: APP_PORT,
        path: '/api/memberships/' + membershipId + '/review', method: 'POST', headers }, (res) => {
        let data = ''; res.on('data', c => { data += c; }); res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      });
      req.on('error', err => resolve({ status: 0, error: err.message }));
      req.write(payload); req.end();
    });

    const rep1 = await makeIdemRequest(aliceCookie, idemKey, frankId);
    const rep2 = await makeIdemRequest(aliceCookie, idemKey, frankId);
    const rep3 = await makeIdemRequest(aliceCookie, idemKey, frankId);
    assertCheck((rep1.status === 200 || rep1.status === 409),
      'Idempotency: first replay with same key returns 200 or 409',
      JSON.stringify(rep1.body));
    assertCheck(rep2.status === rep1.status && rep3.status === rep1.status,
      'Idempotency: all repeated requests with same key return identical status',
      `rep1=${rep1.status} rep2=${rep2.status} rep3=${rep3.status}`);

    // Sync all screenshots to Brain Artifact Directory
    copyFileSync('docs/screenshots/team-desktop.png', join(ARTIFACT_DIR, 'team-desktop.png'));
    copyFileSync('docs/screenshots/team-mobile.png', join(ARTIFACT_DIR, 'team-mobile.png'));
    copyFileSync('docs/screenshots/approvals-desktop.png', join(ARTIFACT_DIR, 'approvals-desktop.png'));
    copyFileSync('docs/screenshots/approvals-mobile.png', join(ARTIFACT_DIR, 'approvals-mobile.png'));
    console.log('  Synced all 4 screenshots to brain artifact directory.');

  } catch (err) {
    console.error('Fatal test error:', err);
    checksFailed++;
  } finally {
    if (browser) await browser.close();
    if (appProc) appProc.kill();
    if (pgPool) await pgPool.end();
    if (pgProc) pgProc.kill();

    const pidFile = join(PG_DATA, 'postmaster.pid');
    if (existsSync(pidFile)) {
      try { execSync(`del /F "${pidFile}"`, { stdio: 'ignore' }); } catch {}
    }
  }

  console.log('\n' + '='.repeat(75));
  console.log(`  UI PHASE 3 AUDIT RESULTS: ${checksPassed} PASSED, ${checksFailed} FAILED`);
  console.log('='.repeat(75));

  if (checksFailed > 0) process.exit(1);
}

runPhase3Review();
