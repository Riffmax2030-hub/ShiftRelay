import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { execFileSync, spawn } from 'node:child_process';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';
import pg from 'pg';
import {
  buildStaffCardCredentials,
  parseStaffCardPayload,
  verifyStaffCardSecurityCode,
  sanitizeScanPhotoDataUrl,
  sanitizeFacialPhotoDataUrl,
  verifyStrictLiveGps,
  applyAutoShiftEndClosure,
  resolveOrgGeofenceConfig
} from './attendance-security.mjs';

const { Pool } = pg;
const USE_PG = process.argv.includes('--pg');
const UNIT_ONLY = process.argv.includes('--unit');
let PG_PORT = Number(process.env.SR_PG_PORT) || 55432;
const PG_BIN = 'C:\\Program Files\\PostgreSQL\\18\\bin';
const PG_DATA = join(process.env.TEMP || process.cwd(), 'disposable_pg_cluster_utf8');
let PG_URL = `postgres://postgres@127.0.0.1:${PG_PORT}/postgres`;

async function pickBindablePort(preferred) {
  const tryBind = (port) => new Promise((resolve) => {
    const srv = net.createServer();
    srv.unref();
    srv.once('error', () => resolve(null));
    srv.listen(port, '127.0.0.1', () => {
      const addr = srv.address();
      const chosen = typeof addr === 'object' && addr ? addr.port : null;
      srv.close(() => resolve(chosen));
    });
  });
  return (await tryBind(preferred)) || (await tryBind(0)) || preferred;
}

const WIN_ARTIFACT_DIR = 'C:\\Users\\DATA ENG. OLA\\.gemini\\antigravity\\brain\\af65195c-f6f5-4f1b-843a-e3eb86a344fb';
const ARTIFACT_DIR = process.env.SR_ARTIFACT_DIR || (process.platform === 'win32' && existsSync(WIN_ARTIFACT_DIR) ? WIN_ARTIFACT_DIR : join(tmpdir(), 'shiftrelay-verify-artifacts'));
const STORE_PATH = join(process.cwd(), 'data', 'shiftrelay.json');
const PORT = USE_PG ? 4329 : 4319;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ONSITE_COORDS = { latitude: 6.4312, longitude: 3.4244, accuracy: 14 };
const OFFSITE_COORDS = { latitude: 6.4485, longitude: 3.3642, accuracy: 12 };

async function runUnitChecks() {
  console.log('1. Running attendance-security.mjs unit checks...');
  const org = {
    id: '00000000-0000-4000-8000-000000000100',
    organisation_code: 'RIF-2026',
    hub_name: 'Riffmax Software Engineering Hub',
    hub_lat: 6.4312,
    hub_lng: 3.4244,
    hub_perimeter: 120
  };
  const geo = resolveOrgGeofenceConfig(org);
  assert.equal(geo.hubLat, 6.4312);
  assert.equal(geo.hubLng, 3.4244);
  assert.equal(geo.perimeterMeters, 120);

  // Missing GPS
  assert.throws(
    () => verifyStrictLiveGps(org, null, {}, { actionLabel: 'clock in' }),
    err => err.statusCode === 400 && err.errorCode === 'GPS_REQUIRED'
  );

  // Zero (0,0) GPS
  assert.throws(
    () => verifyStrictLiveGps(org, null, { coords: { latitude: 0, longitude: 0, accuracy: 10 } }, { actionLabel: 'clock in' }),
    err => err.statusCode === 400 && err.errorCode === 'GPS_INVALID'
  );

  // Coarse GPS > 300m accuracy
  assert.throws(
    () => verifyStrictLiveGps(org, null, { coords: { latitude: 6.4312, longitude: 3.4244, accuracy: 450 } }, { actionLabel: 'clock in' }),
    err => err.statusCode === 400 && err.errorCode === 'GPS_LOW_ACCURACY'
  );

  // Stale GPS fix (>3 min)
  assert.throws(
    () => verifyStrictLiveGps(org, null, {
      coords: { latitude: 6.4312, longitude: 3.4244, accuracy: 15, capturedAt: Date.now() - 10 * 60 * 1000 }
    }, { actionLabel: 'clock in', allowOfflineCaptured: false }),
    err => err.statusCode === 400 && err.errorCode === 'GPS_STALE'
  );

  // Jumping / erratic GPS samples > 200m
  assert.throws(
    () => verifyStrictLiveGps(org, null, {
      coords: { latitude: 6.4312, longitude: 3.4244, accuracy: 12, capturedAt: Date.now() },
      coordsSamples: [
        { latitude: 6.4312, longitude: 3.4244 },
        { latitude: 6.4312, longitude: 3.4244 },
        { latitude: 6.4450, longitude: 3.4400 }
      ]
    }, { actionLabel: 'clock in' }),
    err => err.statusCode === 400 && err.errorCode === 'GPS_ANOMALY_SPREAD'
  );

  // Off-site GPS (old legacy mock coord ~6.9km away)
  assert.throws(
    () => verifyStrictLiveGps(org, null, { coords: { ...OFFSITE_COORDS, capturedAt: Date.now() } }, { actionLabel: 'clock in' }),
    err => err.statusCode === 403 && err.errorCode === 'OUTSIDE_GEOFENCE'
  );

  // Valid on-site GPS
  const validProof = verifyStrictLiveGps(org, null, { coords: { ...ONSITE_COORDS, capturedAt: Date.now() } }, { actionLabel: 'clock in' });
  assert.equal(validProof.distanceMeters, 0);
  assert.equal(validProof.hubName, 'Riffmax Software Engineering Hub');

  // Card signing & tamper rejection
  const store = {};
  const creds = buildStaffCardCredentials('RIF-2026', 'RIF-0023', store);
  assert.equal(creds.cardVerifyCode.length, 6);
  assert.ok(creds.cardQrPayload.startsWith('SHIFTRELAY:ID:RIF-2026:RIF-0023:'));
  const parsed = parseStaffCardPayload(creds.cardQrPayload);
  assert.equal(parsed.orgCode, 'RIF-2026');
  assert.equal(parsed.staffId, 'RIF-0023');
  assert.equal(parsed.securityCode, creds.cardVerifyCode);
  assert.equal(verifyStaffCardSecurityCode({ orgCode: 'RIF-2026', staffId: 'RIF-0023', providedCode: creds.cardVerifyCode, storeOrSecret: store }), true);
  assert.equal(verifyStaffCardSecurityCode({ orgCode: 'RIF-2026', staffId: 'RIF-0023', providedCode: 'WRONG1', storeOrSecret: store }), false);
  assert.equal(verifyStaffCardSecurityCode({ orgCode: 'RIF-2026', staffId: 'RIF-0099', providedCode: creds.cardVerifyCode, storeOrSecret: store }), false);

  // Physical Staff ID Badge QR + explicit manual SEC verification checks
  const parsedRaw = parseStaffCardPayload('RIF-0023', creds.cardVerifyCode);
  assert.equal(parsedRaw.mode, 'physical_card');
  assert.equal(parsedRaw.staffId, 'RIF-0023');
  assert.equal(parsedRaw.securityCode, creds.cardVerifyCode);
  assert.equal(parsedRaw.isSignedQr, false);
  const legacyShort = parseStaffCardPayload(`SR:STAFF:RIF-0023:${creds.cardVerifyCode}`);
  assert.equal(legacyShort.mode, 'physical_card');
  assert.equal(legacyShort.staffId, 'RIF-0023');
  assert.equal(legacyShort.securityCode, creds.cardVerifyCode);
  assert.equal(legacyShort.isSignedQr, true);
  const unsignedOrgQr = parseStaffCardPayload('SHIFTRELAY:ID:RIF-2026:RIF-0023');
  assert.equal(unsignedOrgQr.orgCode, 'RIF-2026');
  assert.equal(unsignedOrgQr.staffId, 'RIF-0023');
  assert.equal(unsignedOrgQr.isSignedQr, false);

  // Mandatory live facial verification photo sanitization
  assert.equal(sanitizeFacialPhotoDataUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeFacialPhotoDataUrl('data:text/plain;base64,SGVsbG8='), null);
  assert.equal(sanitizeFacialPhotoDataUrl('data:image/jpeg;base64,' + 'A'.repeat(140000)), null);
  const validTinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgQmY9m8AAAAASUVORK5CYII=';
  assert.equal(sanitizeScanPhotoDataUrl(validTinyPng), validTinyPng);
  assert.equal(sanitizeFacialPhotoDataUrl(validTinyPng), validTinyPng);

  // Auto clock-out flags colleague_card_scan for supervisor review
  const cardShift = {
    id: 'shift-1',
    verificationMode: 'colleague_card_scan',
    clockedInAt: new Date(Date.now() - 9 * 3600000).toISOString(),
    clockedOutAt: null
  };
  applyAutoShiftEndClosure(cardShift, Date.now() - 3600000, { gpsVerifiedAtClose: false });
  assert.equal(cardShift.presenceVerificationStatus, 'pending_supervisor_confirm');
  assert.equal(cardShift.clockOutVerificationMode, 'auto_shift_end_unverified_card');
  console.log('   PASS: All attendance-security unit checks passed.');
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/health`);
      if (res.ok) return;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Test server did not start within timeout');
}

async function signInApi(email, companyId = 'RIF-2026') {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, email, password: String.fromCharCode(82, 105, 102, 102, 109, 97, 120, 50, 48, 50, 54, 33) })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`API sign-in failed for ${email}: ${data.error}`);
  const cookieHeader = res.headers.get('set-cookie');
  const cookie = cookieHeader ? cookieHeader.split(';')[0] : '';
  return { user: data.user, cookie };
}

async function apiJson(path, cookie, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Cookie': cookie,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function waitForPg(pool, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await pool.query('SELECT 1 as alive');
      if (res.rows[0]?.alive === 1) return true;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

async function main() {
  await runUnitChecks();
  if (UNIT_ONLY) return;
  mkdirSync(ARTIFACT_DIR, { recursive: true });

  const originalStoreRaw = existsSync(STORE_PATH) ? await readFile(STORE_PATH, 'utf8') : null;
  let child = null;
  let browser = null;
  let pgProc = null;
  let pgPool = null;

  const startServer = async () => {
    const proc = spawn(process.execPath, ['server.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(PORT),
        NODE_ENV: USE_PG ? 'production' : 'development',
        DATABASE_URL: USE_PG ? PG_URL : '',
        ALLOW_DEV_FALLBACK: USE_PG ? 'false' : 'true',
        ALLOW_DEV_DEMO_AUTH: USE_PG ? 'false' : 'true',
        SESSION_SECRET: '',
        CARD_SIGNING_SECRET: ''
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    proc.stdout.on('data', d => process.stdout.write(`   [srv] ${d}`));
    proc.stderr.on('data', d => process.stderr.write(`   [srv-err] ${d}`));
    try {
      await waitForServer(BASE_URL);
      return proc;
    } catch (err) {
      await stopServer(proc);
      throw err;
    }
  };

  const stopServer = (proc) => new Promise((resolve) => {
    if (!proc || proc.exitCode !== null) return resolve();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    proc.once('exit', finish);
    try { proc.kill('SIGTERM'); } catch (_) { finish(); }
    setTimeout(() => {
      if (!done && proc.pid && process.platform === 'win32') {
        try { execFileSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (_) {}
      }
      setTimeout(finish, 400);
    }, 600);
  });

  try {
    if (USE_PG) {
      PG_PORT = await pickBindablePort(PG_PORT);
      PG_URL = `postgres://postgres@127.0.0.1:${PG_PORT}/postgres`;
      console.log(`1b. Booting local PostgreSQL 18 cluster (${PG_DATA}) on port ${PG_PORT}...`);
      if (!existsSync(join(PG_DATA, 'PG_VERSION'))) {
        execFileSync(join(PG_BIN, 'initdb.exe'), ['-D', PG_DATA, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8', '--no-locale'], { stdio: 'inherit' });
      }
      pgProc = spawn(join(PG_BIN, 'postgres.exe'), ['-D', PG_DATA, '-p', String(PG_PORT)], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      pgPool = new Pool({ connectionString: PG_URL, max: 5 });
      const pgReady = await waitForPg(pgPool);
      if (!pgReady) throw new Error(`PostgreSQL 18 did not become ready on port ${PG_PORT}`);
      for (const tbl of ['user_sessions', 'time_entries', 'attendance_exceptions', 'reminder_dispatches', 'scheduled_shifts', 'leave_requests', 'notifications', 'app_kv_store', 'work_events', 'work_items', 'audit_events']) {
        try { await pgPool.query(`DELETE FROM ${tbl}`); } catch (_) {}
      }
      console.log('   PostgreSQL 18 ready (production database mode).');
    } else {
      // Prepare isolated clean store copy (keep org/contracts/members, clear volatile test punches)
      mkdirSync(dirname(STORE_PATH), { recursive: true });
      const cleanStore = originalStoreRaw ? JSON.parse(originalStoreRaw) : {};
      cleanStore.timeEntries = [];
      await writeFile(STORE_PATH, JSON.stringify(cleanStore, null, 2), 'utf8');
    }

    console.log(`2. Starting isolated ShiftRelay server (${USE_PG ? 'POSTGRES PRODUCTION' : 'LOCAL-DEMO'}) on port ${PORT}...`);
    child = await startServer();

    if (USE_PG) {
      const readyRes = await fetch(`${BASE_URL}/api/health/readiness`);
      const readyJson = await readyRes.json();
      assert.equal(readyJson.databaseMode, 'postgres-primary', 'Expected postgres-primary databaseMode');
    }

    console.log('3. Testing strict API enforcement (GPS + Card Security + Anti-Bypass)...');
    const owner = await signInApi('sherif@riffmax.tech');
    const supervisor = await signInApi('olaide@riffmax.tech');
    const babatunde = await signInApi('babatunde@riffmax.tech');
    const farouk = await signInApi('farouk@riffmax.tech');
    const ibrahim = await signInApi('ibrahim@riffmax.tech');

    // Directory must not leak secret card codes
    const dirRes = await apiJson('/api/directory', babatunde.cookie);
    assert.equal(dirRes.status, 200);
    assert.equal(dirRes.data.members.some(m => m.cardVerifyCode || m.cardQrPayload), false, 'Directory must not expose secret cardVerifyCode/cardQrPayload');

    // Non-managers must not dump team ID cards or presence review queue
    const workerCardsRes = await apiJson('/api/team/id-cards', babatunde.cookie);
    assert.equal(workerCardsRes.status, 403);
    const workerPresRes = await apiJson('/api/time-entries/presence-reviews', babatunde.cookie);
    assert.equal(workerPresRes.status, 403);

    // Fetch real card credentials as Supervisor
    const supCardsRes = await apiJson('/api/team/id-cards', supervisor.cookie);
    assert.equal(supCardsRes.status, 200);
    const suleimanCard = supCardsRes.data.cards.find(c => c.staffId === 'RIF-0023');
    const ngoziCard = supCardsRes.data.cards.find(c => c.staffId === 'RIF-0006');
    const ibrahimCard = supCardsRes.data.cards.find(c => c.staffId === ibrahim.user.staffId);
    assert.ok(suleimanCard?.cardVerifyCode && suleimanCard?.cardQrPayload);
    assert.ok(ngoziCard?.cardVerifyCode);
    assert.ok(ibrahimCard?.cardVerifyCode && ibrahimCard?.cardQrPayload);

    // Clock-in without GPS -> 400
    const noGpsClockIn = await apiJson('/api/time-entries/clock-in', farouk.cookie, { method: 'POST', body: {} });
    assert.equal(noGpsClockIn.status, 400);

    // Clock-in off-site -> 403 OUTSIDE_GEOFENCE
    const offSiteClockIn = await apiJson('/api/time-entries/clock-in', farouk.cookie, {
      method: 'POST',
      body: { coords: { ...OFFSITE_COORDS, capturedAt: Date.now() } }
    });
    assert.equal(offSiteClockIn.status, 403);
    assert.equal(offSiteClockIn.data.code, 'OUTSIDE_GEOFENCE');

    // Clock-in on-site -> 201, then worker attempts supervisor_override clock-out -> 403 SUPERVISOR_REQUIRED
    const onSiteClockIn = await apiJson('/api/time-entries/clock-in', farouk.cookie, {
      method: 'POST',
      body: { coords: { ...ONSITE_COORDS, capturedAt: Date.now() } }
    });
    assert.equal(onSiteClockIn.status, 201);
    const fakeOverrideOut = await apiJson('/api/time-entries/clock-out', farouk.cookie, {
      method: 'POST',
      body: { verificationMode: 'supervisor_override', coords: { ...ONSITE_COORDS, capturedAt: Date.now() } }
    });
    assert.equal(fakeOverrideOut.status, 403);
    assert.equal(fakeOverrideOut.data.code, 'SUPERVISOR_REQUIRED');

    // Self-scan blocked -> 403 SELF_SCAN_FORBIDDEN
    const selfScan = await apiJson('/api/time-entries/peer-card-scan', babatunde.cookie, {
      method: 'POST',
      body: { badgePayload: babatunde.user.cardQrPayload, coords: { ...ONSITE_COORDS, capturedAt: Date.now() } }
    });
    assert.equal(selfScan.status, 403);
    assert.equal(selfScan.data.code, 'SELF_SCAN_FORBIDDEN');

    // Wrong card security code -> 403 INVALID_CARD_SECURITY_CODE
    const badCodeScan = await apiJson('/api/time-entries/peer-card-scan', babatunde.cookie, {
      method: 'POST',
      body: { badgePayload: 'RIF-0023', cardVerifyCode: 'ZZZZZZ', coords: { ...ONSITE_COORDS, capturedAt: Date.now() } }
    });
    assert.equal(badCodeScan.status, 403);
    assert.equal(badCodeScan.data.code, 'INVALID_CARD_SECURITY_CODE');

    // Valid card code but off-site GPS -> 403 OUTSIDE_GEOFENCE
    const offSiteScan = await apiJson('/api/time-entries/peer-card-scan', babatunde.cookie, {
      method: 'POST',
      body: { badgePayload: 'RIF-0023', cardVerifyCode: suleimanCard.cardVerifyCode, coords: { ...OFFSITE_COORDS, capturedAt: Date.now() } }
    });
    assert.equal(offSiteScan.status, 403);
    assert.equal(offSiteScan.data.code, 'OUTSIDE_GEOFENCE');

    // Clock-In Assisted Workflow API checks: preview -> mandatory facial photo -> handover & checklists -> exit scan
    const ibrahimPreview = await apiJson('/api/time-entries/peer-card-preview', babatunde.cookie, {
      method: 'POST',
      body: {
        badgePayload: ibrahimCard.cardQrPayload,
        coords: { ...ONSITE_COORDS, capturedAt: Date.now() }
      }
    });
    assert.equal(ibrahimPreview.status, 200);
    assert.equal(ibrahimPreview.data.worker?.staffId, ibrahim.user.staffId);
    assert.equal(ibrahimPreview.data.alreadyOnShift, false);
    assert.ok(ibrahimPreview.data.assistedBrief?.handover?.summary);
    assert.ok(Array.isArray(ibrahimPreview.data.assistedBrief?.checklistTasks));

    // Missing live facial capture -> 400 FACIAL_PHOTO_REQUIRED
    const missingFaceScan = await apiJson('/api/time-entries/peer-card-scan', babatunde.cookie, {
      method: 'POST',
      body: {
        badgePayload: ibrahimCard.cardQrPayload,
        coords: { ...ONSITE_COORDS, capturedAt: Date.now() }
      }
    });
    assert.equal(missingFaceScan.status, 400, 'Physical ID card scan without live facial photo must be blocked');
    assert.equal(missingFaceScan.data.code, 'FACIAL_PHOTO_REQUIRED');

    const SAMPLE_SCAN_PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgQmY9m8AAAAASUVORK5CYII=';
    const ibrahimLiveScanIn = await apiJson('/api/time-entries/peer-card-scan', babatunde.cookie, {
      method: 'POST',
      body: {
        badgePayload: ibrahimCard.cardQrPayload,
        scanPhotoDataUrl: SAMPLE_SCAN_PHOTO,
        coords: { ...ONSITE_COORDS, capturedAt: Date.now() }
      }
    });
    assert.equal(ibrahimLiveScanIn.status, 200);
    assert.equal(ibrahimLiveScanIn.data.cardProofMode, 'physical_badge_facial_verify');
    assert.equal(ibrahimLiveScanIn.data.hasPhotoProof, true);
    assert.equal(ibrahimLiveScanIn.data.identityVerified, true, 'Peer check-in response must include identityVerified: true');
    assert.equal(ibrahimLiveScanIn.data.identityLabel, 'Identity Verified', 'Peer check-in response must include Identity Verified label');
    assert.ok(ibrahimLiveScanIn.data.assistedBrief?.handover);

    // Helper completes handover acceptance & checklists on behalf of Ibrahim
    const nonScannerComplete = await apiJson('/api/time-entries/peer-assisted-complete', farouk.cookie, {
      method: 'POST',
      body: { targetMembershipId: ibrahim.user.id, acknowledgeHandover: true }
    });
    assert.equal(nonScannerComplete.status, 403, 'Colleague who did not scan worker cannot submit assisted handover');
    assert.equal(nonScannerComplete.data.code, 'ASSISTED_SESSION_REQUIRED');

    const firstTaskId = ibrahimLiveScanIn.data.assistedBrief?.checklistTasks?.[0]?.id;
    const assistedComplete = await apiJson('/api/time-entries/peer-assisted-complete', babatunde.cookie, {
      method: 'POST',
      body: {
        targetMembershipId: ibrahim.user.id,
        handoverId: ibrahimLiveScanIn.data.assistedBrief?.handover?.id || 'ho-morning-01',
        taskStates: firstTaskId ? { [firstTaskId]: true } : {},
        readinessChecked: [true, true, true],
        acknowledgeHandover: true
      }
    });
    assert.equal(assistedComplete.status, 200);
    assert.equal(assistedComplete.data.handoverStatus, 'acknowledged');

    // Exit scan without facial photo must also fail -> with facial photo succeeds
    const missingFaceExit = await apiJson('/api/time-entries/peer-card-scan', babatunde.cookie, {
      method: 'POST',
      body: {
        action: 'clock-out',
        badgePayload: ibrahimCard.cardQrPayload,
        coords: { ...ONSITE_COORDS, capturedAt: Date.now() }
      }
    });
    assert.equal(missingFaceExit.status, 400);
    assert.equal(missingFaceExit.data.code, 'FACIAL_PHOTO_REQUIRED');

    const makeValidPngDataUrl = (r, g, b) => {
      const raw = Buffer.from([0, r, g, b, 255]);
      const hdr = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgQmY9m8AAAAASUVORK5CYII=', 'base64');
      return `data:image/png;base64,${Buffer.concat([hdr, raw]).toString('base64')}`;
    };
    const SAMPLE_EXIT_PHOTO = makeValidPngDataUrl(22, 163, 74);

    // Covered pitch-black camera frame must be rejected
    const darkFrameScan = await apiJson('/api/time-entries/peer-card-scan', babatunde.cookie, {
      method: 'POST',
      body: {
        action: 'clock-out',
        badgePayload: ibrahimCard.cardQrPayload,
        scanPhotoDataUrl: SAMPLE_EXIT_PHOTO,
        captureMeta: { captureSource: 'live_camera', meanLuma: 2, lumaStdDev: 0.5, livenessDelta: 0.2, dualFrameChecked: 1 },
        coords: { ...ONSITE_COORDS, capturedAt: Date.now() }
      }
    });
    assert.equal(darkFrameScan.status, 400, 'Pitch-black covered live camera frame must be rejected');
    assert.equal(darkFrameScan.data.code, 'FACE_FRAME_TOO_DARK');

    // Replaying exact same selfie hash from clock-in on exit scan must be blocked by Anti-Replay Guardrail
    const replayAttempt = await apiJson('/api/time-entries/peer-card-scan', babatunde.cookie, {
      method: 'POST',
      body: {
        action: 'clock-out',
        badgePayload: ibrahimCard.cardQrPayload,
        scanPhotoDataUrl: SAMPLE_SCAN_PHOTO,
        coords: { ...ONSITE_COORDS, capturedAt: Date.now() }
      }
    });
    assert.equal(replayAttempt.status, 403, 'Replaying an identical previous facial selfie hash must be blocked');
    assert.equal(replayAttempt.data.code, 'REPLAYED_FACE_PHOTO');

    const ibrahimLiveScanOut = await apiJson('/api/time-entries/peer-card-scan', babatunde.cookie, {
      method: 'POST',
      body: {
        action: 'clock-out',
        badgePayload: ibrahimCard.cardQrPayload,
        scanPhotoDataUrl: SAMPLE_EXIT_PHOTO,
        coords: { ...ONSITE_COORDS, capturedAt: Date.now() }
      }
    });
    assert.equal(ibrahimLiveScanOut.status, 200);
    assert.equal(ibrahimLiveScanOut.data.cardProofMode, 'physical_badge_facial_verify');

    console.log('   PASS: All API strict GPS, physical badge preview, mandatory facial photo, assisted handover & exit checks passed.');

    console.log('4. Running Playwright headless Chromium E2E UI verification...');
    browser = await chromium.launch({
      headless: true,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
    });

    // Context A: GPS DENIED / UNAVAILABLE
    const deniedContext = await browser.newContext({
      viewport: { width: 1280, height: 820 },
      permissions: []
    });
    const deniedPage = await deniedContext.newPage();
    // Override navigator.geolocation cleanly inside denied page to guarantee PositionError permission denied
    await deniedPage.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (_ok, err) => err({ code: 1, PERMISSION_DENIED: 1, message: 'User denied Geolocation' }),
          watchPosition: (_ok, err) => { err({ code: 1, PERMISSION_DENIED: 1, message: 'User denied Geolocation' }); return 0; },
          clearWatch: () => {}
        }
      });
    });

    // Inject valid session cookie for Babatunde into denied context
    const [bCookieName, bCookieVal] = babatunde.cookie.split('=');
    await deniedContext.addCookies([{ name: bCookieName, value: bCookieVal, domain: '127.0.0.1', path: '/' }]);
    await deniedPage.goto(BASE_URL, { waitUntil: 'networkidle' });
    await deniedPage.waitForSelector('#sr-btn-water-clock', { timeout: 10000 });

    // Click Clock In with denied GPS -> must block, must NOT clock in
    await deniedPage.click('#sr-btn-water-clock');
    await deniedPage.waitForFunction(
      () => {
        const txt = (document.getElementById('sr-gps-status-text')?.textContent || '').toLowerCase();
        return txt.includes('blocked') || txt.includes('denied') || txt.includes('required') || txt.includes('unavailable');
      },
      null,
      { timeout: 8000 }
    );
    const labelWhenDenied = await deniedPage.textContent('#sr-water-btn-label');
    assert.equal(labelWhenDenied.trim(), 'CLOCK IN', 'Worker must stay clocked out when GPS is denied');
    await deniedPage.screenshot({ path: join(ARTIFACT_DIR, 'strict-gps-blocked-ui.png') });

    // Open Colleague ID Card Scanner with denied GPS -> verify 0 quick-clock bypass buttons & submit blocked
    await deniedPage.click('#sr-btn-scan-peer-id');
    await deniedPage.waitForSelector('#sr-peer-id-form', { timeout: 6000 });
    const bypassButtonsCount = await deniedPage.locator('.sr-peer-quick-clock-btn').count();
    assert.equal(bypassButtonsCount, 0, 'Quick-clock roster bypass buttons must be completely removed');
    await deniedPage.fill('#sr-peer-staff-id-input', 'RIF-0023');
    await deniedPage.fill('#sr-peer-card-code-input', suleimanCard.cardVerifyCode);
    await deniedPage.click('#sr-peer-submit-id-btn');
    await deniedPage.waitForSelector('#sr-peer-scan-result', { state: 'visible', timeout: 6000 });
    const deniedScanBanner = await deniedPage.textContent('#sr-peer-scan-result');
    assert.match(deniedScanBanner, /GPS Verification Required/i);
    await deniedPage.screenshot({ path: join(ARTIFACT_DIR, 'strict-peer-scanner-gps-blocked.png') });
    await deniedContext.close();

    // Context B: VALID ON-SITE GPS + LIVE CAMERA
    const onsiteContext = await browser.newContext({
      viewport: { width: 1280, height: 820 },
      permissions: ['geolocation', 'camera'],
      geolocation: { latitude: ONSITE_COORDS.latitude, longitude: ONSITE_COORDS.longitude, accuracy: 12 }
    });
    const onsitePage = await onsiteContext.newPage();
    await onsiteContext.addCookies([{ name: bCookieName, value: bCookieVal, domain: '127.0.0.1', path: '/' }]);
    await onsitePage.goto(BASE_URL, { waitUntil: 'networkidle' });
    await onsitePage.waitForSelector('#sr-btn-water-clock', { timeout: 10000 });

    // Clock in on-site via UI button
    await onsitePage.click('#sr-btn-water-clock');
    await onsitePage.waitForFunction(
      () => (document.getElementById('sr-today-shift-status')?.textContent || '').toLowerCase().includes('active on shift'),
      null,
      { timeout: 8000 }
    );
    await onsitePage.screenshot({ path: join(ARTIFACT_DIR, 'strict-gps-onsite-clockin.png') });

    // Open Clock-In Page Peer Check-In Scanner -> Step 1: Verify Physical ID Card
    await onsitePage.click('#sr-btn-scan-peer-id');
    await onsitePage.waitForFunction(
      () => (document.getElementById('sr-scanner-gps-text')?.textContent || '').includes('On-Site GPS Lock Ready'),
      null,
      { timeout: 6000 }
    );
    assert.equal(await onsitePage.locator('#sr-scan-stepper').count(), 0, 'Cluttered stepper must be removed from Peer Check-In modal');
    assert.equal(await onsitePage.locator('#sr-peer-directory-list').count(), 0, 'Cluttered directory list must be removed from Peer Check-In modal');
    await onsitePage.screenshot({ path: join(ARTIFACT_DIR, 'strict-peer-step1.png') });
    await onsitePage.fill('#sr-peer-staff-id-input', 'RIF-0023');
    await onsitePage.fill('#sr-peer-card-code-input', suleimanCard.cardVerifyCode);
    await onsitePage.click('#sr-peer-submit-id-btn');

    // Step 2: Mandatory Live Facial Capture
    await onsitePage.waitForFunction(
      () => {
        const s2 = document.getElementById('sr-scan-step-2');
        const vid = document.getElementById('sr-facial-video');
        return s2 && s2.style.display === 'flex' && vid && vid.videoWidth > 0 && vid.videoHeight > 0;
      },
      null,
      { timeout: 10000 }
    );
    assert.equal(await onsitePage.isDisabled('#sr-btn-submit-face-checkin'), true, 'Clock-in submit must stay disabled until live facial photo is captured');
    await onsitePage.click('#sr-btn-capture-face');
    await onsitePage.waitForFunction(
      () => {
        const btn = document.getElementById('sr-btn-submit-face-checkin');
        const img = document.getElementById('sr-facial-preview-img');
        const banner = document.getElementById('sr-face-verified-banner');
        return btn && !btn.disabled && img && img.style.display === 'block' && img.src.startsWith('data:image/jpeg;base64,')
          && banner && banner.style.display !== 'none' && (banner.textContent || '').includes('Identity Verified');
      },
      null,
      { timeout: 6000 }
    );
    await onsitePage.screenshot({ path: join(ARTIFACT_DIR, 'strict-peer-facial-capture.png') });
    await onsitePage.click('#sr-btn-submit-face-checkin');

    // Step 3: Incoming Shift Handover Acceptance & Checklists
    await onsitePage.waitForFunction(
      () => {
        const s3 = document.getElementById('sr-scan-step-3');
        const hoTitle = document.getElementById('sr-assisted-ho-summary')?.textContent || '';
        return s3 && s3.style.display === 'flex' && hoTitle.trim().length > 0;
      },
      null,
      { timeout: 8000 }
    );
    await onsitePage.locator('.sr-assisted-task-chk').first().check().catch(() => {});
    await onsitePage.screenshot({ path: join(ARTIFACT_DIR, 'strict-peer-assisted-handover.png') });
    await onsitePage.click('#sr-btn-assisted-complete');
    await onsitePage.waitForFunction(
      () => {
        const pill = document.getElementById('sr-assisted-ho-status-pill')?.textContent || '';
        const closeBtn = document.getElementById('sr-btn-assisted-close');
        return pill.includes('HANDOVER ACCEPTED') && closeBtn && closeBtn.style.display !== 'none';
      },
      null,
      { timeout: 8000 }
    );
    await onsitePage.screenshot({ path: join(ARTIFACT_DIR, 'strict-peer-assisted-complete.png') });
    await onsitePage.click('#sr-btn-assisted-close');

    // Helper returns cleanly to their own Active On Shift Clock-In screen
    const stillActiveText = await onsitePage.textContent('#sr-today-shift-status');
    assert.ok((stillActiveText || '').toLowerCase().includes('active on shift'), 'Helper must stay signed into their own active shift after closing scanner');

    // Re-open scanner: duplicate same-shift card check-in blocked, Shift Exit Scan + live facial verification succeeds
    await onsitePage.click('#sr-btn-scan-peer-id');
    await onsitePage.waitForSelector('#sr-peer-staff-id-input', { timeout: 6000 });
    await onsitePage.fill('#sr-peer-staff-id-input', 'RIF-0023');
    await onsitePage.fill('#sr-peer-card-code-input', suleimanCard.cardVerifyCode);
    await onsitePage.click('#sr-peer-submit-id-btn');
    await onsitePage.waitForFunction(
      () => (document.getElementById('sr-peer-scan-result')?.textContent || '').toLowerCase().includes('already clocked in'),
      null,
      { timeout: 6000 }
    );

    // Switch to Shift Exit Scan -> capture live facial photo -> log exit
    await onsitePage.click('#sr-scan-mode-out');
    await onsitePage.click('#sr-peer-submit-id-btn');
    await onsitePage.waitForFunction(
      () => {
        const s2 = document.getElementById('sr-scan-step-2');
        const vid = document.getElementById('sr-facial-video');
        return s2 && s2.style.display === 'flex' && vid && vid.videoWidth > 0;
      },
      null,
      { timeout: 10000 }
    );
    await onsitePage.click('#sr-btn-capture-face');
    await onsitePage.waitForFunction(
      () => {
        const btn = document.getElementById('sr-btn-submit-face-checkin');
        return btn && !btn.disabled;
      },
      null,
      { timeout: 6000 }
    );
    const exitScanRespPromise = onsitePage.waitForResponse(
      r => r.url().includes('/api/time-entries/peer-card-scan') && r.request().method() === 'POST',
      { timeout: 15000 }
    );
    await onsitePage.click('#sr-btn-submit-face-checkin');
    const exitScanResp = await exitScanRespPromise;
    if (!exitScanResp.ok()) {
      const errBody = await exitScanResp.text().catch(() => '');
      throw new Error(`Step 4 Exit Scan API returned ${exitScanResp.status()}: ${errBody}`);
    }
    await onsitePage.waitForFunction(
      () => {
        const doneBox = document.getElementById('sr-scan-step-done');
        const txt = (document.getElementById('sr-done-summary-box')?.textContent || '').toLowerCase();
        return doneBox && doneBox.style.display === 'flex' && (txt.includes('exit verified') || txt.includes('early exit logged'));
      },
      null,
      { timeout: 10000 }
    );
    await onsitePage.screenshot({ path: join(ARTIFACT_DIR, 'strict-peer-scanner-exit-verified.png') });
    await onsitePage.click('#sr-btn-finish-scan-done');

    // Try re-scanning RIF-0023 in same day after exit -> must block duplicate daily card check-in
    await onsitePage.click('#sr-btn-scan-peer-id');
    await onsitePage.waitForSelector('#sr-peer-staff-id-input', { timeout: 6000 });
    await onsitePage.fill('#sr-peer-staff-id-input', 'RIF-0023');
    await onsitePage.fill('#sr-peer-card-code-input', suleimanCard.cardVerifyCode);
    await onsitePage.click('#sr-peer-submit-id-btn');
    await onsitePage.waitForFunction(
      () => (document.getElementById('sr-peer-scan-result')?.textContent || '').toLowerCase().includes('already completed'),
      null,
      { timeout: 6000 }
    );

    // Close scanner and verify Worker Profile ("Me") renders clean Physical Staff ID Card (no 45s TOTP / no printed Card Sec leak)
    await onsitePage.click('#sr-btn-close-scanner');
    await onsitePage.click('[data-sr-view="me"]');
    await onsitePage.waitForSelector('#sr-profile-qr-svg', { timeout: 6000 });
    const meCardText = await onsitePage.textContent('#sr-content-area');
    assert.ok(
      (meCardText.includes('Official Staff ID Card') || meCardText.includes('Digital Staff Pass')) && !meCardText.includes('LIVE 45s TOTP') && !meCardText.includes('Card Sec:'),
      'Worker ID card must display Digital Staff Pass / Official Staff ID Card without 45s TOTP rotation or printed Card Sec'
    );
    await onsitePage.screenshot({ path: join(ARTIFACT_DIR, 'strict-worker-physical-id.png') });
    await onsiteContext.close();

    // Part C: Auto-Out Hold & Supervisor Presence Review Workflow
    console.log('5. Verifying Auto Clock-Out Payroll Hold & Supervisor Presence Review...');
    const ngoziCheckIn = await apiJson('/api/time-entries/peer-card-scan', babatunde.cookie, {
      method: 'POST',
      body: {
        badgePayload: 'RIF-0006',
        cardVerifyCode: ngoziCard.cardVerifyCode,
        scanPhotoDataUrl: SAMPLE_SCAN_PHOTO,
        coords: { ...ONSITE_COORDS, capturedAt: Date.now() }
      }
    });
    assert.equal(ngoziCheckIn.status, 200);
    assert.equal(ngoziCheckIn.data.cardProofMode, 'physical_badge_facial_verify');
    assert.equal(ngoziCheckIn.data.hasPhotoProof, true);

    // Stop server so edits/backdating load cleanly on restart, backdate Ngozi's card entry >=25h (so yesterday's 14:00 shift_end is always expired at any hour)
    await stopServer(child);
    child = null;
    await new Promise(r => setTimeout(r, 250));
    const backdateHours = new Date().getDate() > 1 ? 25 : 15;
    if (USE_PG) {
      const upd = await pgPool.query(
        `UPDATE time_entries SET clocked_in_at = now() - interval '${backdateHours} hours' WHERE membership_id = $1 AND clocked_out_at IS NULL RETURNING id`,
        [ngoziCard.id]
      );
      assert.ok(upd.rows.length === 1, 'Expected Ngozi open entry in PostgreSQL time_entries');
    } else {
      const midStore = JSON.parse(await readFile(STORE_PATH, 'utf8'));
      const ngoziEntry = midStore.timeEntries.find(e => e.membershipId === ngoziCard.id && !e.clockedOutAt);
      assert.ok(ngoziEntry, 'Expected Ngozi open entry in store');
      ngoziEntry.clockedInAt = new Date(Date.now() - backdateHours * 3600000).toISOString();
      await writeFile(STORE_PATH, JSON.stringify(midStore, null, 2), 'utf8');
    }

    child = await startServer();
    const owner2 = await signInApi('sherif@riffmax.tech');
    const supervisor2 = await signInApi('olaide@riffmax.tech');
    const babatunde2 = await signInApi('babatunde@riffmax.tech');
    assert.equal(babatunde2.user.cardVerifyCode, babatunde.user.cardVerifyCode, 'Staff ID HMAC cardVerifyCode must persist across server restarts');

    // Supervisor fetches presence reviews -> triggers shift-boundary sweep + creates review item
    const reviewsBefore = await apiJson('/api/time-entries/presence-reviews', supervisor2.cookie);
    assert.equal(reviewsBefore.status, 200);
    const ngoziReview = reviewsBefore.data.reviews.find(r => r.membershipId === ngoziCard.id);
    assert.ok(ngoziReview, `Auto-out card shift without exit scan must enter pending_supervisor_confirm queue (reviews=${JSON.stringify(reviewsBefore.data.reviews?.map(r => r.membershipId))})`);
    assert.equal(ngoziReview.cardProofMode, 'physical_badge_facial_verify');
    assert.equal(ngoziReview.hasPhotoProof, true);

    // Owner checks payroll -> Ngozi must be held in hold_presence_review!
    const payrollBefore = await apiJson('/api/payroll/summary', owner2.cookie);
    assert.equal(payrollBefore.status, 200);
    assert.ok(payrollBefore.data.payroll.summary.unverifiedShiftHolds >= 1);
    const ngoziPayrollBefore = payrollBefore.data.payroll.employees.find(e => e.staffId === 'RIF-0006');
    assert.equal(ngoziPayrollBefore.status, 'hold_presence_review');
    assert.ok(ngoziPayrollBefore.absenceDeduction > 0, 'Unverified auto-out hold must deduct from payroll until confirmed');

    // Open Supervisor Overview in Playwright -> see Auto Clock-Out Presence Verification item -> Confirm Full Shift
    const [sCookieName, sCookieVal] = supervisor2.cookie.split('=');
    const supContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const supPage = await supContext.newPage();
    await supContext.addCookies([{ name: sCookieName, value: sCookieVal, domain: '127.0.0.1', path: '/' }]);
    await supPage.goto(BASE_URL, { waitUntil: 'networkidle' });
    await supPage.waitForSelector('[data-action="confirm-presence"]', { timeout: 10000 });
    await supPage.locator('#sr-presence-reviews-card').scrollIntoViewIfNeeded();
    await supPage.screenshot({ path: join(ARTIFACT_DIR, 'strict-sup-presence-review.png') });

    // Confirm presence in UI -> card item must disappear immediately
    await supPage.click('[data-action="confirm-presence"]');
    await supPage.waitForFunction(
      () => document.querySelectorAll('[data-action="confirm-presence"]').length === 0 &&
            (document.getElementById('sr-presence-reviews-card')?.textContent || '').includes('(0)'),
      null,
      { timeout: 8000 }
    );
    await supPage.screenshot({ path: join(ARTIFACT_DIR, 'strict-sup-presence-cleared.png') });
    await supContext.close();

    // Owner checks payroll after confirmation -> hold released!
    const payrollAfter = await apiJson('/api/payroll/summary', owner2.cookie);
    assert.equal(payrollAfter.status, 200);
    assert.equal(payrollAfter.data.payroll.summary.unverifiedShiftHolds, 0);
    const ngoziPayrollAfter = payrollAfter.data.payroll.employees.find(e => e.staffId === 'RIF-0006');
    assert.equal(ngoziPayrollAfter.status, 'verified_ready');

    console.log('6. Verifying Security Hardening, CORS, Auth Gates, WebAuthn & Web Hosting Routes...');
    // Unauthenticated endpoints must return 401
    for (const [method, path, body] of [
      ['GET', '/api/riffmax/payslips', null],
      ['POST', '/api/supervisor/override', { workerId: 'x' }],
      ['GET', '/api/payroll/ledger?gross=200000', null],
      ['POST', '/api/settlements/paystack-transfer', { amountNgn: 1000 }],
      ['POST', '/api/settlements/mono-lookup', { bankCode: '044' }],
      ['GET', '/api/datacenter/state', null],
      ['GET', '/api/hitl/state', null],
      ['POST', '/api/auth/executive-onboard', { companyId: 'RIF-2026', email: 'sherif@riffmax.tech', password: 'Password123!', confirmPassword: 'Password123!' }],
      ['GET', '/api/reports/payroll-ledger', null],
      ['POST', '/api/emails/test-send', { to: 'victim@example.com' }],
      ['POST', '/api/newsletter/dispatch-weekly', { to: 'victim@example.com' }],
      ['GET', '/api/compliance/audit-voucher', null],
      ['GET', '/api/events/perimeter-breaches', null],
      ['POST', '/api/auth/webauthn/register-options', {}],
      ['POST', '/api/auth/webauthn/register-verify', { id: 'fake' }]
    ]) {
      const r = await apiJson(path, '', body ? { method, body } : { method });
      assert.equal(r.status, 401, `Expected 401 for unauthenticated ${method} ${path}, got ${r.status}`);
    }

    // Worker role cannot read payroll summaries, payslips, ledger reports, supervisor overrides, or executive onboard -> 403 / 401
    for (const [method, path, body, expectedStatus] of [
      ['GET', '/api/payroll/tenant-summary', null, 403],
      ['GET', '/api/riffmax/payslips', null, 403],
      ['GET', '/api/reports/payroll-ledger', null, 403],
      ['POST', '/api/supervisor/override', { workerId: 'x' }, 403],
      ['POST', '/api/auth/executive-onboard', { companyId: 'RIF-2026', email: 'sherif@riffmax.tech', password: 'Password123!', confirmPassword: 'Password123!' }, 401]
    ]) {
      const r = await apiJson(path, babatunde2.cookie, body ? { method, body } : { method });
      assert.equal(r.status, expectedStatus, `Expected ${expectedStatus} for worker on ${method} ${path}, got ${r.status}`);
    }

    // Authenticated owner can access own tenant summary and ledger; invalid activation token fails cleanly
    const ownSummary = await apiJson('/api/payroll/tenant-summary?tenant=RIF-2026', owner2.cookie);
    assert.equal(ownSummary.status, 200);
    const badActivate = await apiJson('/api/auth/activate', '', {
      method: 'POST',
      body: { token: 'nonexistent-token', newPassword: 'ValidPassword123!' }
    });
    assert.equal(badActivate.status, 404);

    // Authenticated owner can calculate statutory payroll ledger
    const authedLedger = await apiJson('/api/payroll/ledger?gross=300000', owner2.cookie);
    assert.equal(authedLedger.status, 200);
    assert.ok(authedLedger.data.netPay > 0);

    // WebAuthn login-verify spoofing without real credential + challenge assertion must fail with 401
    const waOpt = await apiJson('/api/auth/webauthn/login-options', '', {
      method: 'POST',
      body: { email: 'sherif@riffmax.tech', companyId: 'RIF-2026' }
    });
    assert.equal(waOpt.status, 200);
    const waSpoof = await apiJson('/api/auth/webauthn/login-verify', '', {
      method: 'POST',
      body: { email: 'sherif@riffmax.tech', companyId: 'RIF-2026' }
    });
    assert.equal(waSpoof.status, 401, 'WebAuthn login-verify must reject requests lacking device assertion & enrolled credential');

    // CORS allowlist: reject evil origin, allow Capacitor WebView origin
    const evilPreflight = await fetch(`${BASE_URL}/api/config`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil-attacker.example', 'Access-Control-Request-Method': 'POST' }
    });
    assert.equal(evilPreflight.status, 403);
    assert.equal(evilPreflight.headers.get('access-control-allow-origin'), null);
    assert.equal(evilPreflight.headers.get('access-control-allow-credentials'), null);

    const evilGet = await fetch(`${BASE_URL}/api/config`, { headers: { Origin: 'https://evil-attacker.example' } });
    assert.equal(evilGet.status, 200);
    assert.equal(evilGet.headers.get('access-control-allow-origin'), null);
    assert.equal(evilGet.headers.get('access-control-allow-credentials'), null);

    const nativePreflight = await fetch(`${BASE_URL}/api/config`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://localhost', 'Access-Control-Request-Method': 'POST' }
    });
    assert.equal(nativePreflight.status, 204);
    assert.equal(nativePreflight.headers.get('access-control-allow-origin'), 'https://localhost');
    assert.equal(nativePreflight.headers.get('access-control-allow-credentials'), 'true');

    // Custom domain hosting routes, SEO files & subdomain partitioning
    for (const staticPath of ['/favicon.ico', '/robots.txt', '/sitemap.xml', '/website', '/pricing', '/privacy', '/terms', '/admin', '/activate', '/support-security', '/delete-account']) {
      const staticRes = await fetch(`${BASE_URL}${staticPath}`);
      assert.equal(staticRes.status, 200, `Expected 200 for ${staticPath}, got ${staticRes.status}`);
    }
    const robotsTxt = await (await fetch(`${BASE_URL}/robots.txt`)).text();
    assert.ok(robotsTxt.includes('Sitemap:') && robotsTxt.includes('/sitemap.xml'));
    const sitemapXml = await (await fetch(`${BASE_URL}/sitemap.xml`)).text();
    assert.ok(sitemapXml.includes('<urlset') && sitemapXml.includes('/website.html'));

    const marketingHostHome = await (await fetch(`${BASE_URL}/`, { headers: { 'X-Forwarded-Host': 'shiftrelayos.com' } })).text();
    assert.ok(marketingHostHome.includes('ShiftRelay — Verified Shift Operations'), 'Apex domain should serve website.html on /');
    const wwwHostHome = await (await fetch(`${BASE_URL}/`, { headers: { 'X-Forwarded-Host': 'www.shiftrelayos.com' } })).text();
    assert.ok(wwwHostHome.includes('ShiftRelay — Verified Shift Operations'), 'www subdomain should serve website.html on /');
    const appHostHome = await (await fetch(`${BASE_URL}/`, { headers: { 'X-Forwarded-Host': 'app.shiftrelayos.com' } })).text();
    assert.ok(appHostHome.includes('ShiftRelay — Verified Frontline') && appHostHome.includes('sr-login-modal'), 'app subdomain should serve index.html on /');
    const adminHostHome = await (await fetch(`${BASE_URL}/`, { headers: { 'X-Forwarded-Host': 'admin.shiftrelayos.com' } })).text();
    assert.ok(adminHostHome.includes('ShiftRelay OS | Admin Console'), 'admin subdomain should serve admin.html on /');

    for (const verifyPath of ['/verify/ledger/RIF-2026/2026-11', '/verify/worker/RIF-0001', '/verify/SR-CERT-2026']) {
      const verifyRes = await fetch(`${BASE_URL}${verifyPath}`);
      assert.equal(verifyRes.status, 200, `Public verification route ${verifyPath} must return 200`);
    }

    console.log('7. Testing Biometric HR Passport Enrollment, Executive Add-Staff & Daily Safety Checklists...');
    const PASSPORT_TEST_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    // 7a) Enroll official HR passport photo for Ibrahim & verify peer-card-preview returns referencePhotoUrl
    const workerPassportTry = await apiJson(`/api/team/members/${encodeURIComponent(ibrahim.user.id)}/passport-photo`, babatunde2.cookie, {
      method: 'POST',
      body: { passportPhotoDataUrl: PASSPORT_TEST_IMG }
    });
    assert.equal(workerPassportTry.status, 403, 'Frontline worker cannot overwrite HR passport photos for colleagues');

    const enrollPassport = await apiJson(`/api/team/members/${encodeURIComponent(ibrahim.user.id)}/passport-photo`, owner2.cookie, {
      method: 'POST',
      body: { passportPhotoDataUrl: PASSPORT_TEST_IMG }
    });
    assert.equal(enrollPassport.status, 200);
    assert.equal(enrollPassport.data.referencePhotoUrl, PASSPORT_TEST_IMG);

    const previewWithPassport = await apiJson('/api/time-entries/peer-card-preview', babatunde2.cookie, {
      method: 'POST',
      body: { badgePayload: ibrahim.user.cardQrPayload, coords: { ...ONSITE_COORDS, capturedAt: Date.now() } }
    });
    assert.equal(previewWithPassport.status, 200);
    assert.equal(previewWithPassport.data.worker?.hasReferencePhoto, true);
    assert.equal(previewWithPassport.data.worker?.referencePhotoUrl, PASSPORT_TEST_IMG);

    // 7b) Executive Self-Serve Add New Staff + Department (owner permitted, worker blocked)
    const workerAddTry = await apiJson('/api/executive/staff', babatunde2.cookie, {
      method: 'POST',
      body: { fullName: 'Unauthorized Add', email: 'unauth.add@riffmax.tech', department: 'Operations' }
    });
    assert.equal(workerAddTry.status, 403);

    const uniqueNewEmail = `ngozi.${Date.now()}@riffmax.tech`;
    const execAddStaff = await apiJson('/api/executive/staff', owner2.cookie, {
      method: 'POST',
      body: {
        fullName: 'Ngozi Okeke',
        email: uniqueNewEmail,
        phone: '+2348095551234',
        department: 'Cold Chain Quality',
        role: 'worker',
        title: 'Cold Room Auditor',
        baseSalary: 185000,
        passportPhotoDataUrl: PASSPORT_TEST_IMG
      }
    });
    assert.equal(execAddStaff.status, 201, `Executive add-staff failed: ${JSON.stringify(execAddStaff.data)}`);
    assert.equal(execAddStaff.data.staff?.department, 'Cold Chain Quality');
    assert.equal(execAddStaff.data.staff?.hasReferencePassport, true);
    assert.ok(execAddStaff.data.staff?.staffId && execAddStaff.data.staff?.cardVerifyCode);

    const dupAddStaff = await apiJson('/api/executive/staff', owner2.cookie, {
      method: 'POST',
      body: { fullName: 'Ngozi Duplicate', email: uniqueNewEmail, department: 'Cold Chain Quality' }
    });
    assert.equal(dupAddStaff.status, 409);
    assert.equal(dupAddStaff.data.code, 'DUPLICATE_STAFF_EMAIL');

    const dirAfterAdd = await apiJson('/api/directory', owner2.cookie);
    assert.equal(dirAfterAdd.status, 200);
    const addedMemberInDir = (dirAfterAdd.data.members || []).find(m => m.email === uniqueNewEmail);
    assert.ok(addedMemberInDir, 'Newly added staff must immediately appear in Workforce Directory');
    assert.equal(addedMemberInDir.department, 'Cold Chain Quality');
    assert.equal(addedMemberInDir.avatarUrl, PASSPORT_TEST_IMG);

    // 7c) Workplace Safety & Daily Checklists Config -> Syncs to /api/shift-tasks & Assisted Peer Preview
    const unauthAdminChecklists = await apiJson(`/api/admin/tenants/${encodeURIComponent(owner2.user.organisation_id)}/checklists`, '', {
      method: 'PUT',
      body: { dailyChecklists: [{ text: 'Unauthorized rule' }] }
    });
    assert.equal(unauthAdminChecklists.status, 401);

    const safetyRuleText = 'Inspect high-vis PPE vest, eye goggles & fire exit clearance';
    const saveOrgChecklists = await apiJson('/api/organisation/checklists', owner2.cookie, {
      method: 'PUT',
      body: {
        dailyChecklists: [
          { text: safetyRuleText, category: 'Workplace Safety', priority: 'urgent' },
          { text: 'Verify chemical SDS binder at workstation before shift handoff', category: 'PPE & Gear', priority: 'normal' }
        ]
      }
    });
    assert.equal(saveOrgChecklists.status, 200);
    assert.equal(saveOrgChecklists.data.dailyChecklists?.length, 2);

    const workerShiftTasks = await apiJson(`/api/shift-tasks?tenant=${encodeURIComponent(owner2.user.company_id || 'RIF-2026')}`, babatunde2.cookie);
    assert.equal(workerShiftTasks.status, 200);
    assert.ok((workerShiftTasks.data.dailyChecklists || []).some(c => c.text === safetyRuleText), 'Worker /api/shift-tasks must surface saved daily workplace safety rule');

    const previewChecklistSync = await apiJson('/api/time-entries/peer-card-preview', babatunde2.cookie, {
      method: 'POST',
      body: { badgePayload: ibrahim.user.cardQrPayload, coords: { ...ONSITE_COORDS, capturedAt: Date.now() } }
    });
    assert.equal(previewChecklistSync.status, 200);
    assert.ok((previewChecklistSync.data.assistedBrief?.checklistTasks || []).some(t => t.text === safetyRuleText && t.source === 'company_safety'), 'Peer scanner checklist must include company workplace safety rule');

    // 7d) UI Verification: Executive "+ Add New Staff" Button & Modal Opens Cleanly + Admin Checklists Builder DOM
    const execUiContext = await browser.newContext({ viewport: { width: 1366, height: 860 } });
    const [oCookieName, oCookieVal] = owner2.cookie.split('=');
    await execUiContext.addCookies([{ name: oCookieName, value: oCookieVal, domain: '127.0.0.1', path: '/' }]);
    const execUiPage = await execUiContext.newPage();
    await execUiPage.goto(BASE_URL, { waitUntil: 'networkidle' });
    await execUiPage.waitForSelector('#sr-analytics-add-staff-btn', { timeout: 15000 });
    await execUiPage.click('#sr-analytics-add-staff-btn');
    await execUiPage.waitForSelector('#sr-exec-add-staff-modal', { timeout: 5000 });
    await execUiPage.waitForSelector('#sr-add-staff-dept');
    await execUiPage.waitForSelector('#sr-add-staff-passport-input');

    const adminUiPage = await execUiContext.newPage();
    await adminUiPage.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await adminUiPage.waitForSelector('#ob-checklists-panel, #csv-sync-checklists', { state: 'attached', timeout: 8000 });
    await adminUiPage.waitForSelector('#csv-checklist-items', { state: 'attached', timeout: 8000 });
    await execUiContext.close();

    console.log('8. Testing Dayforce Attendance Policy, Exceptions, Watchdog Reminders, Payroll Sync & Mobile 390x844 Walkthrough...');
    // 8a) Non-manager 403 isolation across payroll, contracts, reminders, team scores & exception resolution
    for (const [m, p, b] of [
      ['GET', '/api/contracts', null],
      ['POST', '/api/payroll/compile', {}],
      ['POST', '/api/payroll/dispatch', {}],
      ['GET', '/api/timesheets/pending-authorizations', null],
      ['POST', '/api/settlements/paystack-transfer', { amountNgn: 5000 }],
      ['GET', '/api/shift-scores/team', null],
      ['POST', '/api/reminders/run-watchdog', {}],
      ['POST', '/api/attendance/exceptions/ex-fake/resolve', { decision: 'pardon', reason: 'Attempted self pardon' }]
    ]) {
      const isolatedRes = await apiJson(p, babatunde2.cookie, b ? { method: m, body: b } : { method: m });
      assert.equal(isolatedRes.status, 403, `Worker must receive 403 on ${m} ${p}, got ${isolatedRes.status}`);
    }

    // Activate freshly created staff member Ngozi & verify isolated /api/earnings (no cross-user leak / dummy fallback)
    const activationTokenMatch = String(execAddStaff.data.activationUrl || '').match(/token=([^&]+)/);
    assert.ok(activationTokenMatch?.[1], 'Activation token must be generated for newly added staff');
    const activateNgozi = await apiJson('/api/auth/activate', '', {
      method: 'POST',
      body: {
        token: activationTokenMatch[1],
        verificationCode: '1234',
        newPassword: String.fromCharCode(82, 105, 102, 102, 109, 97, 120, 50, 48, 50, 54, 33)
      }
    });
    assert.equal(activateNgozi.status, 200, `Failed to activate added worker: ${JSON.stringify(activateNgozi.data)}`);
    const ngozi2 = await signInApi(uniqueNewEmail);
    const ngoziEarnings = await apiJson('/api/earnings', ngozi2.cookie);
    assert.equal(ngoziEarnings.status, 200);
    assert.equal(ngoziEarnings.data.ok, true);
    assert.equal(ngoziEarnings.data.statement?.grossPay, 185000, 'Newly created worker must see only their own provisioned ₦185,000 contract');
    const ngoziPayslip = await apiJson('/api/worker-payslip', ngozi2.cookie);
    assert.equal(ngoziPayslip.status, 200);
    assert.equal(ngoziPayslip.data.payslip?.staffName, 'Ngozi Okeke', 'Worker payslip must belong strictly to signed-in worker');
    assert.notEqual(ngoziPayslip.data.payslip?.staffName, babatunde2.user.name, 'Worker payslip must never leak colleague payslip');
    const babatundeEarnings = await apiJson('/api/earnings', babatunde2.cookie);
    assert.equal(babatundeEarnings.status, 200);
    assert.equal(babatundeEarnings.data.ok, true);
    const babatundePayslip = await apiJson('/api/worker-payslip', babatunde2.cookie);
    assert.equal(babatundePayslip.status, 200);
    assert.equal(babatundePayslip.data.payslip?.staffName, babatunde2.user.name, 'Babatunde /api/worker-payslip must stay scoped strictly to Babatunde');

    // 8b) Employer Configurable Attendance Policy + Persistent Worker Policy Acknowledgement
    const savePolicyRes = await apiJson('/api/organisation/attendance-policy', owner2.cookie, {
      method: 'PUT',
      body: {
        graceMinutes: 15,
        missedClockInAction: 'exception_review',
        missedClockOutAction: 'exception_review',
        earlyDepartureAction: 'exception_review',
        lateArrivalDeductionMode: 'pro_rata_minutes',
        reminderScheduleMinutes: [30, 15, 0, 20]
      }
    });
    assert.equal(savePolicyRes.status, 200);
    assert.equal(savePolicyRes.data.policy?.graceMinutes, 15);
    assert.ok(savePolicyRes.data.policy?.policyVersion, 'Updated policy must stamp a policyVersion');

    const farouk2 = await signInApi('farouk@riffmax.tech');
    const faroukPolBefore = await apiJson('/api/organisation/attendance-policy', farouk2.cookie);
    assert.equal(faroukPolBefore.status, 200);
    assert.equal(faroukPolBefore.data.policyRequiresAck, true, 'Updated policy version must require fresh worker acknowledgement');

    const ackBabatunde = await apiJson('/api/auth/acknowledge-policy', babatunde2.cookie, { method: 'POST', body: {} });
    assert.equal(ackBabatunde.status, 200);
    assert.equal(ackBabatunde.data.policyRequiresAck, false);
    const sessionBabatunde = await apiJson('/api/auth/session', babatunde2.cookie);
    assert.equal(sessionBabatunde.status, 200);
    assert.equal(sessionBabatunde.data.user?.policyRequiresAck, false, 'Worker policy acknowledgement must persist across session fetches');

    // 8c) Schedule a shift starting 25m ago for Ngozi (no clock-in today) -> Watchdog Idempotency & Missing-at-Shift-Start Queue
    const nowMs = Date.now();
    const ngoziShiftStart = new Date(nowMs - 25 * 60 * 1000).toISOString();
    const ngoziShiftEnd = new Date(nowMs + 7 * 3600 * 1000).toISOString();
    const schedNgoziShift = await apiJson('/api/calendar/shifts', owner2.cookie, {
      method: 'POST',
      body: { membershipId: execAddStaff.data.staff.id, startsAt: ngoziShiftStart, endsAt: ngoziShiftEnd }
    });
    assert.equal(schedNgoziShift.status, 201, `Scheduling test shift failed: ${JSON.stringify(schedNgoziShift.data)}`);

    // Also schedule an unclocked shift earlier in this month for Babatunde (contracted worker) so exception payroll impact & 409 gate are tested end-to-end
    const nowDate = new Date();
    const sameMonthStartMs = nowDate.getUTCDate() > 2
      ? Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate() - 1, 7, 0, 0)
      : nowMs - 40 * 60 * 1000;
    const babatundeShiftEndMs = sameMonthStartMs + 8 * 3600 * 1000;
    const schedBabatundeShift = await apiJson('/api/calendar/shifts', owner2.cookie, {
      method: 'POST',
      body: {
        membershipId: babatunde2.user.id,
        startsAt: new Date(sameMonthStartMs).toISOString(),
        endsAt: new Date(babatundeShiftEndMs).toISOString()
      }
    });
    assert.equal(schedBabatundeShift.status, 201, `Scheduling Babatunde exception shift failed: ${JSON.stringify(schedBabatundeShift.data)}`);

    const watchdog1 = await apiJson('/api/reminders/run-watchdog', supervisor2.cookie, { method: 'POST', body: {} });
    assert.equal(watchdog1.status, 200);
    assert.equal(watchdog1.data.ok, true);
    const watchdog2 = await apiJson('/api/reminders/run-watchdog', supervisor2.cookie, { method: 'POST', body: {} });
    assert.equal(watchdog2.status, 200);
    assert.equal(watchdog2.data.dispatchedCount, 0, 'Immediate second watchdog run must be idempotent and emit 0 duplicate alerts');

    const excListBefore = await apiJson('/api/attendance/exceptions', supervisor2.cookie);
    assert.equal(excListBefore.status, 200);
    assert.ok(
      (excListBefore.data.missingAtShiftStart || []).some(m => m.membershipId === execAddStaff.data.staff.id),
      'Missing-at-Shift-Start queue must flag overdue unclocked worker past grace period'
    );

    // 8d) Punch Correction fixes requestedClockOut on shift date + Single-Source Exception Deduction + 409 Payroll Dispatch Gate
    const faroukEntries = await apiJson('/api/time-entries', farouk2.cookie);
    assert.equal(faroukEntries.status, 200);
    const faroukEntry = faroukEntries.data.active || faroukEntries.data.entries?.[0];
    assert.ok(faroukEntry?.id, 'Expected open time entry for Farouk');

    // Cross-worker punch correction attempt blocked (403)
    const hijackPunch = await apiJson('/api/timesheets/punch-correction', babatunde2.cookie, {
      method: 'POST',
      body: { timeEntryId: faroukEntry.id, requestedClockOut: '17:30', reason: 'Cross-worker attempt' }
    });
    assert.equal(hijackPunch.status, 403, 'Worker must not file punch corrections for another worker time entry');

    const submitPunch = await apiJson('/api/timesheets/punch-correction', farouk2.cookie, {
      method: 'POST',
      body: { timeEntryId: faroukEntry.id, requestedClockOut: '17:30', reason: 'Gate scanner queue at shift close' }
    });
    assert.equal(submitPunch.status, 201);
    const pendingCorrections = await apiJson('/api/timesheets/pending-authorizations', supervisor2.cookie);
    assert.equal(pendingCorrections.status, 200);
    const targetCorrection = (pendingCorrections.data.corrections || []).find(c => c.timeEntryId === faroukEntry.id);
    assert.ok(targetCorrection?.id, 'Submitted punch correction must appear in supervisor pending queue');

    const authCorrection = await apiJson('/api/timesheets/authorize', supervisor2.cookie, {
      method: 'POST',
      body: { correctionId: targetCorrection.id, decision: 'authorized', reason: 'Verified gate logbook departure 17:30' }
    });
    assert.equal(authCorrection.status, 200);
    assert.ok(authCorrection.data.clockedOutAt, 'Authorized punch correction must apply clockedOutAt');
    const authHourUtc = new Date(authCorrection.data.clockedOutAt).getUTCHours();
    const authMinUtc = new Date(authCorrection.data.clockedOutAt).getUTCMinutes();
    assert.equal(`${String(authHourUtc).padStart(2, '0')}:${String(authMinUtc).padStart(2, '0')}`, '16:30', '17:30 WAT (Africa/Lagos) must resolve cleanly to 16:30 UTC on the shift date');

    // Test 409 UNRESOLVED_EXCEPTIONS gate + worker explain + resolve missing reason guard + pardon vs unexcused single deduction
    const pendingExcList = await apiJson('/api/attendance/exceptions', supervisor2.cookie);
    const pendingEx = (pendingExcList.data.exceptions || []).find(ex => ex.status === 'pending_review');
    assert.ok(pendingEx?.id, 'Expected at least one pending_review attendance exception');

    const blockedDispatch = await apiJson('/api/payroll/dispatch', owner2.cookie, { method: 'POST', body: {} });
    assert.equal(blockedDispatch.status, 409, 'Payroll dispatch without override must return 409 when exceptions remain unresolved');
    assert.equal(blockedDispatch.data.code, 'UNRESOLVED_EXCEPTIONS');

    // Find Babatunde's missed/pending exception (or any contracted worker's exception) to verify single-source payroll math
    const babatundeEx = (pendingExcList.data.exceptions || []).find(
      ex => (ex.membershipId === babatunde2.user.id || ex.userId === babatunde2.user.user_id || ex.userId === babatunde2.user.id) && ex.status === 'pending_review'
    ) || pendingEx;
    const explainOwnerCookie = babatundeEx.membershipId === babatunde2.user.id ? babatunde2.cookie : supervisor2.cookie;
    const explainRes = await apiJson(`/api/attendance/exceptions/${encodeURIComponent(babatundeEx.id)}/explain`, explainOwnerCookie, {
      method: 'POST',
      body: { explanation: 'Security perimeter verification delay at north gate' }
    });
    assert.equal(explainRes.status, 200);

    const noReasonResolve = await apiJson(`/api/attendance/exceptions/${encodeURIComponent(babatundeEx.id)}/resolve`, supervisor2.cookie, {
      method: 'POST',
      body: { decision: 'pardon', reason: '' }
    });
    assert.equal(noReasonResolve.status, 400, 'Resolving an exception without a reason note must return 400');

    const unexcusedRes = await apiJson(`/api/attendance/exceptions/${encodeURIComponent(babatundeEx.id)}/resolve`, supervisor2.cookie, {
      method: 'POST',
      body: { decision: 'unexcused', reason: 'Confirmed no prior supervisor notice' }
    });
    assert.equal(unexcusedRes.status, 200);
    assert.equal(unexcusedRes.data.exception?.status, 'unexcused');

    const payrollUnexcused = await apiJson('/api/payroll/summary', owner2.cookie);
    assert.equal(payrollUnexcused.status, 200);
    const babatundeRowUnexcused = payrollUnexcused.data.payroll.employees.find(e => e.userName === babatunde2.user.name || e.staffId === babatunde2.user.staffId);
    assert.ok(babatundeRowUnexcused, 'Contracted worker row must exist in payroll summary');
    assert.equal(babatundeRowUnexcused.attendanceDeductionDays, babatundeRowUnexcused.unexcusedAbsenceDays, 'Single-source payroll must not double-deduct open punch + exception days');
    const deductionWhenUnexcused = Number(babatundeRowUnexcused.absenceDeduction || 0);

    const pardonRes = await apiJson(`/api/attendance/exceptions/${encodeURIComponent(babatundeEx.id)}/resolve`, supervisor2.cookie, {
      method: 'POST',
      body: { decision: 'pardon', reason: 'Pardoned after gate log verification' }
    });
    assert.equal(pardonRes.status, 200);
    assert.equal(pardonRes.data.exception?.status, 'pardoned');

    const payrollPardoned = await apiJson('/api/payroll/summary', owner2.cookie);
    const babatundeRowPardoned = payrollPardoned.data.payroll.employees.find(e => e.userName === babatunde2.user.name || e.staffId === babatunde2.user.staffId);
    assert.ok(Number(babatundeRowPardoned.pardonedHours || 0) >= 0);
    assert.ok(Number(babatundeRowPardoned.absenceDeduction || 0) <= deductionWhenUnexcused, 'Pardoning an exception must not increase deductions');

    // Executive override dispatches cleanly even with remaining pending exception from Ngozi shift
    const overrideDispatch = await apiJson('/api/payroll/dispatch', owner2.cookie, {
      method: 'POST',
      body: { acknowledgeUnresolvedExceptions: true, overrideReason: 'QA automated override test' }
    });
    assert.equal(overrideDispatch.status, 200);

    // 8e) Mobile Viewport (390x844) Play Store Sign-In, Reload Persistence, Supervisor Muster & Executive Payroll Audit
    const guestMobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const guestMobilePage = await guestMobileCtx.newPage();
    const guestPageErrors = [];
    guestMobilePage.on('pageerror', e => guestPageErrors.push(e.message));
    await guestMobilePage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await guestMobilePage.waitForSelector('#sr-employer-provision-notice', { state: 'visible', timeout: 15000 });
    const noticeText = await guestMobilePage.textContent('#sr-employer-provision-notice');
    assert.ok(noticeText.toLowerCase().includes('company id') && (noticeText.includes('Request Company Pilot') || noticeText.includes('Book a Demo')), 'Sign-In screen must clearly guide workers to Company ID & demo/pilot link');
    assert.equal(guestPageErrors.length, 0, `Mobile Sign-In pageErrors: ${JSON.stringify(guestPageErrors)}`);
    await guestMobileCtx.close();

    // Farouk Mobile 390x844: Ack Policy Banner -> Reload Persistence -> Earnings View
    const [fCookieName, fCookieVal] = farouk2.cookie.split('=');
    const faroukMobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const faroukMobPage = await faroukMobCtx.newPage();
    const faroukPageErrors = [];
    const faroukAckResponses = [];
    faroukMobPage.on('pageerror', e => faroukPageErrors.push(e.message));
    faroukMobPage.on('response', r => {
      if (r.url().includes('/api/auth/acknowledge-policy')) {
        faroukAckResponses.push(`${r.status()} ${r.url()}`);
      }
    });
    await faroukMobCtx.addCookies([{ name: fCookieName, value: fCookieVal, domain: '127.0.0.1', path: '/' }]);
    await faroukMobPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await faroukMobPage.waitForSelector('#sr-btn-ack-attendance-policy', { state: 'visible', timeout: 15000 });
    await faroukMobPage.click('#sr-btn-ack-attendance-policy');
    try {
      await faroukMobPage.waitForSelector('#sr-policy-ack-banner', { state: 'detached', timeout: 8000 });
    } catch (waitErr) {
      const btnText = await faroukMobPage.textContent('#sr-btn-ack-attendance-policy').catch(() => null);
      const userDebug = await faroukMobPage.evaluate(() => ({
        srStateRequiresAck: window._srState?.user?.policyRequiresAck,
        activeRequiresAck: window._srActiveUser?.policyRequiresAck,
        hasUiModule: Boolean(window.ShiftRelayAttendanceUI?.bindPolicyAckHandlers),
        lsData: localStorage.getItem('shiftrelay-user-data')?.slice(0, 220)
      })).catch(() => null);
      throw new Error(`Policy banner did not detach (${waitErr.message}) | ackResponses=${JSON.stringify(faroukAckResponses)} | btnText=${JSON.stringify(btnText)} | pageErrors=${JSON.stringify(faroukPageErrors)} | userDebug=${JSON.stringify(userDebug)}`);
    }
    await faroukMobPage.reload({ waitUntil: 'domcontentloaded' });
    await faroukMobPage.waitForSelector('#sr-btn-water-clock', { timeout: 15000 });
    assert.equal(await faroukMobPage.locator('#sr-policy-ack-banner').count(), 0, 'Acknowledged policy banner must stay dismissed across page reload');
    await faroukMobPage.click('.sr-mobile-dock [data-sr-view="earnings"]');
    await faroukMobPage.waitForSelector('#sr-earnings-view-switch', { timeout: 10000 });
    assert.equal(faroukPageErrors.length, 0, `Worker Mobile pageErrors: ${JSON.stringify(faroukPageErrors)}`);
    await faroukMobCtx.close();

    // Supervisor Mobile 390x844: Missing-at-Shift-Start Muster & Watchdog Button
    const supMobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const supMobPage = await supMobCtx.newPage();
    const supPageErrors = [];
    supMobPage.on('pageerror', e => supPageErrors.push(e.message));
    await supMobCtx.addCookies([{ name: sCookieName, value: sCookieVal, domain: '127.0.0.1', path: '/' }]);
    await supMobPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await supMobPage.waitForSelector('#sr-sup-missing-muster-card', { timeout: 15000 });
    await supMobPage.waitForSelector('#sr-btn-run-reminder-watchdog', { timeout: 8000 });
    await supMobPage.click('#sr-btn-run-reminder-watchdog');
    await supMobPage.waitForTimeout(400);
    assert.equal(supPageErrors.length, 0, `Supervisor Mobile pageErrors: ${JSON.stringify(supPageErrors)}`);
    await supMobCtx.close();

    // Executive Mobile 390x844: Month Picker & Pre-Payroll Gate on Push to Finance
    const execMobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const execMobPage = await execMobCtx.newPage();
    const execPageErrors = [];
    execMobPage.on('pageerror', e => execPageErrors.push(e.message));
    await execMobCtx.addCookies([{ name: oCookieName, value: oCookieVal, domain: '127.0.0.1', path: '/' }]);
    await execMobPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await execMobPage.click('.sr-mobile-dock [data-sr-view="payroll"]');
    await execMobPage.waitForSelector('#sr-payroll-month-picker', { timeout: 15000 });

    // Owner Settings: open App Settings -> Admin tab -> Organisation Config -> Time, Attendance & Grace Policy UI renders & saves end-to-end
    await execMobPage.click('#sr-shell-settings');
    await execMobPage.waitForSelector('#sr-settings-subnav [data-stab="admin"]', { timeout: 15000 });
    await execMobPage.click('#sr-settings-subnav [data-stab="admin"]');
    await execMobPage.waitForSelector('#sr-btn-launch-org-settings', { timeout: 15000 });
    await execMobPage.click('#sr-btn-launch-org-settings');
    await execMobPage.waitForSelector('#sr-settings-attendance-policy-card', { timeout: 15000 });
    const policyGraceVal = await execMobPage.$eval('#sr-set-ap-grace', el => el.value);
    assert.ok(Number(policyGraceVal) >= 0 && Number(policyGraceVal) <= 60, `Expected valid graceMinutes input, got ${policyGraceVal}`);
    await execMobPage.fill('#sr-set-ap-grace', '12');
    await execMobPage.selectOption('#sr-set-ap-missed-out', 'exception_review');
    await Promise.all([
      execMobPage.waitForResponse(r => r.url().includes('/api/organisation/settings') && r.request().method() === 'PUT' && r.status() === 200, { timeout: 10000 }),
      execMobPage.click('#sr-settings-save')
    ]);
    await execMobPage.waitForSelector('#sr-settings-banner', { timeout: 10000 });

    // In-App Account Deletion UI (Apple App Store 5.1.1(v) & Google Play requirement)
    await execMobPage.click('#sr-shell-settings');
    await execMobPage.waitForSelector('#sr-settings-subnav [data-stab="account"]', { timeout: 15000 });
    await execMobPage.click('#sr-settings-subnav [data-stab="account"]');
    await execMobPage.waitForSelector('#sr-btn-toggle-delete-account', { timeout: 10000 });
    await execMobPage.click('#sr-btn-toggle-delete-account');
    await execMobPage.waitForSelector('#sr-account-delete-panel', { state: 'visible', timeout: 8000 });
    await execMobPage.fill('#sr-account-delete-reason', 'Play Store QA verification test');
    await execMobPage.check('#sr-account-delete-confirm');
    await Promise.all([
      execMobPage.waitForResponse(r => r.url().includes('/api/account-deletion-requests') && r.request().method() === 'POST' && r.status() === 201, { timeout: 10000 }),
      execMobPage.click('#sr-btn-submit-delete-account')
    ]);
    await execMobPage.waitForSelector('#sr-account-delete-msg', { state: 'visible', timeout: 8000 });
    const delMsg = await execMobPage.textContent('#sr-account-delete-msg');
    assert.match(delMsg || '', /received/i, 'In-app account deletion should display confirmation receipt');

    assert.equal(execPageErrors.length, 0, `Executive Mobile pageErrors: ${JSON.stringify(execPageErrors)}`);
    await execMobCtx.close();

    // Static Security Block & Public SEO Crawl Files
    for (const sensitivePath of ['/server.mjs', '/admin-auth.mjs', '/package.json', '/render.yaml', '/schema.sql', '/Dockerfile']) {
      const blockedRes = await fetch(`${BASE_URL}${sensitivePath}`);
      assert.equal(blockedRes.status, 403, `Sensitive path ${sensitivePath} must be blocked over static HTTP (got ${blockedRes.status})`);
    }
    const robotsRes = await fetch(`${BASE_URL}/robots.txt`);
    assert.equal(robotsRes.status, 200, 'robots.txt must return 200');
    assert.match(await robotsRes.text(), /Sitemap:\s*https:\/\/shiftrelayos\.com\/sitemap\.xml/);
    const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
    assert.equal(sitemapRes.status, 200, 'sitemap.xml must return 200');
    assert.match(await sitemapRes.text(), /https:\/\/shiftrelayos\.com\//);

    // Verify GET /api/organisation/settings reflects saved Attendance Policy
    const ownerMobCookie = `${oCookieName}=${oCookieVal}`;
    const orgSettingsAfter = await (await fetch(`${BASE_URL}/api/organisation/settings`, {
      headers: { Cookie: ownerMobCookie }
    })).json();
    assert.equal(orgSettingsAfter.attendancePolicy?.graceMinutes, 12, 'GET /api/organisation/settings should persist graceMinutes=12');
    assert.equal(orgSettingsAfter.attendancePolicy?.missedClockOutAction, 'exception_review', 'GET /api/organisation/settings should persist missedClockOutAction=exception_review');

    // Restore baseline graceMinutes=10 so subsequent checks/demo state stay predictable
    const restoreOrgSettingsRes = await fetch(`${BASE_URL}/api/organisation/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: ownerMobCookie },
      body: JSON.stringify({
        tradingName: orgSettingsAfter.organisation?.trading_name || 'Riffmax Technology',
        industry: orgSettingsAfter.organisation?.industry || 'operations',
        country: orgSettingsAfter.organisation?.country || 'Nigeria',
        timeZone: orgSettingsAfter.organisation?.time_zone || 'Africa/Lagos',
        language: orgSettingsAfter.organisation?.preferred_language || 'en',
        handoverReminderMinutes: orgSettingsAfter.organisation?.settings?.handoverReminderMinutes ?? 30,
        payModel: orgSettingsAfter.organisation?.settings?.payModel || 'monthly_salaried',
        disbursementDay: orgSettingsAfter.organisation?.settings?.disbursementDay || '25',
        defaultMonthlySalary: orgSettingsAfter.organisation?.settings?.defaultMonthlySalary || 240000,
        attendancePolicy: { graceMinutes: 10, missedClockOutAction: 'auto_cap_shift_end' }
      })
    });
    assert.equal(restoreOrgSettingsRes.status, 200, 'Should restore baseline owner attendance policy');

    console.log(`ALL STRICT GPS, ID CARD ANTI-BYPASS & PRESENCE VERIFICATION TESTS PASSED (${USE_PG ? 'POSTGRES PRODUCTION' : 'LOCAL-DEMO'})!`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (child) await stopServer(child);
    if (pgPool) await pgPool.end().catch(() => {});
    if (pgProc) {
      try { execFileSync(join(PG_BIN, 'pg_ctl.exe'), ['-D', PG_DATA, 'stop', '-m', 'immediate'], { stdio: 'ignore' }); } catch (_) {}
      try { pgProc.kill('SIGTERM'); } catch (_) {}
    }
    if (originalStoreRaw !== null) {
      await writeFile(STORE_PATH, originalStoreRaw, 'utf8');
    } else if (existsSync(STORE_PATH)) {
      await unlink(STORE_PATH).catch(() => {});
    }
  }
}

main().catch((err) => {
  console.error('TEST FAILURE:', err?.stack || err);
  process.exitCode = 1;
});
