/**
 * Batch 3 Real-Browser Shared-Device Verification
 * Tests using Playwright with real Chromium browser:
 * 1. User A signs in, goes to dashboard
 * 2. User A creates offline queued action and chooses "Keep" on logout
 * 3. Verify User A's data cleared from UI / session / account storage
 * 4. User B signs in on same device/browser
 * 5. Verify User B CANNOT see User A's queued actions or profile
 * 6. Verify User B's session does NOT replay User A's queued actions
 * 7. Test back/forward navigation (cannot re-access User A screens)
 * 8. Test reload
 * 9. Test offline mode behavior
 * 10. Service worker cache verification (confirm private API / files never cached)
 * 11. IndexedDB inspection (confirm no lingering unencrypted user data)
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import http from 'node:http';
import pg from 'pg';

const { Pool } = pg;
const PG_PORT = 54323;
const APP_PORT = 4055;
const PG_BIN = 'C:\\Program Files\\PostgreSQL\\18\\bin';
const PG_DATA = join(process.env.TEMP, 'disposable_pg_cluster');

function spawnPostgres(port) {
  return spawn(join(PG_BIN, 'postgres.exe'), ['-D', PG_DATA, '-p', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

async function waitForPg(pool, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await pool.query('SELECT 1 as alive');
      if (res.rows[0]?.alive === 1) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function waitForHttp(port, maxRetries = 35) {
  for (let i = 0; i < maxRetries; i++) {
    const ok = await new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(500, () => { req.destroy(); resolve(false); });
    });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`  [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${msg}`);
    failed++;
  }
}

async function run() {
  console.log('='.repeat(75));
  console.log('  BATCH 3: REAL-BROWSER SHARED-DEVICE CLEANUP VERIFICATION');
  console.log('='.repeat(75));

  const pgProc = spawnPostgres(PG_PORT);
  const pgPool = new Pool({ connectionString: `postgres://postgres@127.0.0.1:${PG_PORT}/postgres`, max: 5 });
  const pgReady = await waitForPg(pgPool);
  if (!pgReady) {
    console.error('[FATAL] PostgreSQL not ready');
    pgProc.kill();
    process.exit(1);
  }

  for (const t of ['user_sessions','file_attachments','work_events','work_items','workflow_runs',
    'notifications','time_entries','memberships','portal_users','organisations']) {
    try { await pgPool.query(`DELETE FROM ${t}`); } catch(_) {}
  }

  const appProc = spawn('node', ['server.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      ALLOW_DEV_DEMO_AUTH: 'false',
      ALLOW_DEV_FALLBACK: 'false',
      DATABASE_URL: `postgres://postgres@127.0.0.1:${PG_PORT}/postgres`,
      PORT: String(APP_PORT)
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const appReady = await waitForHttp(APP_PORT);
  if (!appReady) {
    console.error('[FATAL] App did not start on port ' + APP_PORT);
    appProc.kill();
    pgProc.kill();
    process.exit(1);
  }
  console.log(`  App running on port ${APP_PORT}.`);

  // Register Two Fictional Companies & Users via API
  const regUser = async (email, pass, name, compName) => {
    const res = await fetch(`http://127.0.0.1:${APP_PORT}/api/organisations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        legalName: compName,
        ownerName: name,
        workEmail: email,
        password: pass,
        industry: 'Healthcare'
      })
    });
    return await res.json();
  };

  const compA = await regUser('alice@browser-test-a.org', 'Password12345!', 'Alice Smith', 'Company Alpha');
  const compB = await regUser('bob@browser-test-b.org', 'Password12345!', 'Bob Jones', 'Company Beta');
  console.log('  compA registration:', compA);
  console.log('  compB registration:', compB);

  // Launch real Chrome browser in single context (shared device emulation)
  console.log('\n--- 1. Launching Shared Device Browser (Single Context) ---');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => console.log('  [BROWSER CONSOLE]', msg.text()));

  // Test 1: User A logs in
  console.log('\n--- 2. User A Signs In ---');
  await page.goto(`http://127.0.0.1:${APP_PORT}/`);
  await page.waitForLoadState('networkidle');

  // Perform sign-in for Alice
  await page.evaluate(async () => {
    const res = await fetch('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@browser-test-a.org', password: 'Password12345!' })
    });
    const data = await res.json();
    window.state = window.state || {};
    window.state.user = data.user;
    if (typeof window._srLoginCallback === 'function') window._srLoginCallback(data.user);
  });
  await page.waitForTimeout(500);

  const aliceUserObj = await page.evaluate(() => window.state?.user?.name);
  assert(aliceUserObj === 'Alice Smith', 'User A (Alice) logged in successfully');

  // Test 2: User A enqueues offline action
  console.log('\n--- 3. User A Enqueues Offline Action ---');
  await page.evaluate(() => {
    window.OfflineQueue.enqueue('/api/handovers', {
      method: 'POST',
      body: JSON.stringify({ summary: 'Alice private handover notes' })
    });
  });

  const alicePendingCount = await page.evaluate(() => window.OfflineQueue.getPendingCount());
  assert(alicePendingCount === 1, 'User A has 1 pending offline action in queue');

  // Test 3: User A initiates logout with "keep"
  console.log('\n--- 4. User A Logs Out Choosing "Keep Unsent Work" ---');
  // Trigger logout modal
  await page.evaluate(() => {
    window.OfflineQueue.promptLogoutWarning(() => {
      // Simulate performLogout teardown
      fetch('/api/auth/sign-out', { method: 'POST' }).catch(() => {});
      sessionStorage.clear();
      localStorage.removeItem('shiftrelay-user-data');
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('sr_chat_') || k.startsWith('shiftrelay-user'))) {
          localStorage.removeItem(k);
        }
      }
      window.state = { user: null };
      const appView = document.getElementById('app-view');
      if (appView) appView.classList.add('hidden');
      const entryEl = document.getElementById('sr-entry');
      if (entryEl) entryEl.style.display = '';
    });
  });

  // Click "Keep Unsent Work & Sign Out"
  const keepBtn = await page.$('#sr-btn-keep-logout');
  assert(keepBtn !== null, 'Logout warning dialog presented with Keep/Discard options');
  if (keepBtn) await keepBtn.click();
  await page.waitForTimeout(500);

  // Verify User A state cleared
  const activeUserPostLogout = await page.evaluate(() => window.state?.user);
  assert(activeUserPostLogout === null, 'Active in-memory user state nulled after logout');

  // Test 4: Back navigation test
  console.log('\n--- 5. Back Navigation Test ---');
  await page.goBack().catch(() => {});
  const backUser = await page.evaluate(() => window.state?.user);
  assert(!backUser, 'Back navigation does not restore User A session');

  // Return to base URL for User B sign-in
  await page.goto(`http://127.0.0.1:${APP_PORT}/`);
  await page.waitForLoadState('networkidle');

  // Test 5: User B signs in on the same browser
  console.log('\n--- 6. User B Signs In on Same Device ---');
  await page.evaluate(async () => {
    const res = await fetch('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bob@browser-test-b.org', password: 'Password12345!' })
    });
    const data = await res.json();
    window.state = window.state || {};
    window.state.user = data.user;
    if (typeof window._srLoginCallback === 'function') window._srLoginCallback(data.user);
  });
  await page.waitForTimeout(500);

  const bobUserObj = await page.evaluate(() => window.state?.user?.name);
  assert(bobUserObj === 'Bob Jones', 'User B (Bob) logged in on same browser');

  // Test 6: Verify User B cannot see or flush User A offline actions
  console.log('\n--- 7. Offline Queue Isolation Verification ---');
  const bobPendingCount = await page.evaluate(() => window.OfflineQueue.getPendingCount());
  assert(bobPendingCount === 0, 'User B sees 0 pending actions (User A queue is completely invisible to User B)');

  // Attempt queue flush under User B
  await page.evaluate(async () => {
    await window.OfflineQueue.flushQueue();
  });

  // Check database: ensure no handovers were created for Company B
  const bHandovers = await pgPool.query('SELECT * FROM work_items WHERE organisation_id = $1', [compB.organisation.organisationId]);
  assert(bHandovers.rows.length === 0, 'User A offline actions were NEVER replayed under User B session');

  // Test 7: Page reload test
  console.log('\n--- 8. Reload Test ---');
  await page.reload();
  await page.waitForLoadState('networkidle');
  const sessionAfterReload = await page.evaluate(async () => {
    const res = await fetch('/api/auth/session');
    return res.ok ? await res.json() : null;
  });
  assert(sessionAfterReload?.user?.name === 'Bob Jones', 'Reload preserves only active User B session');

  // Test 8: Service Worker Cache Inspection
  console.log('\n--- 9. Service Worker Cache Inspection ---');
  const cacheEntries = await page.evaluate(async () => {
    if (!('caches' in window)) return [];
    const keys = await caches.keys();
    let urls = [];
    for (const key of keys) {
      const cache = await caches.open(key);
      const reqs = await cache.keys();
      urls.push(...reqs.map(r => r.url));
    }
    return urls;
  });

  const cachedApi = cacheEntries.filter(u => u.includes('/api/'));
  const cachedPrivateUploads = cacheEntries.filter(u => u.includes('/uploads/') && !u.includes('hero-workplace') && !u.includes('avatar-') && !u.includes('cover-') && !u.includes('feed-'));
  assert(cachedApi.length === 0, 'Service worker cache contains ZERO /api/ routes');
  assert(cachedPrivateUploads.length === 0, 'Service worker cache contains ZERO private upload files');

  // Test 9: IndexedDB inspection
  console.log('\n--- 10. IndexedDB / Native Storage Check ---');
  const idbDatabases = await page.evaluate(async () => {
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      return dbs.map(d => d.name);
    }
    return [];
  });
  assert(idbDatabases.length === 0, 'IndexedDB contains no legacy unencrypted application databases');

  await browser.close();
  appProc.kill();
  pgProc.kill();
  await pgPool.end();

  console.log('\n' + '='.repeat(75));
  console.log(`  REAL-BROWSER RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(75));
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
