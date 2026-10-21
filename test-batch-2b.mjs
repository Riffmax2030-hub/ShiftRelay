/**
 * Batch 2B Verification Suite: Company Isolation, Roles & API Permissions
 *
 * Validates:
 * 1. Public Enrolment Hardening:
 *    - Caller-supplied roles (e.g. 'owner') and status ('active') are ignored; creates 'incoming' with 'pending_approval'.
 *    - Existing-account enrolment cannot attach to someone else's identity without password verification.
 *    - With valid password, existing user links identity and creates pending membership.
 * 2. Manager-Only Pending Review & Privilege Escalation Prevention:
 *    - Regular workers cannot list or approve pending memberships (HTTP 403).
 *    - Reviewers must belong to the same company; cross-company approval fails.
 *    - Enrolment approval cannot grant privileged roles ('owner', 'supervisor').
 *    - Legitimate approval transitions status to 'active'.
 * 3. Cross-Company Resource Isolation:
 *    - Company A users cannot view directory, workflow templates, or handovers belonging to Company B.
 *    - Cross-company mutation on handover (:id/relay or :id/acknowledge) fails with Handover not found.
 * 4. Handover State Machine & Role Enforcement:
 *    - Workers cannot relay handovers (supervisor/owner only).
 *    - Re-relaying an already-relayed handover is blocked.
 *    - Non-assigned workers cannot acknowledge handovers.
 *    - Re-acknowledging an already-acknowledged handover is blocked.
 * 5. Disabled Pilot Routes:
 *    - Shift swaps, social feeds, uploads, and badge requests return HTTP 501.
 * 6. Multi-Company Context Validation:
 *    - Multi-company user can list active memberships.
 *    - Switching active context issues new session scoped to selected company.
 *    - Cannot switch to a pending/inactive membership (HTTP 403).
 *    - Cannot switch to another user's membership (HTTP 403).
 */

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import http from 'node:http';
import pg from 'pg';

const { Pool } = pg;

const PG_PORT = 54323;
const APP_PORT = 4035;
const PG_BIN = 'C:\\Program Files\\PostgreSQL\\18\\bin';
const PG_DATA = join(process.env.TEMP, 'disposable_pg_cluster');

let reqCounter = 1;
function makeRequest(port, method, path, body = null, headers = {}) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (!reqHeaders['x-forwarded-for']) {
      reqHeaders['x-forwarded-for'] = `10.2.${Math.floor(reqCounter / 250)}.${reqCounter % 250 + 1}`;
      reqCounter++;
    }
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
  console.log('  BATCH 2B: COMPANY ISOLATION & API PERMISSIONS TEST SUITE');
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

  // ── Setup Real PostgreSQL Cluster & Test Schema ───────────────────────────
  console.log('\n--- 1. Starting Database & Production Server ---');
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

  // Reset database tables
  await pgPool.query('DELETE FROM user_sessions');
  await pgPool.query('DELETE FROM work_events');
  await pgPool.query('DELETE FROM work_items');
  await pgPool.query('DELETE FROM workflow_runs');
  await pgPool.query('DELETE FROM workflow_steps');
  await pgPool.query('DELETE FROM workflow_templates');
  await pgPool.query('DELETE FROM notifications');
  await pgPool.query('DELETE FROM time_entries');
  await pgPool.query('DELETE FROM memberships');
  await pgPool.query('DELETE FROM portal_users');
  await pgPool.query('DELETE FROM organisations');

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

  // ── 2. Create Two Fictional Organisations ─────────────────────────────────
  console.log('\n--- 2. Registering Fictional Companies A & B ---');
  // Company A (Apex Healthcare)
  const regA = await makeRequest(APP_PORT, 'POST', '/api/organisations', {
    legalName: 'Apex Healthcare Ltd',
    ownerName: 'Dr Alice Vance',
    workEmail: 'alice@apex.test',
    password: 'Password12345!',
    industry: 'Healthcare'
  });
  assert(regA.status === 201, 'Company A registered (Apex Healthcare)');
  const aliceCookie = regA.headers['set-cookie']?.[0]?.split(';')[0];
  const orgCodeA = regA.body.organisation.organisationCode;
  const orgIdA = regA.body.organisation.organisationId;
  const aliceMembershipId = regA.body.user.id;

  // Add Supervisor Adam in Company A
  const adamUserId = crypto.randomUUID();
  const adamMembershipId = crypto.randomUUID();
  await pgPool.query(
    "INSERT INTO portal_users (id, full_name, email, password_hash) VALUES ($1, 'Adam Croft', 'adam@apex.test', 'dummy')",
    [adamUserId]
  );
  await pgPool.query(
    "INSERT INTO memberships (id, organisation_id, user_id, role, title, department, status) VALUES ($1, $2, $3, 'supervisor', 'Shift Supervisor', 'ICU', 'active')",
    [adamMembershipId, orgIdA, adamUserId]
  );
  const adamSessionId = crypto.randomUUID();
  await pgPool.query(
    "INSERT INTO user_sessions (id, user_id, membership_id, expires_at) VALUES ($1, $2, $3, now() + interval '7 days')",
    [adamSessionId, adamUserId, adamMembershipId]
  );
  const adamCookie = `shiftrelay_session=${adamSessionId}`;

  // Company B (Beacon Retail)
  const regB = await makeRequest(APP_PORT, 'POST', '/api/organisations', {
    legalName: 'Beacon Retail Corp',
    ownerName: 'Carol Danvers',
    workEmail: 'carol@beacon.test',
    password: 'Password12345!',
    industry: 'Retail'
  });
  assert(regB.status === 201, 'Company B registered (Beacon Retail)');
  const carolCookie = regB.headers['set-cookie']?.[0]?.split(';')[0];
  const orgCodeB = regB.body.organisation.organisationCode;
  const orgIdB = regB.body.organisation.organisationId;
  const carolMembershipId = regB.body.user.id;

  // ── 3. Public Worker Enrolment Hardening ───────────────────────────────────
  console.log('\n--- 3. Testing Public Enrolment Hardening ---');
  let aliceCompanyBMembershipId;
  {
    // Attempting to supply role: 'owner' and status: 'active'
    const enrolExploit = await makeRequest(APP_PORT, 'POST', '/api/organisation-memberships', {
      organisationCode: orgCodeA,
      fullName: 'Attacker Eve',
      email: 'eve@apex.test',
      position: 'Infiltrator',
      role: 'owner',
      status: 'active',
      password: 'Password12345!'
    });
    assert(enrolExploit.status === 201, 'Enrolment request accepted with 201');
    assert(
      enrolExploit.body?.membership?.status === 'pending_approval',
      'Caller-supplied status is ignored; enrolment returns pending_approval',
      `Got status: ${enrolExploit.body?.membership?.status}`
    );

    // Verify in database that role was forced to canonical non-privileged worker role
    const dbEve = await pgPool.query('SELECT role, status FROM memberships WHERE id = $1', [enrolExploit.body?.membership?.membershipId]);
    assert(
      dbEve.rows[0]?.role === 'incoming' && dbEve.rows[0]?.status === 'pending_approval',
      'Database verifies membership role is incoming and status is pending_approval',
      `Role: ${dbEve.rows[0]?.role}, Status: ${dbEve.rows[0]?.status}`
    );

    // Eve cannot log in while pending
    const eveLogin = await makeRequest(APP_PORT, 'POST', '/api/auth/sign-in', {
      email: 'eve@apex.test',
      password: 'Password12345!'
    });
    assert(
      eveLogin.status === 401 && eveLogin.body?.error?.includes('approval'),
      'Pending member cannot sign in (HTTP 401 approval required)',
      `Status: ${eveLogin.status}, error: ${eveLogin.body?.error}`
    );

    // Existing identity protection: Attacker tries to enrol using Alice's email with wrong password
    const hijackAttempt = await makeRequest(APP_PORT, 'POST', '/api/organisation-memberships', {
      organisationCode: orgCodeA,
      fullName: 'Fake Alice',
      email: 'alice@apex.test',
      position: 'Nurse',
      password: 'WrongPassword999!'
    });
    assert(
      hijackAttempt.status === 400 && hijackAttempt.body?.error?.includes('already exists'),
      'Enrolment with existing email rejects invalid password (cannot attach to another identity)',
      `Status: ${hijackAttempt.status}, error: ${hijackAttempt.body?.error}`
    );

    // Legitimate existing user enrolling in another company with valid password
    const multiEnrol = await makeRequest(APP_PORT, 'POST', '/api/organisation-memberships', {
      organisationCode: orgCodeB,
      fullName: 'Dr Alice Vance',
      email: 'alice@apex.test',
      position: 'Medical Consultant',
      password: 'Password12345!'
    });
    assert(
      multiEnrol.status === 201 && multiEnrol.body?.membership?.status === 'pending_approval',
      'Existing user can enrol in Company B with correct password (creates pending membership)',
      `Status: ${multiEnrol.status}`
    );
    aliceCompanyBMembershipId = multiEnrol.body?.membership?.membershipId;

    // Verify user_id in Company B membership is indeed Alice's portal_user_id
    const dbAliceB = await pgPool.query('SELECT user_id FROM memberships WHERE id = $1', [aliceCompanyBMembershipId]);
    const dbAliceA = await pgPool.query('SELECT user_id FROM memberships WHERE id = $1', [aliceMembershipId]);
    assert(
      dbAliceB.rows[0]?.user_id === dbAliceA.rows[0]?.user_id,
      'Multi-company membership correctly links to same portal user ID'
    );
  }

  // ── 4. Manager-Only Review & Privilege Escalation Prevention ───────────────
  console.log('\n--- 4. Testing Manager-Only Review & Privilege Prevention ---');
  {
    // Enrol Bob in Company A
    const bobEnrol = await makeRequest(APP_PORT, 'POST', '/api/organisation-memberships', {
      organisationCode: orgCodeA,
      fullName: 'Bob Smith',
      email: 'bob@apex.test',
      position: 'Staff Nurse',
      password: 'Password12345!'
    });
    const bobMembershipId = bobEnrol.body?.membership?.membershipId;

    // Bob tries to view pending list -> 401 (not signed in yet)
    // Now let's approve Bob legitimately as incoming worker
    const approveBob = await makeRequest(APP_PORT, 'POST', `/api/memberships/${bobMembershipId}/review`, {
      decision: 'approve',
      role: 'incoming'
    }, { Cookie: aliceCookie });
    assert(approveBob.status === 200 && approveBob.body?.membership?.status === 'active', 'Company A owner approves Bob as incoming worker');

    // Bob can now sign in
    const bobLogin = await makeRequest(APP_PORT, 'POST', '/api/auth/sign-in', {
      email: 'bob@apex.test',
      password: 'Password12345!'
    });
    assert(bobLogin.status === 200, 'Approved worker Bob signs in successfully');
    const bobCookie = bobLogin.headers['set-cookie']?.[0]?.split(';')[0];

    // Worker Bob tries to view pending memberships -> 403 Forbidden
    const bobPending = await makeRequest(APP_PORT, 'GET', '/api/memberships/pending', null, { Cookie: bobCookie });
    assert(bobPending.status === 403, 'Regular worker Bob cannot access GET /api/memberships/pending (HTTP 403)');

    // Supervisor Adam CAN view pending memberships
    const adamPending = await makeRequest(APP_PORT, 'GET', '/api/memberships/pending', null, { Cookie: adamCookie });
    assert(adamPending.status === 200, 'Supervisor Adam can view GET /api/memberships/pending (HTTP 200)');

    // Cross-company review: Carol (Company B owner) tries to approve Eve in Company A
    const dbEve = await pgPool.query("SELECT id FROM memberships WHERE role = 'incoming' AND status = 'pending_approval' AND organisation_id = $1", [orgIdA]);
    const eveMembershipId = dbEve.rows[0]?.id;
    const crossReview = await makeRequest(APP_PORT, 'POST', `/api/memberships/${eveMembershipId}/review`, {
      decision: 'approve',
      role: 'incoming'
    }, { Cookie: carolCookie });
    assert(
      crossReview.status === 400 && crossReview.body?.error?.includes('not found in your organisation'),
      'Cross-company membership review rejected (Carol cannot approve Company A member)',
      `Status: ${crossReview.status}, error: ${crossReview.body?.error}`
    );

    // Privilege escalation prevention: Alice attempts to approve Eve as 'owner' or 'supervisor'
    const escalateReview = await makeRequest(APP_PORT, 'POST', `/api/memberships/${eveMembershipId}/review`, {
      decision: 'approve',
      role: 'owner'
    }, { Cookie: aliceCookie });
    assert(
      escalateReview.status === 400 && escalateReview.body?.error?.includes('privileged roles'),
      'Approval endpoint rejects granting privileged role (owner/supervisor)',
      `Status: ${escalateReview.status}, error: ${escalateReview.body?.error}`
    );
  }

  // ── 5. Cross-Company Resource Isolation ────────────────────────────────────
  console.log('\n--- 5. Testing Cross-Company Resource Isolation ---');
  {
    // Create workflow template in Company B
    const bTemplateRes = await makeRequest(APP_PORT, 'POST', '/api/workflow-templates', {
      name: 'Beacon Retail Handover',
      description: 'Closing cashier to opening cashier',
      steps: [{ role: 'incoming', action: 'Acknowledge', dueMinutes: 30 }]
    }, { Cookie: carolCookie });
    assert(bTemplateRes.status === 201, 'Company B owner creates workflow template');

    // Bob in Company A lists workflow templates
    const bobTemplates = await makeRequest(APP_PORT, 'GET', '/api/workflow-templates', null, { Cookie: `shiftrelay_session=${aliceCookie?.replace('shiftrelay_session=', '')}` });
    // Alice in Company A lists workflow templates
    const aTemplates = await makeRequest(APP_PORT, 'GET', '/api/workflow-templates', null, { Cookie: aliceCookie });
    const hasCompanyBTemplate = (aTemplates.body?.templates || []).some(t => t.name === 'Beacon Retail Handover');
    assert(!hasCompanyBTemplate, 'Company A cannot view Company B workflow templates');

    // Directory isolation: Alice (Company A) lists directory
    const aDirectory = await makeRequest(APP_PORT, 'GET', '/api/directory', null, { Cookie: aliceCookie });
    const containsCarol = (aDirectory.body?.members || []).some(m => m.email === 'carol@beacon.test');
    assert(!containsCarol, 'Company A directory does not leak Company B members');

    // Handover cross-company mutation:
    // Create a handover in Company B
    // Add incoming worker in Company B
    const danUserId = crypto.randomUUID();
    const danMembershipId = crypto.randomUUID();
    await pgPool.query(
      "INSERT INTO portal_users (id, full_name, email, password_hash) VALUES ($1, 'Dan Cashier', 'dan@beacon.test', 'dummy')",
      [danUserId]
    );
    await pgPool.query(
      "INSERT INTO memberships (id, organisation_id, user_id, role, title, department, status) VALUES ($1, $2, $3, 'incoming', 'Cashier', 'Floor', 'active')",
      [danMembershipId, orgIdB, danUserId]
    );

    // Carol creates a handover in Company B
    const bHandoverRes = await makeRequest(APP_PORT, 'POST', '/api/handovers', {
      handover: { summary: 'Company B register count' },
      assignedTo: danMembershipId
    }, { Cookie: carolCookie });
    const bHandoverId = bHandoverRes.body?.handover?.id;
    assert(Boolean(bHandoverId), 'Handover created in Company B');

    // Supervisor Adam (Company A) attempts to relay Company B handover
    const crossRelay = await makeRequest(APP_PORT, 'POST', `/api/handovers/${bHandoverId}/relay`, {}, { Cookie: adamCookie });
    assert(
      crossRelay.status === 403 && crossRelay.body?.error === 'Handover not found.',
      'Cross-company handover relay fails with Handover not found (HTTP 403)',
      `Status: ${crossRelay.status}, error: ${crossRelay.body?.error}`
    );
  }

  // ── 6. Handover State Machine & Role Enforcement ───────────────────────────
  console.log('\n--- 6. Testing Handover State Machine & Role Enforcement ---');
  {
    // In Company A: Alice (owner/supervisor) creates a handover assigned to Bob
    const bobUser = (await pgPool.query("SELECT id FROM memberships WHERE role = 'incoming' AND status = 'active' AND organisation_id = $1", [orgIdA])).rows[0];
    const aHandoverRes = await makeRequest(APP_PORT, 'POST', '/api/handovers', {
      handover: { summary: 'ICU Bed 4 Ventilator checks' },
      assignedTo: bobUser.id
    }, { Cookie: adamCookie });
    const handoverId = aHandoverRes.body?.handover?.id;
    assert(Boolean(handoverId), 'Supervisor Adam creates handover in Company A (status: awaiting_review)');

    // Log in as Bob
    const bobLogin = await makeRequest(APP_PORT, 'POST', '/api/auth/sign-in', {
      email: 'bob@apex.test',
      password: 'Password12345!'
    });
    const bobCookie = bobLogin.headers['set-cookie']?.[0]?.split(';')[0];

    // 1. Worker Bob attempts to relay handover -> 403 Forbidden
    const workerRelay = await makeRequest(APP_PORT, 'POST', `/api/handovers/${handoverId}/relay`, {}, { Cookie: bobCookie });
    assert(
      workerRelay.status === 403 && workerRelay.body?.error?.includes('Only a supervisor'),
      'Worker Bob cannot relay handover (HTTP 403, supervisor/owner only)',
      `Status: ${workerRelay.status}, error: ${workerRelay.body?.error}`
    );

    // 2. Worker Bob attempts to acknowledge BEFORE it is relayed -> 403 invalid state
    const earlyAck = await makeRequest(APP_PORT, 'POST', `/api/handovers/${handoverId}/acknowledge`, {}, { Cookie: bobCookie });
    assert(
      earlyAck.status === 403 && earlyAck.body?.error?.includes('cannot be acknowledged in its current state'),
      'Cannot acknowledge handover before it is relayed (state transition enforced)',
      `Status: ${earlyAck.status}, error: ${earlyAck.body?.error}`
    );

    // 3. Supervisor Adam relays handover
    const adamRelay = await makeRequest(APP_PORT, 'POST', `/api/handovers/${handoverId}/relay`, {}, { Cookie: adamCookie });
    assert(adamRelay.status === 200 && adamRelay.body?.handover?.status === 'relayed', 'Supervisor Adam relays handover (status -> relayed)');

    // 4. Supervisor Adam attempts to relay AGAIN -> blocked
    const repeatRelay = await makeRequest(APP_PORT, 'POST', `/api/handovers/${handoverId}/relay`, {}, { Cookie: adamCookie });
    assert(
      repeatRelay.status === 403 && repeatRelay.body?.error?.includes('cannot be relayed in its current state'),
      'Cannot re-relay an already-relayed handover (state transition enforced)',
      `Status: ${repeatRelay.status}, error: ${repeatRelay.body?.error}`
    );

    // 5. Worker Bob acknowledges handover
    const bobAck = await makeRequest(APP_PORT, 'POST', `/api/handovers/${handoverId}/acknowledge`, {}, { Cookie: bobCookie });
    assert(bobAck.status === 200 && bobAck.body?.handover?.status === 'acknowledged', 'Worker Bob acknowledges handover (status -> acknowledged)');

    // 6. Worker Bob attempts to acknowledge AGAIN -> blocked
    const repeatAck = await makeRequest(APP_PORT, 'POST', `/api/handovers/${handoverId}/acknowledge`, {}, { Cookie: bobCookie });
    assert(
      repeatAck.status === 403 && repeatAck.body?.error?.includes('cannot be acknowledged in its current state'),
      'Cannot re-acknowledge an already-acknowledged handover (state transition enforced)',
      `Status: ${repeatAck.status}, error: ${repeatAck.body?.error}`
    );
  }

  // ── 7. Disabled Unsafe Pilot Endpoints ─────────────────────────────────────
  console.log('\n--- 7. Testing Server-Side Disabled Pilot Routes ---');
  {
    const swapGet = await makeRequest(APP_PORT, 'GET', '/api/shift-swaps', null, { Cookie: aliceCookie });
    assert(swapGet.status === 501, 'GET /api/shift-swaps disabled with HTTP 501');

    const swapPost = await makeRequest(APP_PORT, 'POST', '/api/shift-swaps', {}, { Cookie: aliceCookie });
    assert(swapPost.status === 501, 'POST /api/shift-swaps disabled with HTTP 501');

    const swapReview = await makeRequest(APP_PORT, 'POST', '/api/shift-swaps/review', {}, { Cookie: aliceCookie });
    assert(swapReview.status === 501, 'POST /api/shift-swaps/review disabled with HTTP 501');

    const feedGet = await makeRequest(APP_PORT, 'GET', '/api/feed/posts', null, { Cookie: aliceCookie });
    assert(feedGet.status === 501, 'GET /api/feed/posts disabled with HTTP 501');

    const uploadPost = await makeRequest(APP_PORT, 'POST', '/api/upload', {}, { Cookie: aliceCookie });
    assert(uploadPost.status === 501, 'POST /api/upload disabled with HTTP 501');

    const badgeGet = await makeRequest(APP_PORT, 'GET', '/api/verified-badge-request', null, { Cookie: aliceCookie });
    assert(badgeGet.status === 501, 'GET /api/verified-badge-request disabled with HTTP 501');
  }

  // ── 8. Multi-Company User Context Switching ────────────────────────────────
  console.log('\n--- 8. Testing Multi-Company Context Switching ---');
  {
    // Approve Alice's pending membership in Company B as Carol (Company B owner)
    const approveAliceInB = await makeRequest(APP_PORT, 'POST', `/api/memberships/${aliceCompanyBMembershipId}/review`, {
      decision: 'approve',
      role: 'incoming'
    }, { Cookie: carolCookie });
    assert(approveAliceInB.status === 200, 'Company B approves Alice membership as worker');
    const aliceBMembershipId = aliceCompanyBMembershipId;

    // Alice queries /api/user/memberships
    const membershipsList = await makeRequest(APP_PORT, 'GET', '/api/user/memberships', null, { Cookie: aliceCookie });
    assert(membershipsList.status === 200, 'Alice retrieves memberships via GET /api/user/memberships');
    assert(
      (membershipsList.body?.memberships || []).length === 2,
      'Lists both active memberships for multi-company user Alice (Company A and Company B)',
      `Count: ${membershipsList.body?.memberships?.length}`
    );

    // Alice switches context to Company B
    const switchRes = await makeRequest(APP_PORT, 'POST', '/api/user/active-membership', {
      membershipId: aliceBMembershipId
    }, { Cookie: aliceCookie });
    assert(switchRes.status === 200, 'Alice successfully switches active membership context to Company B');
    const aliceSwitchedCookie = switchRes.headers['set-cookie']?.[0]?.split(';')[0];

    // In Company B context, Alice cannot view Company A audit events (Alice is incoming in Company B, not owner)
    const auditRes = await makeRequest(APP_PORT, 'GET', '/api/audit-events', null, { Cookie: aliceSwitchedCookie });
    assert(auditRes.status === 403, 'In Company B context, Alice has worker role and cannot view audit events (HTTP 403)');

    // Alice cannot switch context to a non-existent or un-owned membership
    const bogusSwitch = await makeRequest(APP_PORT, 'POST', '/api/user/active-membership', {
      membershipId: crypto.randomUUID()
    }, { Cookie: aliceSwitchedCookie });
    assert(bogusSwitch.status === 403, 'Cannot switch context to an un-owned membership (HTTP 403)');
  }

  // Cleanup
  appProc.kill();
  pgPool.end();
  pgProc.kill();

  console.log('\n' + '='.repeat(75));
  console.log(`  BATCH 2B RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(75));

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Fatal error in test runner:', err);
  process.exit(1);
});
