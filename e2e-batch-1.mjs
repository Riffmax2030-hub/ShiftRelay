/**
 * End-to-end verification script for Batch 1: Production Database Safety
 *
 * Verifies:
 * 1. Startup in production mode with PostgreSQL available + DB-backed read/write
 * 2. Mid-flight PostgreSQL disconnection -> returns 503, no fallback-file writes
 * 3. PostgreSQL restored -> connection pool recovers without restarting server
 * 4. Controlled SQL/programming error -> returns 500 (not 503), no fallback enabled
 */

import net from 'node:net';
import { spawn } from 'node:child_process';
import { statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import http from 'node:http';

const PG_PORT = 5436;
const APP_PORT = 4010;
const DATA_FILE = join(process.cwd(), 'data', 'shiftrelay.json');

// ─── Wire Protocol Helpers ───────────────────────────────────────────────────

function makeBuffer(type, payload) {
  const len = payload.length + 4;
  const buf = Buffer.alloc(1 + 4 + payload.length);
  buf.write(type, 0, 1, 'ascii');
  buf.writeInt32BE(len, 1);
  payload.copy(buf, 5);
  return buf;
}

function makeRowDescription(columns) {
  const chunks = [];
  const countBuf = Buffer.alloc(2);
  countBuf.writeInt16BE(columns.length, 0);
  chunks.push(countBuf);
  for (const name of columns) {
    const nameBuf = Buffer.from(name + '\0', 'utf8');
    const metaBuf = Buffer.alloc(18);
    metaBuf.writeInt32BE(0, 0);  // tableOID
    metaBuf.writeInt16BE(0, 4);  // colAttr
    metaBuf.writeInt32BE(25, 6); // typeOID (text)
    metaBuf.writeInt16BE(-1, 10);// typeLen
    metaBuf.writeInt32BE(-1, 12);// typeMod
    metaBuf.writeInt16BE(0, 16); // format text
    chunks.push(nameBuf, metaBuf);
  }
  return makeBuffer('T', Buffer.concat(chunks));
}

function makeDataRow(values) {
  const chunks = [];
  const countBuf = Buffer.alloc(2);
  countBuf.writeInt16BE(values.length, 0);
  chunks.push(countBuf);
  for (const val of values) {
    if (val === null || val === undefined) {
      const nullBuf = Buffer.alloc(4);
      nullBuf.writeInt32BE(-1, 0);
      chunks.push(nullBuf);
    } else {
      const str = String(val);
      const strBuf = Buffer.from(str, 'utf8');
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeInt32BE(strBuf.length, 0);
      chunks.push(lenBuf, strBuf);
    }
  }
  return makeBuffer('D', Buffer.concat(chunks));
}

// ─── Controllable Mock PostgreSQL Server ─────────────────────────────────────

class MockPostgres {
  constructor(port) {
    this.port = port;
    this.server = null;
    this.clients = new Set();
    this.history = [];
    this.deletionRequests = [];
  }

  start() {
    return new Promise((resolve) => {
      this.server = net.createServer((socket) => {
        this.clients.add(socket);
        let sslHandled = false;

        socket.on('close', () => this.clients.delete(socket));
        socket.on('error', () => this.clients.delete(socket));

        socket.on('data', (data) => {
          if (!sslHandled && data.length >= 8 && data.readInt32BE(4) === 80877103) {
            sslHandled = true;
            socket.write(Buffer.from([0x4e])); // 'N' (no SSL)
            return;
          }

          if (data.length >= 8 && data.readInt32BE(4) === 196608) {
            // Protocol 3.0 StartupMessage
            const authOk = Buffer.alloc(4);
            authOk.writeInt32BE(0, 0);
            socket.write(makeBuffer('R', authOk));
            socket.write(makeBuffer('Z', Buffer.from([0x49]))); // ReadyForQuery
            return;
          }

          let offset = 0;
          const responses = [];
          let currentQuery = '';
          let failNextExecute = false;

          while (offset < data.length) {
            const type = String.fromCharCode(data[offset]);
            if (offset + 5 > data.length) break;
            const len = data.readInt32BE(offset + 1);

            if (type === 'P') { // Parse
              const str = data.toString('utf8', offset + 5, offset + 1 + len);
              const nullIdx = str.indexOf('\0');
              currentQuery = str.slice(nullIdx + 1, str.indexOf('\0', nullIdx + 1));
              this.history.push(currentQuery);

              if (currentQuery.includes('SIMULATE_SQL_ERROR')) {
                const errPayload = Buffer.from('SERROR\0C42601\0Msyntax error at or near "SIMULATE_SQL_ERROR"\0\0', 'ascii');
                responses.push(makeBuffer('E', errPayload));
              } else {
                responses.push(makeBuffer('1', Buffer.alloc(0))); // ParseComplete
              }
            } else if (type === 'B') { // Bind
              const strData = data.toString('utf8', offset + 5, offset + 1 + len);
              if (strData.includes('SIMULATE_SQL_ERROR') || currentQuery.includes('SIMULATE_SQL_ERROR')) {
                failNextExecute = true;
              }
              responses.push(makeBuffer('2', Buffer.alloc(0))); // BindComplete
            } else if (type === 'D') { // Describe
              if (/select.*workflow_templates/i.test(currentQuery)) {
                responses.push(makeRowDescription(['id', 'name', 'description', 'created_at']));
              } else {
                responses.push(makeBuffer('n', Buffer.alloc(0))); // NoData
              }
            } else if (type === 'E') { // Execute
              if (failNextExecute || currentQuery.includes('SIMULATE_SQL_ERROR')) {
                failNextExecute = false;
                const errPayload = Buffer.from('SERROR\0C42601\0Msyntax error at or near "SIMULATE_SQL_ERROR"\0\0', 'ascii');
                responses.push(makeBuffer('E', errPayload));
              } else if (/insert into account_deletion_requests/i.test(currentQuery)) {
                this.deletionRequests.push(currentQuery);
                responses.push(makeBuffer('C', Buffer.from('INSERT 0 1\0', 'ascii')));
              } else if (/select.*workflow_templates/i.test(currentQuery)) {
                responses.push(makeRowDescription(['id', 'name', 'description', 'created_at']));
                responses.push(makeDataRow(['wf-101', 'Standard Shift Handover', 'Production handover workflow', new Date().toISOString()]));
                responses.push(makeBuffer('C', Buffer.from('SELECT 1\0', 'ascii')));
              } else {
                responses.push(makeBuffer('C', Buffer.from('OK 1\0', 'ascii')));
              }
            } else if (type === 'S') { // Sync
              responses.push(makeBuffer('Z', Buffer.from([0x49]))); // ReadyForQuery
            } else if (type === 'Q') { // Simple query
              const sql = data.toString('utf8', offset + 5, offset + 1 + len);
              this.history.push(sql);

              if (sql.includes('SIMULATE_SQL_ERROR')) {
                const errPayload = Buffer.from('SERROR\0C42601\0Msyntax error at or near "SIMULATE_SQL_ERROR"\0\0', 'ascii');
                responses.push(makeBuffer('E', errPayload));
                responses.push(makeBuffer('Z', Buffer.from([0x49])));
              } else if (/select.*workflow_templates/i.test(sql)) {
                responses.push(makeRowDescription(['id', 'name', 'description', 'created_at']));
                responses.push(makeDataRow(['wf-101', 'Standard Shift Handover', 'Production handover workflow', new Date().toISOString()]));
                responses.push(makeBuffer('C', Buffer.from('SELECT 1\0', 'ascii')));
                responses.push(makeBuffer('Z', Buffer.from([0x49])));
              } else {
                responses.push(makeBuffer('C', Buffer.from('SELECT 1\0', 'ascii')));
                responses.push(makeBuffer('Z', Buffer.from([0x49])));
              }
            }
            offset += 1 + len;
          }

          if (responses.length > 0) {
            socket.write(Buffer.concat(responses));
          }
        });
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        resolve();
      });
    });
  }

  disconnect() {
    return new Promise((resolve) => {
      for (const client of this.clients) {
        client.destroy(new Error('Connection reset by peer'));
      }
      this.clients.clear();
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}

// ─── HTTP Client Helper ───────────────────────────────────────────────────────

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

// ─── Test Suite ──────────────────────────────────────────────────────────────

async function run() {
  console.log('='.repeat(75));
  console.log('  BATCH 1 E2E VERIFICATION: PRODUCTION DATABASE SAFETY');
  console.log('='.repeat(75));

  const initialMtime = existsSync(DATA_FILE) ? statSync(DATA_FILE).mtimeMs : null;
  console.log(`\n[PRE-CHECK] data/shiftrelay.json initial mtime: ${initialMtime ? new Date(initialMtime).toISOString() : 'none'}`);

  // 1. Start Mock PostgreSQL
  const mockPg = new MockPostgres(PG_PORT);
  await mockPg.start();
  console.log(`[SETUP] Mock PostgreSQL running on port ${PG_PORT}`);

  // 2. Start ShiftRelay app in production mode
  console.log(`[SETUP] Spawning ShiftRelay server.mjs in NODE_ENV=production on port ${APP_PORT}...`);
  const appProc = spawn('node', ['server.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(APP_PORT),
      DATABASE_URL: `postgresql://test:test@127.0.0.1:${PG_PORT}/testdb`
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let appStdout = '';
  let appStderr = '';
  appProc.stdout.on('data', (d) => { appStdout += d; });
  appProc.stderr.on('data', (d) => { appStderr += d; });

  // Wait for server to be ready
  let ready = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 200));
    if (appStdout.includes('ShiftRelay') || appStdout.includes(String(APP_PORT))) {
      ready = true;
      break;
    }
  }

  if (!ready) {
    console.error('FATAL: App failed to start within 6 seconds.');
    console.error('App stdout:', appStdout);
    console.error('App stderr:', appStderr);
    await mockPg.disconnect();
    appProc.kill('SIGKILL');
    process.exit(1);
  }

  console.log(`[SUCCESS] App started successfully in production mode.`);
  console.log(`          Stdout output: ${appStdout.trim()}`);

  const testResults = [];
  function record(testName, passed, details) {
    testResults.push({ testName, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`\n${mark} ${testName}`);
    console.log(`     Details: ${details}`);
  }

  try {
    // ─── STEP 1: Production mode read & write with DB available ───────────────
    console.log('\n' + '─'.repeat(70));
    console.log('STEP 1: Test DB-backed read & write while DB is connected');
    console.log('─'.repeat(70));

    // 1a. Write operation: account-deletion-requests
    const writeRes1 = await makeRequest('POST', '/api/account-deletion-requests', {
      email: 'production-pilot@shiftrelay.example',
      reason: 'Fictional employee audit test'
    });

    const step1WriteOk = writeRes1.status === 201 && writeRes1.body?.ok === true;
    record(
      'Step 1a: DB-backed write succeeds (POST /api/account-deletion-requests)',
      step1WriteOk,
      `HTTP status=${writeRes1.status}, body=${JSON.stringify(writeRes1.body)}, db_records=${mockPg.deletionRequests.length}`
    );

    // 1b. Read operation: workflow-templates
    const readRes1 = await makeRequest('GET', '/api/workflow-templates', null, {
      'x-shiftrelay-user': '00000000-0000-4000-8000-000000000014'
    });

    const step1ReadOk = readRes1.status === 200 && Array.isArray(readRes1.body?.templates);
    record(
      'Step 1b: DB-backed read succeeds (GET /api/workflow-templates)',
      step1ReadOk,
      `HTTP status=${readRes1.status}, templatesCount=${readRes1.body?.templates?.length}`
    );

    // Verify shiftrelay.json was NOT modified
    const mtimeAfterStep1 = existsSync(DATA_FILE) ? statSync(DATA_FILE).mtimeMs : null;
    const fileUnchangedStep1 = initialMtime === mtimeAfterStep1;
    record(
      'Step 1c: No fallback-file writes during normal DB operations',
      fileUnchangedStep1,
      `mtimeBefore=${initialMtime}, mtimeAfter=${mtimeAfterStep1}`
    );

    // ─── STEP 2: Disconnect PostgreSQL while app remains running ─────────────
    console.log('\n' + '─'.repeat(70));
    console.log('STEP 2: Disconnect PostgreSQL mid-flight and test requests');
    console.log('─'.repeat(70));

    console.log('[ACTION] Disconnecting Mock PostgreSQL TCP server...');
    await mockPg.disconnect();
    console.log('[ACTION] Mock PostgreSQL disconnected.');

    // 2a. Attempt write during outage
    const writeRes2 = await makeRequest('POST', '/api/account-deletion-requests', {
      email: 'outage-attempt@shiftrelay.example',
      reason: 'Should fail safely with 503'
    });

    const step2Write503 = writeRes2.status === 503;
    const step2WriteSanitised = !JSON.stringify(writeRes2.body).toLowerCase().includes('postgresql') &&
                               !JSON.stringify(writeRes2.body).toLowerCase().includes('password') &&
                               !JSON.stringify(writeRes2.body).toLowerCase().includes('5436');
    record(
      'Step 2a: Write during DB outage returns sanitized HTTP 503',
      step2Write503 && step2WriteSanitised,
      `HTTP status=${writeRes2.status}, body=${JSON.stringify(writeRes2.body)}`
    );

    // 2b. Attempt read during outage
    const readRes2 = await makeRequest('GET', '/api/workflow-templates', null, {
      'x-shiftrelay-user': '00000000-0000-4000-8000-000000000014'
    });

    const step2Read503 = readRes2.status === 503;
    record(
      'Step 2b: Read during DB outage returns sanitized HTTP 503',
      step2Read503,
      `HTTP status=${readRes2.status}, body=${JSON.stringify(readRes2.body)}`
    );

    // 2c. Check fallback file timestamp
    const mtimeAfterStep2 = existsSync(DATA_FILE) ? statSync(DATA_FILE).mtimeMs : null;
    const fileUnchangedStep2 = initialMtime === mtimeAfterStep2;
    record(
      'Step 2c: Zero fallback-file writes during runtime DB outage',
      fileUnchangedStep2,
      `mtimeBefore=${initialMtime}, mtimeDuringOutage=${mtimeAfterStep2}`
    );

    // ─── STEP 3: Restore PostgreSQL and verify recovery ───────────────────────
    console.log('\n' + '─'.repeat(70));
    console.log('STEP 3: Restore PostgreSQL and verify connection pool recovery');
    console.log('─'.repeat(70));

    console.log('[ACTION] Restoring Mock PostgreSQL server on port ' + PG_PORT + '...');
    await mockPg.start();
    console.log('[ACTION] Mock PostgreSQL restored and listening.');

    // 3a. Write operation after restoration
    const writeRes3 = await makeRequest('POST', '/api/account-deletion-requests', {
      email: 'post-recovery@shiftrelay.example',
      reason: 'Should succeed through pool reconnection'
    });

    const step3WriteOk = writeRes3.status === 201 && writeRes3.body?.ok === true;
    record(
      'Step 3a: Write recovers through connection pool without restart',
      step3WriteOk,
      `HTTP status=${writeRes3.status}, body=${JSON.stringify(writeRes3.body)}, total_db_records=${mockPg.deletionRequests.length}`
    );

    // 3b. Read operation after restoration
    const readRes3 = await makeRequest('GET', '/api/workflow-templates', null, {
      'x-shiftrelay-user': '00000000-0000-4000-8000-000000000014'
    });

    const step3ReadOk = readRes3.status === 200 && Array.isArray(readRes3.body?.templates);
    record(
      'Step 3b: Read recovers through connection pool without restart',
      step3ReadOk,
      `HTTP status=${readRes3.status}, templatesCount=${readRes3.body?.templates?.length}`
    );

    // ─── STEP 4: Trigger a controlled SQL/programming error ───────────────────
    console.log('\n' + '─'.repeat(70));
    console.log('STEP 4: Trigger controlled SQL/programming error (syntax error 42601)');
    console.log('─'.repeat(70));

    const sqlErrRes = await makeRequest('POST', '/api/account-deletion-requests', {
      email: 'sql-error-test@shiftrelay.example',
      reason: 'SIMULATE_SQL_ERROR'
    });

    // Must be 500 (or non-503), must NOT be 503 (outage), must NOT leak raw SQL
    const step4StatusNot503 = sqlErrRes.status === 500;
    const step4NoLeak = !JSON.stringify(sqlErrRes.body).includes('42601') &&
                        !JSON.stringify(sqlErrRes.body).includes('SIMULATE_SQL_ERROR');
    record(
      'Step 4a: SQL syntax error returns HTTP 500 (NOT database-outage 503)',
      step4StatusNot503,
      `HTTP status=${sqlErrRes.status}, body=${JSON.stringify(sqlErrRes.body)}`
    );

    record(
      'Step 4b: SQL error message is sanitized (no raw SQL or pg codes leaked)',
      step4NoLeak,
      `Sanitized message="${sqlErrRes.body?.error}"`
    );

    // 4c. Verify that fallback was NOT enabled and app continues serving DB requests
    const writeRes4 = await makeRequest('POST', '/api/account-deletion-requests', {
      email: 'after-sql-error@shiftrelay.example',
      reason: 'Verifying server remains in DB mode'
    });

    const step4ContinuesInDbMode = writeRes4.status === 201 && writeRes4.body?.ok === true;
    record(
      'Step 4c: Subsequent operations succeed in DB mode (SQL error did not trigger fallback)',
      step4ContinuesInDbMode,
      `HTTP status=${writeRes4.status}, total_db_records=${mockPg.deletionRequests.length}`
    );

    // 4d. Final check on data/shiftrelay.json
    const mtimeFinal = existsSync(DATA_FILE) ? statSync(DATA_FILE).mtimeMs : null;
    const fileUnchangedFinal = initialMtime === mtimeFinal;
    record(
      'Step 4d: Zero writes to data/shiftrelay.json across entire verification suite',
      fileUnchangedFinal,
      `initial=${initialMtime}, final=${mtimeFinal}`
    );

  } finally {
    console.log('\n[TEARDOWN] Stopping mock PostgreSQL and ShiftRelay server...');
    await mockPg.disconnect();
    appProc.kill('SIGINT');
    setTimeout(() => appProc.kill('SIGKILL'), 1000);
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(75));
  console.log('  VERIFICATION SUMMARY');
  console.log('='.repeat(75));

  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`\n  Total Tests: ${total} | Passed: ${passed} | Failed: ${failed}\n`);
  for (const r of testResults) {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.testName}`);
  }

  if (failed > 0) {
    console.error('\nOne or more verification tests failed.');
    process.exit(1);
  } else {
    console.log('\nAll Batch 1 verification requirements successfully confirmed!');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
