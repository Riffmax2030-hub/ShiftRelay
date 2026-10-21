/**
 * Batch 2A Verification Suite: Authentication Bypass Fix
 *
 * Validates:
 * 1. Startup rejection: NODE_ENV=production + ALLOW_DEV_DEMO_AUTH=true exits with code 1.
 * 2. In production with real PostgreSQL:
 *    - Demo-user header without session returns 401 on protected endpoints.
 *    - Invalid session + demo header returns 401.
 *    - Expired session + demo header returns 401.
 *    - Revoked session (after sign-out) + demo header returns 401.
 *    - Valid session works, and spoofed headers cannot alter identity or privileges.
 *    - Removed / inactive membership (status != 'active') returns 401 even with valid session token.
 *    - SSE access (/api/events) without session returns 401; query parameter (?user=...) rejected in prod.
 *    - Public routes remain accessible without session (/health, /api/config, /api/auth/sign-in, /api/organisations, etc.).
 *    - Remote toggle of demo mode (POST /api/config/demo-mode) returns 403 in production.
 *    - GET /api/time-entries?month=INVALID returns 400 validation error (user correction).
 * 3. In development mode with ALLOW_DEV_DEMO_AUTH=true:
 *    - Demo header works as intended for local development.
 */

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import http from 'node:http';
import pg from 'pg';

const { Pool } = pg;

const PG_PORT = 54323;
const APP_PORT = 4025;
const DEV_APP_PORT = 4026;
const PG_BIN = 'C:\\Program Files\\PostgreSQL\\18\\bin';
const PG_DATA = join(process.env.TEMP, 'disposable_pg_cluster');

function makeRequest(port, method, path, body = null, headers = {}) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (data) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(data);
    }
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders,
        timeout: 4000
      },
      (res) => {
        let respData = '';
        res.on('data', (c) => { respData += c; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(respData); } catch {}
          resolve({ status: res.statusCode, headers: res.headers, body: json || respData });
        });
      }
    );
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

async function waitForHttp(port, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await makeRequest(port, 'GET', '/health');
      if (res.status === 200) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function run() {
  console.log('='.repeat(75));
  console.log('  BATCH 2A: AUTHENTICATION BYPASS REMEDIATION TEST SUITE');
  console.log('='.repeat(75));

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
      failed++;
    }
  }

  // ── TEST 1: Startup Refusal of ALLOW_DEV_DEMO_AUTH in Production ──────────
  console.log('\n--- 1. Testing Production Startup Guard ---');
  {
    const proc = spawn('node', ['server.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        ALLOW_DEV_DEMO_AUTH: 'true',
        PORT: '4099'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d; });

    const exitCode = await new Promise((resolve) => {
      proc.on('close', resolve);
      setTimeout(() => { proc.kill(); resolve(-1); }, 4000);
    });

    assert(
      exitCode === 1 && stderr.includes('ALLOW_DEV_DEMO_AUTH must not be set in NODE_ENV=production'),
      'Production startup exits with code 1 and fatal log when ALLOW_DEV_DEMO_AUTH=true',
      `Exit: ${exitCode}, Stderr: ${stderr.trim()}`
    );
  }

  // ── Setup Real PostgreSQL Cluster & Test Schema ───────────────────────────
  console.log('\n--- 2. Starting Disposable PostgreSQL Cluster ---');
  const pgProc = spawnPostgres(PG_PORT);
  const pgPool = new Pool({
    connectionString: `postgres://postgres@127.0.0.1:${PG_PORT}/postgres`,
    max: 5
  });

  const pgReady = await waitForPg(pgPool);
  if (!pgReady) {
    console.error('[FATAL] Could not connect to PostgreSQL on port ' + PG_PORT);
    pgProc.kill();
    process.exit(1);
  }
  console.log('  PostgreSQL 18 is running and responding to queries.');

  // Clean test tables
  await pgPool.query('DELETE FROM user_sessions');
  await pgPool.query('DELETE FROM memberships');
  await pgPool.query('DELETE FROM portal_users');
  await pgPool.query('DELETE FROM organisations');

  // ── Start Production ShiftRelay App ───────────────────────────────────────
  console.log('\n--- 3. Starting Production ShiftRelay Instance ---');
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
    console.error('[FATAL] ShiftRelay app did not start on port ' + APP_PORT);
    appProc.kill();
    pgProc.kill();
    process.exit(1);
  }
  console.log(`  ShiftRelay production server running on port ${APP_PORT}.`);

  // ── Seed Fictional Test Organisation & Users ──────────────────────────────
  console.log('\n--- 4. Registering Fictional Organisation & Worker ---');
  const regRes = await makeRequest(APP_PORT, 'POST', '/api/organisations', {
    legalName: 'Apex Health Ltd',
    ownerName: 'Dr Alice Vance',
    workEmail: 'alice@apexhealth.test',
    password: 'Password12345!',
    industry: 'Healthcare'
  });

  assert(regRes.status === 201, 'Fictional organisation registered via POST /api/organisations', `Status: ${regRes.status}`);
  const aliceCookie = regRes.headers['set-cookie']?.[0]?.split(';')[0];
  const aliceSessionId = aliceCookie?.replace('shiftrelay_session=', '');
  const aliceMembershipId = regRes.body.user.id;
  const orgCode = regRes.body.organisation.organisationCode;

  // Enrol a worker: Bob
  const enrolRes = await makeRequest(APP_PORT, 'POST', '/api/organisation-memberships', {
    organisationCode: orgCode,
    fullName: 'Bob Smith',
    email: 'bob@apexhealth.test',
    position: 'Staff Nurse',
    password: 'Password12345!'
  });
  assert(enrolRes.status === 201, 'Worker enrolled via POST /api/organisation-memberships', `Status: ${enrolRes.status}`);
  const bobMembershipId = enrolRes.body.membership.membershipId;

  // Approve Bob so status becomes 'active'
  await pgPool.query("UPDATE memberships SET status = 'active', role = 'incoming' WHERE id = $1", [bobMembershipId]);

  // Sign in as Bob
  const bobLoginRes = await makeRequest(APP_PORT, 'POST', '/api/auth/sign-in', {
    email: 'bob@apexhealth.test',
    password: 'Password12345!'
  });
  assert(bobLoginRes.status === 200, 'Bob signed in via POST /api/auth/sign-in', `Status: ${bobLoginRes.status}`);
  const bobCookie = bobLoginRes.headers['set-cookie']?.[0]?.split(';')[0];
  const bobSessionId = bobCookie?.replace('shiftrelay_session=', '');

  // ── TEST SUITE EXECUTION ──────────────────────────────────────────────────
  console.log('\n--- 5. Executing Authentication Bypass Tests ---');

  // Scenario A: Demo-user header without session
  {
    const res = await makeRequest(APP_PORT, 'GET', '/api/workflow-templates', null, {
      'x-shiftrelay-user': '00000000-0000-4000-8000-000000000014'
    });
    assert(
      res.status === 401 && res.body?.error === 'Authentication required. Please sign in.',
      'Demo-user header WITHOUT session cannot access protected endpoint (GET /api/workflow-templates)',
      `Status: ${res.status}, body: ${JSON.stringify(res.body)}`
    );

    const sessionRes = await makeRequest(APP_PORT, 'GET', '/api/auth/session', null, {
      'x-shiftrelay-user': '00000000-0000-4000-8000-000000000014'
    });
    assert(
      sessionRes.status === 401,
      'Demo-user header WITHOUT session cannot access /api/auth/session',
      `Status: ${sessionRes.status}`
    );
  }

  // Scenario B: Invalid session token with demo-user header
  {
    const res = await makeRequest(APP_PORT, 'GET', '/api/workflow-templates', null, {
      Cookie: 'shiftrelay_session=bogus-invalid-token-9999',
      'x-shiftrelay-user': '00000000-0000-4000-8000-000000000014'
    });
    assert(
      res.status === 401 && res.body?.error === 'Authentication required. Please sign in.',
      'Invalid session token with demo header is rejected (does NOT fall through)',
      `Status: ${res.status}`
    );
  }

  // Scenario C: Expired session token with demo-user header
  {
    const expiredSessionId = crypto.randomUUID();
    await pgPool.query(
      "INSERT INTO user_sessions (id, user_id, membership_id, expires_at) VALUES ($1, $2, $3, now() - interval '2 hours')",
      [expiredSessionId, aliceMembershipId, aliceMembershipId]
    );

    const res = await makeRequest(APP_PORT, 'GET', '/api/workflow-templates', null, {
      Cookie: `shiftrelay_session=${expiredSessionId}`,
      'x-shiftrelay-user': '00000000-0000-4000-8000-000000000014'
    });
    assert(
      res.status === 401 && res.body?.error === 'Authentication required. Please sign in.',
      'Expired session token with demo header is rejected (does NOT fall through)',
      `Status: ${res.status}`
    );
  }

  // Scenario D: Revoked session token (after sign-out) with demo-user header
  {
    // Create temporary worker session to revoke
    const tempLoginRes = await makeRequest(APP_PORT, 'POST', '/api/auth/sign-in', {
      email: 'bob@apexhealth.test',
      password: 'Password12345!'
    });
    const tempCookie = tempLoginRes.headers['set-cookie']?.[0]?.split(';')[0];
    const tempSessionId = tempCookie?.replace('shiftrelay_session=', '');

    // Sign out to revoke
    const signOutRes = await makeRequest(APP_PORT, 'POST', '/api/auth/sign-out', {}, {
      Cookie: tempCookie
    });
    assert(signOutRes.status === 200, 'Session successfully revoked via POST /api/auth/sign-out');

    // Confirm DB row is deleted
    const dbCheck = await pgPool.query('SELECT id FROM user_sessions WHERE id = $1', [tempSessionId]);
    assert(dbCheck.rows.length === 0, 'Revoked session row deleted from user_sessions table');

    // Attempt request with revoked session + demo header
    const postSignOutRes = await makeRequest(APP_PORT, 'GET', '/api/workflow-templates', null, {
      Cookie: tempCookie,
      'x-shiftrelay-user': '00000000-0000-4000-8000-000000000014'
    });
    assert(
      postSignOutRes.status === 401,
      'Revoked session with demo header is rejected with 401',
      `Status: ${postSignOutRes.status}`
    );
  }

  // Scenario E: Valid session works & spoofed headers cannot change identity or privileges
  {
    // Request with Bob's valid session, but attempting to spoof owner ID and role in headers
    const res = await makeRequest(APP_PORT, 'GET', '/api/auth/session', null, {
      Cookie: bobCookie,
      'x-forwarded-for': '10.0.0.50',
      'x-shiftrelay-user': aliceMembershipId,
      'x-shiftrelay-role': 'owner'
    });
    assert(
      res.status === 200,
      'Valid session authenticates successfully (HTTP 200)',
      `Status: ${res.status}, body: ${JSON.stringify(res.body)}`
    );
    assert(
      res.body?.user?.id === bobMembershipId && res.body?.user?.role === 'incoming',
      'Identity resolves strictly from database session (Bob, role: incoming), ignoring spoofed headers',
      `Expected user id: ${bobMembershipId}, got: ${res.body?.user?.id}, role: ${res.body?.user?.role}`
    );
  }

  // Scenario F: Inactive or pending membership grants no company access
  {
    // Set Bob's membership to 'inactive'
    await pgPool.query("UPDATE memberships SET status = 'inactive' WHERE id = $1", [bobMembershipId]);

    const inactiveRes = await makeRequest(APP_PORT, 'GET', '/api/time-entries', null, {
      Cookie: bobCookie
    });
    assert(
      inactiveRes.status === 401,
      'Inactive membership (status = inactive) returns 401 on protected endpoint despite valid session',
      `Status: ${inactiveRes.status}`
    );

    // Set Bob's membership to 'pending_approval'
    await pgPool.query("UPDATE memberships SET status = 'pending_approval' WHERE id = $1", [bobMembershipId]);

    const pendingRes = await makeRequest(APP_PORT, 'GET', '/api/time-entries', null, {
      Cookie: bobCookie
    });
    assert(
      pendingRes.status === 401,
      'Pending membership (status = pending_approval) returns 401 on protected endpoint',
      `Status: ${pendingRes.status}`
    );

    // Restore Bob to active for subsequent tests
    await pgPool.query("UPDATE memberships SET status = 'active' WHERE id = $1", [bobMembershipId]);
  }

  // Scenario G: Unauthenticated SSE access rejected; query parameter spoofing rejected
  {
    const sseNoAuth = await makeRequest(APP_PORT, 'GET', '/api/events');
    assert(
      sseNoAuth.status === 401 && sseNoAuth.body?.error === 'Authentication required. Please sign in.',
      'Unauthenticated SSE request (GET /api/events) returns 401',
      `Status: ${sseNoAuth.status}`
    );

    const sseQueryParam = await makeRequest(APP_PORT, 'GET', '/api/events?user=outgoing');
    assert(
      sseQueryParam.status === 401,
      'SSE request with ?user=outgoing without session returns 401 in production',
      `Status: ${sseQueryParam.status}`
    );

    const sseHeader = await makeRequest(APP_PORT, 'GET', '/api/events', null, {
      'x-shiftrelay-user': aliceMembershipId
    });
    assert(
      sseHeader.status === 401,
      'SSE request with x-shiftrelay-user header without session returns 401 in production',
      `Status: ${sseHeader.status}`
    );
  }

  // Scenario H: Public routes remain accessible without session
  {
    const health = await makeRequest(APP_PORT, 'GET', '/health');
    assert(health.status === 200, 'GET /health is publicly accessible without session');

    const config = await makeRequest(APP_PORT, 'GET', '/api/config');
    assert(config.status === 200 && config.body?.demoMode === false, 'GET /api/config is public and reports demoMode: false in production');

    const demoModeToggle = await makeRequest(APP_PORT, 'POST', '/api/config/demo-mode', { demoMode: true });
    assert(demoModeToggle.status === 403, 'POST /api/config/demo-mode returns 403 Forbidden in production');

    const signInBad = await makeRequest(APP_PORT, 'POST', '/api/auth/sign-in', { email: 'bad@test.test', password: 'bad' }, { 'x-forwarded-for': '10.0.0.80' });
    assert(
      signInBad.status === 401 && signInBad.body?.error === 'Invalid email or password.',
      'POST /api/auth/sign-in is accessible (returns credentials error, not route guard error)',
      `Status: ${signInBad.status}, body: ${JSON.stringify(signInBad.body)}`
    );

    const orgBad = await makeRequest(APP_PORT, 'POST', '/api/organisations', {}, { 'x-forwarded-for': '10.0.0.81' });
    assert(
      orgBad.status === 400,
      'POST /api/organisations is accessible without session (returns 400 validation error)',
      `Status: ${orgBad.status}, body: ${JSON.stringify(orgBad.body)}`
    );
  }

  // Scenario I: Correction verification — GET /api/time-entries?month=INVALID returns 400
  {
    const invalidMonthRes = await makeRequest(APP_PORT, 'GET', '/api/time-entries?month=NOT_A_MONTH', null, {
      Cookie: aliceCookie
    });
    assert(
      invalidMonthRes.status === 400 && invalidMonthRes.body?.error === 'Invalid month format. Expected YYYY-MM.',
      'GET /api/time-entries?month=NOT_A_MONTH returns HTTP 400 validation error (not 500)',
      `Status: ${invalidMonthRes.status}, body: ${JSON.stringify(invalidMonthRes.body)}`
    );

    const validMonthRes = await makeRequest(APP_PORT, 'GET', '/api/time-entries?month=2026-10', null, {
      Cookie: aliceCookie
    });
    assert(
      validMonthRes.status === 200,
      'GET /api/time-entries?month=2026-10 returns HTTP 200 with valid month',
      `Status: ${validMonthRes.status}`
    );
  }

  // Shut down production app and PG
  appProc.kill();
  pgPool.end();
  pgProc.kill();

  // ── Scenario J: Development fallback with ALLOW_DEV_DEMO_AUTH=true ────────
  console.log('\n--- 6. Testing Explicit Development Demo Auth Support ---');
  {
    const devApp = spawn('node', ['server.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'development',
        ALLOW_DEV_FALLBACK: 'true',
        ALLOW_DEV_DEMO_AUTH: 'true',
        DATABASE_URL: '', // No database
        PORT: String(DEV_APP_PORT)
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const devReady = await waitForHttp(DEV_APP_PORT);
    assert(devReady, 'Server starts in development mode with ALLOW_DEV_DEMO_AUTH=true & ALLOW_DEV_FALLBACK=true');

    if (devReady) {
      // In development with explicit demo auth, demo header is accepted
      const devRes = await makeRequest(DEV_APP_PORT, 'GET', '/api/auth/session', null, {
        'x-shiftrelay-user': '00000000-0000-4000-8000-000000000014'
      });
      assert(
        devRes.status === 200 && devRes.body?.user?.name === 'Jordan Lee',
        'In development mode with ALLOW_DEV_DEMO_AUTH=true, demo header resolves demo user',
        `Status: ${devRes.status}, user: ${devRes.body?.user?.name}`
      );
    }

    devApp.kill();
  }

  console.log('\n' + '='.repeat(75));
  console.log(`  BATCH 2A RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(75));

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Fatal error in test runner:', err);
  process.exit(1);
});
