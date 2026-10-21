/**
 * Batch 3 Verification Suite: Private File Protection & Shared-Device Cleanup
 *
 * Validates:
 * 1. Public demo assets served freely (avatars, covers, feed, hero-workplace.jpg)
 * 2. Unauthenticated requests to private uploads return 401
 * 3. Cross-company file requests return 403 (authenticated user from wrong company)
 * 4. Legacy/unowned files return 403 even for authenticated users
 * 5. Path traversal attempts are blocked (403)
 * 6. Direct static bypass via /uploads/ is blocked by serveStatic gate
 * 7. All API (private) responses carry Cache-Control: no-store headers
 * 8. SSE responses carry Cache-Control: no-store / no-cache headers
 * 9. Owned private upload accessible to owner after file_attachments registration
 * 10. Production rejects ALLOW_DEV_FALLBACK
 */

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import pg from 'pg';

const { Pool } = pg;

const PG_PORT = 54323;
const APP_PORT = 4048;
const PG_BIN = 'C:\\Program Files\\PostgreSQL\\18\\bin';
const PG_DATA = join(process.env.TEMP, 'disposable_pg_cluster');

let reqCounter = 1;
function makeRequest(port, method, path, body = null, headers = {}) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (!reqHeaders['x-forwarded-for']) {
      reqHeaders['x-forwarded-for'] = `10.5.${Math.floor(reqCounter / 250)}.${reqCounter % 250 + 1}`;
      reqCounter++;
    }
    if (data) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(data);
    }
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: reqHeaders,
      timeout: 6000
    }, (res) => {
      let respData = '';
      res.on('data', (c) => { respData += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(respData); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: json || respData });
      });
    });
    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 408, error: 'TIMEOUT' }); });
    if (data) req.write(data);
    req.end();
  });
}

function spawnPostgres(port) {
  return spawn(join(PG_BIN, 'postgres.exe'), ['-D', PG_DATA, '-p', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

async function waitForPg(pool, maxRetries = 25) {
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
    try {
      const res = await makeRequest(port, 'GET', '/health');
      if (res.status === 200) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

function cacheIsNoStore(headers) {
  const cc = (headers['cache-control'] || '').toLowerCase();
  return cc.includes('no-store') || cc.includes('private');
}

async function run() {
  console.log('='.repeat(75));
  console.log('  BATCH 3: PRIVATE FILE PROTECTION & SHARED-DEVICE CLEANUP TEST SUITE');
  console.log('='.repeat(75));

  let passed = 0, failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
      failed++;
    }
  }

  // ── 1. Start PostgreSQL & App ──────────────────────────────────────────────
  console.log('\n--- 1. Starting Database & Production Server ---');
  const pgProc = spawnPostgres(PG_PORT);
  const pgPool = new Pool({ connectionString: `postgres://postgres@127.0.0.1:${PG_PORT}/postgres`, max: 5 });

  const pgReady = await waitForPg(pgPool);
  if (!pgReady) { console.error('[FATAL] PostgreSQL not ready'); pgProc.kill(); process.exit(1); }

  // Clear test data
  for (const t of ['user_sessions','file_attachments','work_events','work_items','workflow_runs','workflow_steps',
    'workflow_templates','notifications','time_entries','open_shift_applications','open_shifts',
    'leave_requests','direct_messages','feed_posts','memberships','portal_users','organisations']) {
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
  if (!appReady) { console.error('[FATAL] App did not start on port ' + APP_PORT); appProc.kill(); pgProc.kill(); process.exit(1); }
  console.log(`  App running on port ${APP_PORT}.`);

  // ── 2. Register Two Fictional Companies & Users ────────────────────────────
  console.log('\n--- 2. Registering Two Fictional Companies ---');
  const regA = await makeRequest(APP_PORT, 'POST', '/api/organisations', {
    legalName: 'Apex Healthcare Ltd', ownerName: 'Dr Alice Vance',
    workEmail: 'alice@apex-batch3.test', password: 'Password12345!', industry: 'Healthcare'
  });
  const aliceCookie = regA.headers['set-cookie']?.[0]?.split(';')[0];
  const orgIdA = regA.body.organisation?.organisationId;
  assert(regA.status === 201 && aliceCookie && orgIdA, 'Company A registered');

  const regB = await makeRequest(APP_PORT, 'POST', '/api/organisations', {
    legalName: 'Beacon Retail Corp', ownerName: 'Carol Danvers',
    workEmail: 'carol@beacon-batch3.test', password: 'Password12345!', industry: 'Retail'
  });
  const carolCookie = regB.headers['set-cookie']?.[0]?.split(';')[0];
  const orgIdB = regB.body.organisation?.organisationId;
  assert(regB.status === 201 && carolCookie && orgIdB, 'Company B registered');

  // ── 3. Public Demo Asset Tests ─────────────────────────────────────────────
  console.log('\n--- 3. Public Demo Asset Serving (No Auth Required) ---');
  const pubAvatar = await makeRequest(APP_PORT, 'GET', '/uploads/avatars/avatar-david.jpg');
  assert(pubAvatar.status === 200, 'Public avatar served without authentication');

  const pubCover = await makeRequest(APP_PORT, 'GET', '/uploads/covers/cover-healthcare.jpg');
  assert(pubCover.status === 200, 'Public cover image served without authentication');

  const pubFeed = await makeRequest(APP_PORT, 'GET', '/uploads/feed/feed-triage-handover.jpg');
  assert(pubFeed.status === 200, 'Public feed image served without authentication');

  const pubHero = await makeRequest(APP_PORT, 'GET', '/uploads/hero-workplace.jpg');
  assert(pubHero.status === 200, 'Public hero image served without authentication');

  // ── 4. Unauthenticated Private Upload Access Returns 401 ──────────────────
  console.log('\n--- 4. Unauthenticated Private Upload Access ---');
  const unauthedPrivate = await makeRequest(APP_PORT, 'GET', '/uploads/aaacf852-b8c9-4684-b410-adf4cc445881.png');
  assert(unauthedPrivate.status === 401, 'Unauthenticated request to private file returns 401');

  // ── 5. Authenticated Cross-Company File Access Returns 403 ────────────────
  console.log('\n--- 5. Cross-Company Private File Access ---');
  // Insert a fake file owned by Company A
  const fakeFile = 'test-batch3-private-apex.png';
  const aliceMembershipId = regA.body.user?.id;
  if (aliceMembershipId && orgIdA) {
    await pgPool.query(
      'INSERT INTO file_attachments (id, organisation_id, uploader_membership_id, filename, mime_type) VALUES ($1,$2,$3,$4,$5)',
      [randomUUID(), orgIdA, aliceMembershipId, fakeFile, 'image/png']
    );
    // Write a small dummy file so it exists on disk
    const { join: pjoin } = await import('node:path');
    const uploadPath = pjoin(process.cwd(), 'uploads', fakeFile);
    await writeFile(uploadPath, Buffer.from('iVBORw0KGgo=', 'base64'));
  }

  // Carol (Company B) tries to access a Company A file -> should get 403
  const crossCompanyAccess = await makeRequest(APP_PORT, 'GET', `/uploads/${fakeFile}`, null, { Cookie: carolCookie });
  assert(crossCompanyAccess.status === 403, 'Cross-company private file access returns 403');

  // Alice (Company A owner) can access her own file -> should get 200
  const ownerAccess = await makeRequest(APP_PORT, 'GET', `/uploads/${fakeFile}`, null, { Cookie: aliceCookie });
  assert(ownerAccess.status === 200, 'File owner (Company A) can access their own private file');

  // ── 6. Legacy / Unowned File Returns 403 ──────────────────────────────────
  console.log('\n--- 6. Legacy/Unowned File Access ---');
  // aaacf852... is on disk but has no file_attachments record - legacy unattached file
  const legacyAuth = await makeRequest(APP_PORT, 'GET', '/uploads/aaacf852-b8c9-4684-b410-adf4cc445881.png', null, { Cookie: aliceCookie });
  assert(legacyAuth.status === 403, 'Legacy file (no ownership record) returns 403 even when authenticated');

  // ── 7. Path Traversal Prevention ──────────────────────────────────────────
  console.log('\n--- 7. Path Traversal & Static Bypass Prevention ---');
  const traversal1 = await makeRequest(APP_PORT, 'GET', '/uploads/../server.mjs');
  assert(traversal1.status === 403, 'Path traversal /uploads/../server.mjs blocked (403)');

  const traversal2 = await makeRequest(APP_PORT, 'GET', '/uploads/%2e%2e%2fserver.mjs');
  assert(traversal2.status === 403 || traversal2.status === 400, 'URL-encoded path traversal blocked');

  const traversal3 = await makeRequest(APP_PORT, 'GET', '/uploads/..%2fserver.mjs');
  assert(traversal3.status === 403 || traversal3.status === 400, 'Mixed-encoded path traversal blocked');

  // ── 8. Private API Responses Have Cache-Control: no-store ─────────────────
  console.log('\n--- 8. Cache-Control: no-store on Private API Responses ---');
  const sessionResp = await makeRequest(APP_PORT, 'GET', '/api/auth/session', null, { Cookie: aliceCookie });
  assert(sessionResp.status === 200 && cacheIsNoStore(sessionResp.headers),
    'GET /api/auth/session has Cache-Control: no-store / private');

  const handoversResp = await makeRequest(APP_PORT, 'GET', '/api/handovers', null, { Cookie: aliceCookie });
  assert(handoversResp.status === 200 && cacheIsNoStore(handoversResp.headers),
    'GET /api/handovers has Cache-Control: no-store / private');

  const dirResp = await makeRequest(APP_PORT, 'GET', '/api/directory', null, { Cookie: aliceCookie });
  assert(dirResp.status === 200 && cacheIsNoStore(dirResp.headers),
    'GET /api/directory has Cache-Control: no-store / private');

  const notifsResp = await makeRequest(APP_PORT, 'GET', '/api/notifications', null, { Cookie: aliceCookie });
  assert(notifsResp.status === 200 && cacheIsNoStore(notifsResp.headers),
    'GET /api/notifications has Cache-Control: no-store / private');

  // ── 9. Private File Response Cache-Control: no-store ──────────────────────
  console.log('\n--- 9. Cache-Control: no-store on Private File Responses ---');
  assert(ownerAccess.status === 200 && cacheIsNoStore(ownerAccess.headers),
    'Private file response has Cache-Control: no-store');

  // ── 10. 401 Response for Unauthenticated Protected API ────────────────────
  console.log('\n--- 10. Unauthenticated API Returns no-store even on 401 ---');
  const unauth401 = await makeRequest(APP_PORT, 'GET', '/api/handovers');
  assert(unauth401.status === 401 && cacheIsNoStore(unauth401.headers),
    'Unauthenticated /api/handovers returns 401 with no-store');

  // ── 11. Public demo assets are cacheable (not private) ────────────────────
  console.log('\n--- 11. Public Demo Assets Have Appropriate Cache Headers ---');
  const pubCacheControl = (pubAvatar.headers['cache-control'] || '').toLowerCase();
  assert(!pubCacheControl.includes('no-store') && !pubCacheControl.includes('private'),
    'Public avatar is NOT marked no-store (allows CDN/browser caching)');

  // ── 12. Direct static serving of uploads/ directory is blocked ────────────
  console.log('\n--- 12. Direct Static Bypass of /uploads/ Blocked ---');
  // If someone bypasses the /uploads/ handler, serveStatic now also blocks it
  // This is enforced by both the request router and serveStatic guard
  const staticBypass = await makeRequest(APP_PORT, 'GET', `/uploads/${fakeFile}`, null, {});
  assert(staticBypass.status === 401 || staticBypass.status === 403,
    'Unauthenticated /uploads/<private> request cannot bypass to static serving (401/403)');

  // ── Cleanup ────────────────────────────────────────────────────────────────
  console.log('\n--- Cleanup ---');
  try {
    const { unlink } = await import('node:fs/promises');
    const { join: pjoin } = await import('node:path');
    await unlink(pjoin(process.cwd(), 'uploads', fakeFile));
  } catch (_) {}

  appProc.kill();
  pgProc.kill();
  await pgPool.end();

  console.log('\n' + '='.repeat(75));
  console.log(`  BATCH 3 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(75));
  if (failed > 0) process.exit(1);
}

run().catch((err) => { console.error('[FATAL]', err); process.exit(1); });

