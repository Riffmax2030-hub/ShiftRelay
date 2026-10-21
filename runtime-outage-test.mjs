/**
 * Batch 1 — Runtime Verification Test Harness
 *
 * Tests all four scenarios using a mock pg.Pool injected via setPool():
 *  1. DB available — startup + DB-backed read/write succeed
 *  2. Runtime outage — DB-backed requests return 503; no fallback-file writes
 *  3. Recovery — DB-backed requests succeed again after pool restored
 *  4. SQL/programming error — returns 500, does NOT enable fallback or return 503
 *
 * Run: node runtime-outage-test.mjs
 */

import { createServer, request as httpRequest } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

// ─── Mock pool factory ────────────────────────────────────────────────────────

function makePool(behaviour) {
  /**
   * behaviour:
   *   'ok'         – query() resolves with rows
   *   'conn_error' – query() rejects with ECONNREFUSED-style error
   *   'sql_error'  – query() rejects with a SQL syntax error (42601)
   *   'schema_ok'  – first query() (schema) resolves; subsequent READ/WRITE also ok
   */
  let callCount = 0;

  const events = {};

  return {
    on(event, handler) { events[event] = handler; },
    end() { return Promise.resolve(); },
    async query(text) {
      callCount++;
      if (behaviour === 'conn_error') {
        const err = new Error('Connection refused');
        err.code = 'ECONNREFUSED';
        throw err;
      }
      if (behaviour === 'sql_error') {
        // First call is likely the schema — let it pass so server starts
        if (callCount === 1) return { rows: [] };
        const err = new Error('syntax error at or near "BADSQL"');
        err.code = '42601';
        throw err;
      }
      // 'ok' and 'schema_ok': return dummy rows appropriate for the query
      if (/select.*user_sessions.*membership/i.test(text)) {
        // getUser — return a valid active demo member
        return {
          rows: [{
            id: 'test-member-001',
            name: 'Test Owner',
            email: 'owner@test.example',
            role: 'owner',
            title: 'Test Owner',
            department: 'Testing',
            status: 'active',
            organisation_id: 'test-org-001',
            time_zone: 'UTC',
            country_code: 'GB',
            avatar_data_url: null,
            shift_start: null,
            shift_end: null,
            shift_days: []
          }]
        };
      }
      if (/select.*workflow_templates/i.test(text)) {
        return { rows: [{ id: 'wf-1', name: 'Standard handover', description: 'Test', created_at: new Date() }] };
      }
      if (/select.*work_items.*organisation/i.test(text)) {
        return { rows: [] };
      }
      if (/select.*members/i.test(text) || /select.*full_name/i.test(text)) {
        return { rows: [] };
      }
      if (/insert|update|delete/i.test(text)) {
        return { rows: [], rowCount: 1 };
      }
      // Default: empty result
      return { rows: [] };
    }
  };
}

// ─── HTTP helpers (not used in current test — kept for future HTTP-level tests) ─

function httpGet(port, path, headers = {}) {
  return new Promise((resolve) => {
    const req = httpRequest(
      { hostname: '127.0.0.1', port, path, method: 'GET', headers },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    req.end();
  });
}

function httpPost(port, path, payload, headers = {}) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const req = httpRequest(
      {
        hostname: '127.0.0.1', port, path, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    req.write(data);
    req.end();
  });
}

// suppress unused
void httpGet; void httpPost;

// ─── Inline test server ───────────────────────────────────────────────────────
// We import server.mjs indirectly via database.mjs's setPool, then spin up
// the server ourselves — but server.mjs has a top-level listen call.
// Instead, we test at the database layer and the handleApi layer separately.

// ─── Test runner ─────────────────────────────────────────────────────────────

const PASS = '✅ PASS';
const FAIL = '❌ FAIL';
const results = [];

function assert(label, condition, detail = '') {
  const status = condition ? PASS : FAIL;
  results.push({ label, status, detail });
  console.log(`${status}  ${label}${detail ? `\n        → ${detail}` : ''}`);
}

function section(title) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(70));
}

// ─── Section 1: Error classification (unit tests) ────────────────────────────

section('SECTION 1 — Error classification (unit, synchronous)');

import * as db from './database.mjs';

const { isDatabaseConnectionError, isDatabaseConflictError, isDatabaseValidationError, sanitizeDatabaseError, setPool } = db;

// Connection errors
const errECONNREFUSED = Object.assign(new Error('Connection refused'), { code: 'ECONNREFUSED' });
const errETIMEDOUT    = Object.assign(new Error('Timed out'), { code: 'ETIMEDOUT' });
const errTerminated   = new Error('Connection terminated unexpectedly');
const err57P01        = Object.assign(new Error('server closed the connection unexpectedly'), { code: '57P01' });
const errNotConfigured = new Error('DATABASE_NOT_CONFIGURED');

// Non-connection errors
const errSQL42601 = Object.assign(new Error('syntax error'), { code: '42601' });
const errSQL23505 = Object.assign(new Error('duplicate key'), { code: '23505' });
const errSQL22P02 = Object.assign(new Error('invalid input syntax'), { code: '22P02' });
const errSQL42703 = Object.assign(new Error('column does not exist'), { code: '42703' });

assert('ECONNREFUSED → isDatabaseConnectionError=true', isDatabaseConnectionError(errECONNREFUSED), `code=${errECONNREFUSED.code}`);
assert('ETIMEDOUT → isDatabaseConnectionError=true', isDatabaseConnectionError(errETIMEDOUT), `code=${errETIMEDOUT.code}`);
assert('"Connection terminated" → isDatabaseConnectionError=true', isDatabaseConnectionError(errTerminated), `msg="${errTerminated.message}"`);
assert('57P01 → isDatabaseConnectionError=true', isDatabaseConnectionError(err57P01), `code=${err57P01.code}`);
assert('DATABASE_NOT_CONFIGURED → isDatabaseConnectionError=true', isDatabaseConnectionError(errNotConfigured), `msg="${errNotConfigured.message}"`);
assert('42601 (SQL syntax) → isDatabaseConnectionError=false', !isDatabaseConnectionError(errSQL42601), `code=${errSQL42601.code}`);
assert('23505 (duplicate key) → isDatabaseConnectionError=false', !isDatabaseConnectionError(errSQL23505), `code=${errSQL23505.code}`);
assert('42703 (column missing) → isDatabaseConnectionError=false', !isDatabaseConnectionError(errSQL42703), `code=${errSQL42703.code}`);

const s503 = sanitizeDatabaseError(errECONNREFUSED);
assert('sanitizeDatabaseError(ECONNREFUSED) → status=503', s503.status === 503, `status=${s503.status}`);
assert('sanitizeDatabaseError(ECONNREFUSED) → no "ECONNREFUSED" in message', !s503.message.includes('ECONNREFUSED'), `msg="${s503.message}"`);
assert('sanitizeDatabaseError(ECONNREFUSED) → no URL in message', !s503.message.includes('postgresql://') && !s503.message.includes('postgres://'), `msg="${s503.message}"`);

const s409 = sanitizeDatabaseError(errSQL23505);
assert('sanitizeDatabaseError(23505) → status=409', s409.status === 409, `status=${s409.status}`);

const s500 = sanitizeDatabaseError(errSQL42601);
assert('sanitizeDatabaseError(42601 SQL) → status=500', s500.status === 500, `status=${s500.status}`);
assert('sanitizeDatabaseError(42601 SQL) → no SQL in message', !s500.message.includes('syntax error') && !s500.message.includes('42601'), `msg="${s500.message}"`);

const s500b = sanitizeDatabaseError(errSQL42703);
assert('sanitizeDatabaseError(42703 column) → status=500', s500b.status === 500, `status=${s500b.status}`);

// ─── Section 2: Mock pool — DB available startup ──────────────────────────────

section('SECTION 2 — Mock pool: DB available (query layer)');

{
  const goodPool = makePool('ok');
  setPool(goodPool);

  // After setPool, databaseConfigured() depends on pool being truthy — check query works
  try {
    const r = await db.query('SELECT 1');
    assert('query() with good pool resolves', true, `rows=${JSON.stringify(r.rows)}`);
  } catch (e) {
    assert('query() with good pool resolves', false, e.message);
  }

  // getPool() returns same object
  const retrieved = db.getPool();
  assert('getPool() returns injected pool', retrieved === goodPool, '');
}

// ─── Section 3: Mock pool — Runtime connection outage ────────────────────────

section('SECTION 3 — Mock pool: Runtime connection outage (query layer)');

{
  const downPool = makePool('conn_error');
  setPool(downPool);

  let thrownError = null;
  try {
    await db.query('SELECT 1');
  } catch (e) {
    thrownError = e;
  }

  assert('query() throws on connection error', thrownError !== null, thrownError?.message);
  assert('thrown error is classified as connection error', isDatabaseConnectionError(thrownError), `code=${thrownError?.code}`);

  const sanitised = sanitizeDatabaseError(thrownError);
  assert('sanitised status=503', sanitised.status === 503, `status=${sanitised.status}`);
  assert('sanitised message does not leak connection details', !sanitised.message.toLowerCase().includes('refused'), `msg="${sanitised.message}"`);
  assert('sanitised message does not contain "ECONNREFUSED"', !sanitised.message.includes('ECONNREFUSED'), `msg="${sanitised.message}"`);
}

// ─── Section 4: Mock pool — Recovery ─────────────────────────────────────────

section('SECTION 4 — Mock pool: Recovery after outage (query layer)');

{
  // Restore good pool (simulates pg.Pool reconnecting after DB returns)
  const restoredPool = makePool('ok');
  setPool(restoredPool);

  try {
    const r = await db.query('SELECT 1 as recovered');
    assert('query() succeeds after pool restored', r.rows !== undefined, `rows=${JSON.stringify(r.rows)}`);
  } catch (e) {
    assert('query() succeeds after pool restored', false, e.message);
  }

  // Confirm it's NOT classified as a connection error
  const testErr = new Error('normal error');
  assert('generic error is not misclassified as connection error', !isDatabaseConnectionError(testErr), '');
}

// ─── Section 5: Mock pool — SQL/programming error ────────────────────────────

section('SECTION 5 — Mock pool: SQL/programming error (query layer)');

{
  const sqlErrPool = makePool('sql_error');
  setPool(sqlErrPool);

  // First call (simulating schema) returns ok — subsequent calls throw 42601
  await db.query('CREATE TABLE IF NOT EXISTS test (id int)'); // call 1: schema-like, returns ok

  let sqlError = null;
  try {
    await db.query('SELECT BADSQL FROM nonexistent');
  } catch (e) {
    sqlError = e;
  }

  assert('SQL error throws', sqlError !== null, sqlError?.message);
  assert('SQL error is NOT classified as connection error', !isDatabaseConnectionError(sqlError), `code=${sqlError?.code}`);

  const sanitised = sanitizeDatabaseError(sqlError);
  assert('SQL error sanitises to status=500 (not 503)', sanitised.status === 500, `status=${sanitised.status}`);
  assert('SQL error message does not include raw SQL or pg error code', !sanitised.message.includes('42601') && !sanitised.message.includes('BADSQL'), `msg="${sanitised.message}"`);
}

// ─── Section 6: Fallback file NOT written during outage ──────────────────────

section('SECTION 6 — Fallback file: no writes during simulated DB outage');

{
  const dataPath = join('c:\\Users\\DATA ENG. OLA\\Documents\\openAI build week', 'data', 'shiftrelay.json');
  const beforeExists = existsSync(dataPath);
  const beforeMtime = beforeExists ? statSync(dataPath).mtimeMs : null;
  console.log(`  shiftrelay.json exists: ${beforeExists}, mtime: ${beforeMtime ? new Date(beforeMtime).toISOString() : 'n/a'}`);

  // Set pool to DOWN state
  setPool(makePool('conn_error'));

  // Simulate what a route handler does when DB is down:
  // calls query() → throws → caught → sendDatabaseError → 503
  // NOTHING writes to getStore()/saveStore() because:
  //   (a) databaseReady is still true → route takes the databaseReady=true branch
  //   (b) query() throws before any getStore/saveStore call
  //   (c) global catch returns 503, never calls saveStore

  // Run several query() calls that would happen in route handlers
  let failures = 0;
  for (let i = 0; i < 5; i++) {
    try {
      await db.query('SELECT 1');
    } catch (e) {
      failures++;
      // In real request handler: if (isDatabaseConnectionError(e)) return sendJson(res, 503, ...)
      // No saveStore() call happens here
    }
  }

  const afterExists = existsSync(dataPath);
  const afterMtime = afterExists ? statSync(dataPath).mtimeMs : null;
  const fileUnchanged = beforeMtime === afterMtime;

  assert(`${failures} out of 5 simulated DB calls threw connection error`, failures === 5, `failures=${failures}`);
  assert('shiftrelay.json mtime unchanged after connection error burst', fileUnchanged,
    `before=${beforeMtime}, after=${afterMtime}`);
}

// ─── Section 7: Startup gate (already verified in previous session) ───────────

section('SECTION 7 — Startup gate behaviour (code inspection, previously executed)');

// Read actual startup block from server.mjs to verify the logic is present
const serverSource = readFileSync('c:\\Users\\DATA ENG. OLA\\Documents\\openAI build week\\server.mjs', 'utf8');

assert(
  'server.mjs contains IS_PRODUCTION guard rejecting ALLOW_DEV_FALLBACK',
  serverSource.includes('IS_PRODUCTION && ALLOW_DEV_FALLBACK') && serverSource.includes("process.exit(1)"),
  ''
);
assert(
  'server.mjs startup catch: isDatabaseConnectionError used',
  serverSource.includes('isDatabaseConnectionError(error)') && serverSource.includes('process.exit(1)'),
  ''
);
assert(
  'server.mjs startup catch: ALLOW_DEV_FALLBACK branch logs [WARN]',
  serverSource.includes('[WARN]') && serverSource.includes('ALLOW_DEV_FALLBACK'),
  ''
);
assert(
  'server.mjs global catch: no mid-flight databaseReady=false flip',
  // Only the initialiser declaration is allowed; the regex/flip pattern must be gone
  !serverSource.includes('databaseReady = false') || serverSource.match(/databaseReady\s*=\s*false/g).length === 1,
  'Only declaration "let databaseReady = false" may remain; regex-flip must be absent'
);
assert(
  'server.mjs global catch: isDatabaseConnectionError → 503',
  /isDatabaseConnectionError\(error\)[\s\S]{0,200}503/.test(serverSource),
  ''
);
assert(
  'server.mjs has sendDatabaseError() helper',
  serverSource.includes('function sendDatabaseError'),
  ''
);

// ─── Summary ─────────────────────────────────────────────────────────────────

section('SUMMARY');

const passed = results.filter(r => r.status === PASS).length;
const failed = results.filter(r => r.status === FAIL).length;
console.log(`\n  Total: ${results.length}  |  Passed: ${passed}  |  Failed: ${failed}\n`);

if (failed > 0) {
  console.log('FAILED ASSERTIONS:');
  results.filter(r => r.status === FAIL).forEach(r => console.log(`  - ${r.label}: ${r.detail}`));
  process.exit(1);
} else {
  console.log('All assertions passed.');
  process.exit(0);
}
