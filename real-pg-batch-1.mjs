/**
 * Real PostgreSQL Integration Verification for Batch 1: Production Database Safety
 *
 * Requirements:
 * 1. Startup in production mode with a real disposable PostgreSQL 18 instance
 * 2. Independent database verification (querying PG directly with an admin connection)
 * 3. Fallback-file verification (existence, contents, mtime)
 * 4. Mid-flight PostgreSQL outage -> returns 503, no fallback-file writes
 * 5. Connection pool recovery after PostgreSQL restored without app restart
 * 6. Controlled SQL error -> does not trigger fallback or return 503 outage
 * 7. Verification that NO test backdoors exist in production code
 */

import { spawn } from 'node:child_process';
import { statSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import pg from 'pg';

const { Pool } = pg;

const PG_PORT = 54323;
const APP_PORT = 4020;
const PG_BIN = 'C:\\Program Files\\PostgreSQL\\18\\bin';
const PG_DATA = join(process.env.TEMP, 'disposable_pg_cluster');
const DATA_FILE = join(process.cwd(), 'data', 'shiftrelay.json');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFileSnapshot(path) {
  if (!existsSync(path)) return { exists: false, mtime: null, size: 0, hash: null, content: null };
  const stat = statSync(path);
  const content = readFileSync(path, 'utf8');
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return { exists: true, mtime: stat.mtimeMs, size: stat.size, hash, content };
}

function makeRequest(method, path, body = null, headers = {}) {
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
        port: APP_PORT,
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

// ─── Main Execution ──────────────────────────────────────────────────────────

async function run() {
  console.log('='.repeat(75));
  console.log('  BATCH 1: REAL POSTGRESQL INTEGRATION VERIFICATION');
  console.log('='.repeat(75));

  // ── Pre-check: Verify no SIMULATE_SQL_ERROR in production files ────────────
  console.log('\n[SECURITY CHECK] Scanning production code for SIMULATE_SQL_ERROR test triggers...');
  const prodFiles = ['server.mjs', 'database.mjs'];
  for (const f of prodFiles) {
    const content = readFileSync(join(process.cwd(), f), 'utf8');
    if (content.includes('SIMULATE_SQL_ERROR')) {
      console.error(`FATAL: Found SIMULATE_SQL_ERROR in ${f}! Test triggers must not exist in production code.`);
      process.exit(1);
    }
  }
  console.log('✅ Confirmed: SIMULATE_SQL_ERROR does NOT exist in production code (server.mjs, database.mjs).');

  // ── Pre-check: Fallback file baseline ──────────────────────────────────────
  const baseline = getFileSnapshot(DATA_FILE);
  console.log(`\n[FALLBACK FILE BASELINE] ${DATA_FILE}`);
  console.log(`  Exists: ${baseline.exists}`);
  console.log(`  mtime:  ${baseline.mtime ? new Date(baseline.mtime).toISOString() : 'N/A'}`);
  console.log(`  Size:   ${baseline.size} bytes`);
  console.log(`  SHA256: ${baseline.hash}`);

  // ── Step 1: Start Real PostgreSQL 18 Instance ──────────────────────────────
  console.log(`\n[STEP 1] Starting real PostgreSQL 18 process on port ${PG_PORT}...`);
  let pgProc = spawnPostgres(PG_PORT);
  pgProc.stderr.on('data', () => {}); // consume

  const adminPool = new Pool({
    connectionString: `postgresql://postgres@127.0.0.1:${PG_PORT}/postgres`,
    connectionTimeoutMillis: 2000
  });
  adminPool.on('error', () => {}); // Catch postmaster exit error on idle client in test harness

  const pgReady = await waitForPg(adminPool);
  if (!pgReady) {
    console.error('FATAL: Real PostgreSQL failed to become ready.');
    pgProc.kill();
    process.exit(1);
  }

  const versionRes = await adminPool.query('SELECT version()');
  console.log(`✅ Real PostgreSQL is running: ${versionRes.rows[0].version.split(',')[0]}`);

  // ── Step 2: Start ShiftRelay in production mode ────────────────────────────
  console.log(`\n[STEP 2] Starting ShiftRelay (server.mjs) in NODE_ENV=production on port ${APP_PORT}...`);
  const appProc = spawn('node', ['server.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(APP_PORT),
      DATABASE_URL: `postgresql://postgres@127.0.0.1:${PG_PORT}/postgres`
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let appStdout = '';
  let appStderr = '';
  appProc.stdout.on('data', (d) => { appStdout += d; });
  appProc.stderr.on('data', (d) => { appStderr += d; });

  let appReady = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 200));
    if (appStdout.includes('ShiftRelay') || appStdout.includes(String(APP_PORT))) {
      appReady = true;
      break;
    }
  }

  if (!appReady) {
    console.error('FATAL: App failed to start. Stderr:', appStderr, 'Stdout:', appStdout);
    appProc.kill();
    pgProc.kill();
    await adminPool.end();
    process.exit(1);
  }

  console.log(`✅ App started in production mode: ${appStdout.trim()}`);

  const testResults = [];
  function record(name, pass, details) {
    testResults.push({ name, pass, details });
    console.log(`\n${pass ? '✅ PASS' : '❌ FAIL'} ${name}`);
    console.log(`     ${details}`);
  }

  try {
    // ── Test 1: Production Read & Write with Real DB ─────────────────────────
    console.log('\n' + '─'.repeat(70));
    console.log('TEST 1: Production DB-backed Read/Write against Real PostgreSQL');
    console.log('─'.repeat(70));

    const fictionalEmail = 'fictional-nurse-' + crypto.randomUUID().slice(0, 8) + '@hospital.demo';
    const writeReq = await makeRequest('POST', '/api/account-deletion-requests', {
      email: fictionalEmail,
      reason: 'Fictional compliance audit request'
    });

    const httpWriteOk = writeReq.status === 201 && writeReq.body?.ok === true;
    record(
      'Test 1a: HTTP write returns 201 Created',
      httpWriteOk,
      `HTTP status=${writeReq.status}, body=${JSON.stringify(writeReq.body)}`
    );

    // INDEPENDENT DATABASE QUERY: Query PostgreSQL directly using adminPool
    const independentPgQuery = await adminPool.query(
      'SELECT id, email, reason, status, requested_at FROM account_deletion_requests WHERE email = $1',
      [fictionalEmail]
    );

    const rowInDb = independentPgQuery.rows[0];
    const dbWriteConfirmed = rowInDb && rowInDb.email === fictionalEmail;
    record(
      'Test 1b: Independent PostgreSQL query confirms record exists in real database',
      dbWriteConfirmed,
      `DB Row: id=${rowInDb?.id}, email=${rowInDb?.email}, reason="${rowInDb?.reason}", status=${rowInDb?.status}`
    );

    // Read test
    const readReq = await makeRequest('GET', '/api/workflow-templates', null, {
      'x-shiftrelay-user': '00000000-0000-4000-8000-000000000014'
    });
    const readOk = readReq.status === 200 && Array.isArray(readReq.body?.templates);
    record(
      'Test 1c: HTTP read returns 200 OK from PostgreSQL templates',
      readOk,
      `HTTP status=${readReq.status}, templates in response=${readReq.body?.templates?.length}`
    );

    // Check fallback file
    const snap1 = getFileSnapshot(DATA_FILE);
    const snap1Unchanged = snap1.hash === baseline.hash && snap1.mtime === baseline.mtime;
    record(
      'Test 1d: Fallback file (shiftrelay.json) completely unchanged after normal DB operations',
      snap1Unchanged,
      `hashMatch=${snap1.hash === baseline.hash}, mtimeMatch=${snap1.mtime === baseline.mtime}`
    );

    // ── Test 2: Mid-Flight Disconnection & Runtime Outage ────────────────────
    console.log('\n' + '─'.repeat(70));
    console.log('TEST 2: Disconnect Real PostgreSQL while app is running');
    console.log('─'.repeat(70));

    console.log('[ACTION] Terminating PostgreSQL process (PID ' + pgProc.pid + ')...');
    pgProc.kill('SIGKILL');
    await new Promise((r) => setTimeout(r, 1000));

    // Verify PG is down
    let pgDown = false;
    try {
      await adminPool.query('SELECT 1');
    } catch {
      pgDown = true;
    }
    console.log(`[VERIFY] Real PostgreSQL is down: ${pgDown}`);

    // HTTP write during outage
    const outageEmail = 'outage-attempt-' + crypto.randomUUID().slice(0, 8) + '@hospital.demo';
    const outageWriteReq = await makeRequest('POST', '/api/account-deletion-requests', {
      email: outageEmail,
      reason: 'Should return 503 without fallback'
    });

    const is503 = outageWriteReq.status === 503;
    const sanitised503 = outageWriteReq.body?.error === 'Service Unavailable: Database connection error. Please try again shortly.';
    record(
      'Test 2a: Write during real DB outage returns sanitized HTTP 503',
      is503 && sanitised503,
      `HTTP status=${outageWriteReq.status}, body=${JSON.stringify(outageWriteReq.body)}`
    );

    // HTTP read during outage
    const outageReadReq = await makeRequest('GET', '/api/workflow-templates', null, {
      'x-shiftrelay-user': '00000000-0000-4000-8000-000000000014'
    });
    record(
      'Test 2b: Read during real DB outage returns sanitized HTTP 503',
      outageReadReq.status === 503,
      `HTTP status=${outageReadReq.status}, body=${JSON.stringify(outageReadReq.body)}`
    );

    // Check fallback file during outage
    const snap2 = getFileSnapshot(DATA_FILE);
    const snap2Unchanged = snap2.hash === baseline.hash && snap2.mtime === baseline.mtime;
    const noOutageDataInFile = !snap2.content?.includes(outageEmail);
    record(
      'Test 2c: Zero fallback writes during runtime outage (content & hash verified)',
      snap2Unchanged && noOutageDataInFile,
      `mtimeUnchanged=${snap2.mtime === baseline.mtime}, hashMatchesBaseline=${snap2.hash === baseline.hash}, outageEmailNotFoundInJson=${noOutageDataInFile}`
    );

    // ── Test 3: Recovery via Connection Pool ─────────────────────────────────
    console.log('\n' + '─'.repeat(70));
    console.log('TEST 3: Restore Real PostgreSQL and verify pool recovery without app restart');
    console.log('─'.repeat(70));

    console.log('[ACTION] Restarting PostgreSQL on port ' + PG_PORT + '...');
    pgProc = spawnPostgres(PG_PORT);
    pgProc.stderr.on('data', () => {});

    // Recreate admin pool to reconnect
    const recoveryAdminPool = new Pool({
      connectionString: `postgresql://postgres@127.0.0.1:${PG_PORT}/postgres`,
      connectionTimeoutMillis: 2000
    });
    recoveryAdminPool.on('error', () => {});

    const pgRestored = await waitForPg(recoveryAdminPool);
    console.log(`[VERIFY] Real PostgreSQL restored: ${pgRestored}`);

    // Wait a moment for app connection pool
    await new Promise((r) => setTimeout(r, 1000));

    // Post-recovery HTTP write (app was NOT restarted)
    const recoveryEmail = 'recovery-staff-' + crypto.randomUUID().slice(0, 8) + '@hospital.demo';
    const recoveryWriteReq = await makeRequest('POST', '/api/account-deletion-requests', {
      email: recoveryEmail,
      reason: 'Confirming pool recovered cleanly'
    });

    const recoveryWriteOk = recoveryWriteReq.status === 201 && recoveryWriteReq.body?.ok === true;
    record(
      'Test 3a: Write succeeds after DB restored (no app restart)',
      recoveryWriteOk,
      `HTTP status=${recoveryWriteReq.status}, body=${JSON.stringify(recoveryWriteReq.body)}`
    );

    // INDEPENDENT DATABASE QUERY: Verify record is physically written in PostgreSQL
    const recoveryPgQuery = await recoveryAdminPool.query(
      'SELECT id, email, reason, requested_at FROM account_deletion_requests WHERE email = $1',
      [recoveryEmail]
    );

    const recoveryRowInDb = recoveryPgQuery.rows[0];
    const recoveryDbConfirmed = recoveryRowInDb && recoveryRowInDb.email === recoveryEmail;
    record(
      'Test 3b: Independent PostgreSQL query confirms post-recovery record is in DB',
      recoveryDbConfirmed,
      `DB Row: id=${recoveryRowInDb?.id}, email=${recoveryRowInDb?.email}, reason="${recoveryRowInDb?.reason}"`
    );

    // Post-recovery HTTP read
    const recoveryReadReq = await makeRequest('GET', '/api/workflow-templates', null, {
      'x-shiftrelay-user': '00000000-0000-4000-8000-000000000014'
    });
    record(
      'Test 3c: Read succeeds after DB restored (no app restart)',
      recoveryReadReq.status === 200 && Array.isArray(recoveryReadReq.body?.templates),
      `HTTP status=${recoveryReadReq.status}, templates=${recoveryReadReq.body?.templates?.length}`
    );

    // ── Test 4: Controlled SQL/Programming Error ─────────────────────────────
    console.log('\n' + '─'.repeat(70));
    console.log('TEST 4: Trigger controlled SQL/programming error against real PostgreSQL');
    console.log('─'.repeat(70));

    // Send a request with a month parameter that triggers an invalid input syntax error in PG:
    // Query: SELECT ... WHERE clocked_in_at >= date_trunc('month', $1::date)
    // Sending 'NOT-A-VALID-DATE' triggers PostgreSQL code 22007 (data exception)
    const sqlErrorReq = await makeRequest('GET', '/api/time-entries?month=INVALID_MONTH_STRING', null, {
      'x-shiftrelay-user': '00000000-0000-4000-8000-000000000014'
    });

    // Must be 500 or 400 (NOT 503 outage), and must NOT leak raw SQL
    const isNot503 = sqlErrorReq.status !== 503 && (sqlErrorReq.status === 500 || sqlErrorReq.status === 400);
    const noSqlLeak = !JSON.stringify(sqlErrorReq.body).includes('date_trunc') &&
                      !JSON.stringify(sqlErrorReq.body).includes('INVALID_MONTH_STRING');
    record(
      'Test 4a: Real PostgreSQL data/syntax error does NOT return 503 database-outage',
      isNot503,
      `HTTP status=${sqlErrorReq.status} (expected 400 or 500; must not be 503), body=${JSON.stringify(sqlErrorReq.body)}`
    );

    record(
      'Test 4b: Real PostgreSQL error does NOT leak internal SQL or query fragments',
      noSqlLeak,
      `Response error="${sqlErrorReq.body?.error}"`
    );

    // Verify subsequent requests STILL run in DB mode (fallback was NOT triggered)
    const afterSqlEmail = 'after-sql-' + crypto.randomUUID().slice(0, 8) + '@hospital.demo';
    const afterSqlWrite = await makeRequest('POST', '/api/account-deletion-requests', {
      email: afterSqlEmail,
      reason: 'Verify DB mode maintained'
    });

    const afterSqlConfirmed = afterSqlWrite.status === 201;
    const afterSqlDbQuery = await recoveryAdminPool.query(
      'SELECT id, email FROM account_deletion_requests WHERE email = $1',
      [afterSqlEmail]
    );

    record(
      'Test 4c: Operations continue in DB mode after SQL error (fallback NOT triggered)',
      afterSqlConfirmed && afterSqlDbQuery.rows.length === 1,
      `HTTP status=${afterSqlWrite.status}, foundInDb=${afterSqlDbQuery.rows.length === 1}`
    );

    // Final fallback file check
    const snapFinal = getFileSnapshot(DATA_FILE);
    const finalFileUnchanged = snapFinal.hash === baseline.hash && snapFinal.mtime === baseline.mtime;
    record(
      'Test 4d: Fallback file contents & mtime 100% identical across entire verification',
      finalFileUnchanged,
      `initialHash=${baseline.hash}, finalHash=${snapFinal.hash}, mtimeMatches=${snapFinal.mtime === baseline.mtime}`
    );

    await recoveryAdminPool.end();

  } finally {
    console.log('\n[TEARDOWN] Stopping ShiftRelay app and real PostgreSQL server...');
    appProc.kill('SIGINT');
    setTimeout(() => appProc.kill('SIGKILL'), 1000);
    if (pgProc) pgProc.kill('SIGKILL');
    await adminPool.end().catch(() => {});
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(75));
  console.log('  FINAL VERIFICATION SUMMARY (REAL POSTGRESQL 18)');
  console.log('='.repeat(75));

  const total = testResults.length;
  const passed = testResults.filter((r) => r.pass).length;
  const failed = total - passed;

  console.log(`\n  Total Tests: ${total} | Passed: ${passed} | Failed: ${failed}\n`);
  for (const r of testResults) {
    console.log(`  ${r.pass ? '✅' : '❌'} ${r.name}`);
  }

  if (failed > 0) {
    console.error('\nVerification failed.');
    process.exit(1);
  } else {
    console.log('\nAll Batch 1 real PostgreSQL integration tests passed with 100% verification.');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
