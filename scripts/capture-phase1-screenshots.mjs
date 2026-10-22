import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { join } from 'node:path';
import { copyFileSync, existsSync } from 'node:fs';
import http from 'node:http';
import pg from 'pg';

const { Pool } = pg;
const PG_PORT = 54323;
const APP_PORT = 4088;
const PG_BIN = 'C:\\Program Files\\PostgreSQL\\18\\bin';
const PG_DATA = join(process.env.TEMP, 'disposable_pg_cluster');

const ARTIFACT_DIR = 'C:\\Users\\DATA ENG. OLA\\.gemini\\antigravity\\brain\\8c57bcf0-5ed6-4457-bd3b-82f404ed97c9';

async function startPostgres() {
  const pidFile = join(PG_DATA, 'postmaster.pid');
  if (existsSync(pidFile)) {
    try { execSync(`del /F "${pidFile}"`, { stdio: 'ignore' }); } catch {}
  }
  const pgProc = spawn(`"${PG_BIN}\\postgres.exe"`, ['-D', PG_DATA, '-p', String(PG_PORT)], {
    shell: true,
    stdio: 'ignore'
  });
  return pgProc;
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

async function capture() {
  console.log('='.repeat(70));
  console.log('  CAPTURING PHASE 1 SCREENSHOTS (Mobile 390x844 & Desktop 1280x800)');
  console.log('='.repeat(70));

  let pgProc = null;
  let appProc = null;
  let pgPool = null;
  let browser = null;

  try {
    pgProc = await startPostgres();
    pgPool = new Pool({ connectionString: `postgres://postgres@127.0.0.1:${PG_PORT}/postgres`, max: 5 });
    const pgReady = await waitForPg(pgPool);
    if (!pgReady) {
      throw new Error('[FATAL] PostgreSQL not ready on port ' + PG_PORT);
    }
    console.log('  Postgres ready on port ' + PG_PORT);

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
    if (!appReady) {
      throw new Error('[FATAL] App server failed to start on port ' + APP_PORT);
    }
    console.log(`  App running on http://127.0.0.1:${APP_PORT}`);

    // Seed Data:
    // 1. Create Organisation with Owner Marcus Vance
    const regRes = await fetch(`http://127.0.0.1:${APP_PORT}/api/organisations`, {
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
    const regData = await regRes.json();
    const orgCode = regData.organisation.organisationCode;
    const orgId = regData.organisation.id;
    const managerUser = regData.user;
    console.log(`  Org registered: Apex Regional Health System (Code: ${orgCode})`);

    // Extract cookie from sign-in for Marcus Vance
    const signinRes = await fetch(`http://127.0.0.1:${APP_PORT}/api/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'marcus.vance@apexhealth.org', password: 'Password12345!' })
    });
    const setCookieHeader = signinRes.headers.get('set-cookie');
    const ownerCookie = (setCookieHeader || '').split(';')[0];

    // 2. Register Maya Lin (Frontline Worker)
    await fetch(`http://127.0.0.1:${APP_PORT}/api/organisation-memberships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organisationCode: orgCode,
        fullName: 'Maya Lin, RN',
        email: 'maya.lin@apexhealth.org',
        position: 'Emergency Triage Specialist',
        password: 'Password12345!'
      })
    });
    console.log('  Worker Maya Lin enrolled');

    // Activate Maya Lin in DB as incoming role
    await pgPool.query(
      `UPDATE memberships SET status = 'active', role = 'incoming', title = 'Emergency Triage Specialist', department = 'Emergency & Acute Care Unit'
       WHERE user_id = (SELECT id FROM portal_users WHERE email = 'maya.lin@apexhealth.org')`
    );

    // 3. Register David Kim (Pending Worker for Manager Review Queue)
    await fetch(`http://127.0.0.1:${APP_PORT}/api/organisation-memberships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organisationCode: orgCode,
        fullName: 'David Kim, EMT-P',
        email: 'david.kim@apexhealth.org',
        position: 'Paramedic Specialist',
        password: 'Password12345!'
      })
    });
    console.log('  Pending worker David Kim access request created');

    // 4. Create Handover using the API as Marcus Vance
    const handoverRes = await fetch(`http://127.0.0.1:${APP_PORT}/api/handovers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': ownerCookie
      },
      body: JSON.stringify({
        notes: 'Night shift closed with 14 active patient bays. Resus 1 ready for trauma intake.',
        handover: {
          summary: 'ED Night-to-Day Operational Handover · 14 Bays Occupied',
          shiftStatus: 'normal',
          tasks: [
            { id: 'task-1', text: 'Confirm blood bank cross-match for Bay 4 trauma intake', done: false },
            { id: 'task-2', text: 'Restock rapid infusion and arterial line trays in Resus 1', done: true },
            { id: 'task-3', text: 'Complete 08:00 controlled substance verification with incoming lead', done: false }
          ]
        }
      })
    });
    const hoData = await handoverRes.json();
    const handoverId = hoData.handover?.id;
    console.log(`  Handover created via API (ID: ${handoverId})`);

    // Relay the handover so it is ready for Maya Lin to acknowledge
    if (handoverId) {
      await fetch(`http://127.0.0.1:${APP_PORT}/api/handovers/${handoverId}/relay`, {
        method: 'POST',
        headers: { 'Cookie': ownerCookie }
      });
      console.log(`  Handover relayed to unit`);
    }

    // 5. Seed active time entry for Maya Lin (Clocked in 42 minutes ago)
    const orgQuery = await pgPool.query(`SELECT id FROM organisations LIMIT 1`);
    const verifiedOrgId = orgQuery.rows[0]?.id;
    const mayaMemRes = await pgPool.query(
      `SELECT m.id FROM memberships m JOIN portal_users u ON u.id = m.user_id WHERE u.email = 'maya.lin@apexhealth.org'`
    );
    const mayaMemId = mayaMemRes.rows[0]?.id;
    if (mayaMemId && verifiedOrgId) {
      await pgPool.query(
        `INSERT INTO time_entries (id, organisation_id, membership_id, clocked_in_at)
         VALUES (gen_random_uuid(), $1, $2, now() - interval '42 minutes')`,
        [verifiedOrgId, mayaMemId]
      );
      console.log('  Active shift time entry recorded for Maya Lin');
    }

    // Launch Playwright Chromium
    browser = await chromium.launch({ channel: 'chrome', headless: true });

    const targets = [
      {
        roleName: 'Worker Today',
        email: 'maya.lin@apexhealth.org',
        password: 'Password12345!',
        mobileFile: 'docs/screenshots/worker-today-mobile.png',
        desktopFile: 'docs/screenshots/worker-today-desktop.png'
      },
      {
        roleName: 'Manager Overview',
        email: 'marcus.vance@apexhealth.org',
        password: 'Password12345!',
        mobileFile: 'docs/screenshots/manager-overview-mobile.png',
        desktopFile: 'docs/screenshots/manager-overview-desktop.png'
      }
    ];

    for (const target of targets) {
      console.log(`\n--- Capturing ${target.roleName} ---`);

      // 1. Mobile (390 x 844)
      const mobileContext = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true
      });
      const mobilePage = await mobileContext.newPage();
      await mobilePage.goto(`http://127.0.0.1:${APP_PORT}/`);
      await mobilePage.waitForLoadState('domcontentloaded');

      await mobilePage.evaluate(async ({ email, password }) => {
        const res = await fetch('/api/auth/sign-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        window.state = window.state || {};
        window.state.user = data.user;
        if (typeof window._srLoginCallback === 'function') {
          window._srLoginCallback(data.user);
        }
        if (window.Phase1Shell?.mount) {
          await window.Phase1Shell.mount();
        }
      }, { email: target.email, password: target.password });

      await mobilePage.waitForSelector('#sr-app-shell', { timeout: 10000 });
      await mobilePage.waitForTimeout(1200);
      await mobilePage.screenshot({ path: target.mobileFile, fullPage: false });
      console.log(`  Saved: ${target.mobileFile}`);
      copyFileSync(target.mobileFile, join(ARTIFACT_DIR, target.mobileFile.split('/').pop()));
      await mobileContext.close();

      // 2. Desktop (1280 x 800)
      const desktopContext = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 2
      });
      const desktopPage = await desktopContext.newPage();
      await desktopPage.goto(`http://127.0.0.1:${APP_PORT}/`);
      await desktopPage.waitForLoadState('domcontentloaded');

      await desktopPage.evaluate(async ({ email, password }) => {
        const res = await fetch('/api/auth/sign-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        window.state = window.state || {};
        window.state.user = data.user;
        if (typeof window._srLoginCallback === 'function') {
          window._srLoginCallback(data.user);
        }
        if (window.Phase1Shell?.mount) {
          await window.Phase1Shell.mount();
        }
      }, { email: target.email, password: target.password });

      await desktopPage.waitForSelector('#sr-app-shell', { timeout: 10000 });
      await desktopPage.waitForTimeout(1200);
      await desktopPage.screenshot({ path: target.desktopFile, fullPage: false });
      console.log(`  Saved: ${target.desktopFile}`);
      copyFileSync(target.desktopFile, join(ARTIFACT_DIR, target.desktopFile.split('/').pop()));
      await desktopContext.close();
    }

    console.log('\nAll 4 screenshots captured and verified successfully!');
  } catch (err) {
    console.error('Capture encountered error:', err);
    throw err;
  } finally {
    try { await browser?.close(); } catch (_) {}
    try { if (appProc) execSync(`taskkill /pid ${appProc.pid} /f /t`, { stdio: 'ignore' }); } catch (_) {}
    try { await pgPool?.end(); } catch (_) {}
    try { if (pgProc) execSync(`taskkill /pid ${pgProc.pid} /f /t`, { stdio: 'ignore' }); } catch (_) {}
  }
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
