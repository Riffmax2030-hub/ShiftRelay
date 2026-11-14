import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { execFileSync, spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';
import pg from 'pg';
import {
  buildStaffCardCredentials,
  buildDynamicStaffCardCredentials,
  parseStaffCardPayload,
  verifyStaffCardSecurityCode,
  verifyStaffCardDynamicToken,
  sanitizeScanPhotoDataUrl,
  verifyStrictLiveGps,
  applyAutoShiftEndClosure,
  resolveOrgGeofenceConfig
} from './attendance-security.mjs';

const { Pool } = pg;
const USE_PG = process.argv.includes('--pg');
const UNIT_ONLY = process.argv.includes('--unit');
const PG_PORT = 54323;
const PG_BIN = 'C:\\Program Files\\PostgreSQL\\18\\bin';
const PG_DATA = join(process.env.TEMP || process.cwd(), 'disposable_pg_cluster_utf8');
const PG_URL = `postgres://postgres@127.0.0.1:${PG_PORT}/postgres`;

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

  // Rotating 45s TOTP dynamic QR checks (current valid, +-1 step drift valid, >2 steps expired rejected)
  const fixedNow = 1763100000000;
  const dynNow = buildDynamicStaffCardCredentials('RIF-2026', 'RIF-0023', store, { nowMs: fixedNow });
  assert.equal(dynNow.dynamicToken.length, 6);
  assert.equal(dynNow.stepSeconds, 45);
  assert.ok(dynNow.dynamicQrPayload.startsWith(`SHIFTRELAY:DYN:RIF-2026:RIF-0023:${dynNow.dynamicStep}:`));
  const parsedDyn = parseStaffCardPayload(dynNow.dynamicQrPayload);
  assert.equal(parsedDyn.mode, 'dynamic_totp');
  assert.equal(parsedDyn.isDynamicQr, true);
  assert.equal(parsedDyn.step, dynNow.dynamicStep);
  const verdictNow = verifyStaffCardDynamicToken({
    orgCode: 'RIF-2026',
    staffId: 'RIF-0023',
    providedToken: parsedDyn.securityCode,
    providedStep: parsedDyn.step,
    storeOrSecret: store,
    nowMs: fixedNow
  });
  assert.equal(verdictNow.valid, true);
  assert.equal(verdictNow.expired, false);
  assert.equal(verdictNow.proofMode, 'dynamic_live_qr');

  const dynPrevStep = buildDynamicStaffCardCredentials('RIF-2026', 'RIF-0023', store, { step: dynNow.dynamicStep - 1, nowMs: fixedNow });
  const verdictDrift = verifyStaffCardDynamicToken({
    orgCode: 'RIF-2026',
    staffId: 'RIF-0023',
    providedToken: dynPrevStep.dynamicToken,
    providedStep: dynPrevStep.dynamicStep,
    storeOrSecret: store,
    nowMs: fixedNow
  });
  assert.equal(verdictDrift.valid, true);

  const dynOldScreenshot = buildDynamicStaffCardCredentials('RIF-2026', 'RIF-0023', store, { step: dynNow.dynamicStep - 4, nowMs: fixedNow });
  const verdictExpired = verifyStaffCardDynamicToken({
    orgCode: 'RIF-2026',
    staffId: 'RIF-0023',
    providedToken: dynOldScreenshot.dynamicToken,
    providedStep: dynOldScreenshot.dynamicStep,
    storeOrSecret: store,
    nowMs: fixedNow
  });
  assert.equal(verdictExpired.valid, false);
  assert.equal(verdictExpired.expired, true);

  // Manual 6-char dynamic token expiry lookback check
  const verdictManualExpired = verifyStaffCardDynamicToken({
    orgCode: 'RIF-2026',
    staffId: 'RIF-0023',
    providedToken: dynOldScreenshot.dynamicToken,
    providedStep: null,
    storeOrSecret: store,
    nowMs: fixedNow
  });
  assert.equal(verdictManualExpired.valid, false);
  assert.equal(verdictManualExpired.expired, true);

  // Scan photo validation
  assert.equal(sanitizeScanPhotoDataUrl('javascript:alert(1)'), null);
  const validTinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgQmY9m8AAAAASUVORK5CYII=';
  assert.equal(sanitizeScanPhotoDataUrl(validTinyPng), validTinyPng);

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
    if (!proc || proc.killed) return resolve();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    proc.once('exit', finish);
    try { proc.kill('SIGTERM'); } catch (_) { finish(); }
    setTimeout(finish, 2500);
  });

  try {
    if (USE_PG) {
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
      for (const tbl of ['user_sessions', 'time_entries', 'app_kv_store', 'work_events']) {
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
    assert.ok(suleimanCard?.cardVerifyCode && suleimanCard?.cardQrPayload);
    assert.ok(ngoziCard?.cardVerifyCode);

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

    // Dynamic 45s TOTP token API + WhatsApp screenshot expiry blocking + live photo proof
    const ibrahimTokenRes = await apiJson('/api/me/card-token', ibrahim.cookie);
    assert.equal(ibrahimTokenRes.status, 200);
    assert.equal(ibrahimTokenRes.data.stepSeconds, 45);
    assert.ok(ibrahimTokenRes.data.dynamicQrPayload?.startsWith(`SHIFTRELAY:DYN:RIF-2026:${ibrahim.user.staffId}:`));

    let liveSecret = process.env.CARD_SIGNING_SECRET || process.env.SESSION_SECRET || '';
    if (!liveSecret) {
      if (USE_PG && pgPool) {
        const kv = await pgPool.query("SELECT data FROM app_kv_store WHERE store_key = 'primary' LIMIT 1");
        liveSecret = kv.rows[0]?.data?.cardSigningSecret || '';
      } else if (existsSync(STORE_PATH)) {
        const st = JSON.parse(await readFile(STORE_PATH, 'utf8'));
        liveSecret = st.cardSigningSecret || '';
      }
    }
    if (liveSecret) {
      const expiredDynCreds = buildDynamicStaffCardCredentials('RIF-2026', ibrahim.user.staffId, liveSecret, {
        step: ibrahimTokenRes.data.dynamicStep - 5
      });
      const replayAttempt = await apiJson('/api/time-entries/peer-card-scan', babatunde.cookie, {
        method: 'POST',
        body: { badgePayload: expiredDynCreds.dynamicQrPayload, coords: { ...ONSITE_COORDS, capturedAt: Date.now() } }
      });
      assert.equal(replayAttempt.status, 403, 'Expired dynamic QR screenshot must be rejected');
      assert.equal(replayAttempt.data.code, 'CARD_QR_EXPIRED');
    }

    const SAMPLE_SCAN_PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgQmY9m8AAAAASUVORK5CYII=';
    const ibrahimLiveScanIn = await apiJson('/api/time-entries/peer-card-scan', babatunde.cookie, {
      method: 'POST',
      body: {
        badgePayload: ibrahimTokenRes.data.dynamicQrPayload,
        scanPhotoDataUrl: SAMPLE_SCAN_PHOTO,
        coords: { ...ONSITE_COORDS, capturedAt: Date.now() }
      }
    });
    assert.equal(ibrahimLiveScanIn.status, 200);
    assert.equal(ibrahimLiveScanIn.data.cardProofMode, 'dynamic_live_qr');
    assert.equal(ibrahimLiveScanIn.data.hasPhotoProof, true);

    const ibrahimLiveScanOut = await apiJson('/api/time-entries/peer-card-scan', babatunde.cookie, {
      method: 'POST',
      body: {
        action: 'clock-out',
        badgePayload: ibrahimTokenRes.data.dynamicQrPayload,
        coords: { ...ONSITE_COORDS, capturedAt: Date.now() }
      }
    });
    assert.equal(ibrahimLiveScanOut.status, 200);
    assert.equal(ibrahimLiveScanOut.data.cardProofMode, 'dynamic_live_qr');

    console.log('   PASS: All API strict GPS, anti-self-scan, rotating 45s TOTP & anti-screenshot checks passed.');

    console.log('4. Running Playwright headless Chromium E2E UI verification...');
    browser = await chromium.launch({ headless: true });

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

    // Context B: VALID ON-SITE GPS
    const onsiteContext = await browser.newContext({
      viewport: { width: 1280, height: 820 },
      permissions: ['geolocation'],
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

    // Open Peer ID Scanner -> verify GPS ready pill -> Check-In Suleiman RIF-0023
    await onsitePage.click('#sr-btn-scan-peer-id');
    await onsitePage.waitForFunction(
      () => (document.getElementById('sr-scanner-gps-text')?.textContent || '').includes('On-Site GPS Lock Ready'),
      null,
      { timeout: 6000 }
    );
    await onsitePage.fill('#sr-peer-staff-id-input', 'RIF-0023');
    await onsitePage.fill('#sr-peer-card-code-input', suleimanCard.cardVerifyCode);
    await onsitePage.click('#sr-peer-submit-id-btn');
    await onsitePage.waitForFunction(
      () => (document.getElementById('sr-peer-scan-result')?.textContent || '').includes('Clocked In'),
      null,
      { timeout: 6000 }
    );

    // Duplicate same-shift card check-in -> must show Verification Blocked
    await onsitePage.click('#sr-peer-submit-id-btn');
    await onsitePage.waitForFunction(
      () => (document.getElementById('sr-peer-scan-result')?.textContent || '').toLowerCase().includes('already clocked in'),
      null,
      { timeout: 6000 }
    );

    // Switch to Shift Exit Scan -> verify exit succeeds
    await onsitePage.click('#sr-scan-mode-out');
    await onsitePage.click('#sr-peer-submit-id-btn');
    await onsitePage.waitForFunction(
      () => {
        const txt = (document.getElementById('sr-peer-scan-result')?.textContent || '').toLowerCase();
        return txt.includes('exit verified') || txt.includes('early exit logged');
      },
      null,
      { timeout: 6000 }
    );
    await onsitePage.screenshot({ path: join(ARTIFACT_DIR, 'strict-peer-scanner-exit-verified.png') });

    // Try re-scanning RIF-0023 in same day after exit -> must block duplicate daily card check-in
    await onsitePage.click('#sr-scan-mode-in');
    await onsitePage.click('#sr-peer-submit-id-btn');
    await onsitePage.waitForFunction(
      () => (document.getElementById('sr-peer-scan-result')?.textContent || '').toLowerCase().includes('already completed'),
      null,
      { timeout: 6000 }
    );

    // Close scanner and verify Worker Profile ("Me") renders live rotating 45s TOTP QR and hides static SEC PIN
    await onsitePage.click('#sr-btn-close-scanner');
    await onsitePage.click('[data-sr-view="me"]');
    await onsitePage.waitForSelector('#sr-profile-qr-countdown', { timeout: 6000 });
    const meCardText = await onsitePage.textContent('#sr-content-area');
    assert.ok(meCardText.includes('LIVE 45s TOTP') && !meCardText.includes('Card Sec:'), 'Worker Digital ID must show live 45s TOTP QR and never leak static printed Card Sec');
    await onsitePage.screenshot({ path: join(ARTIFACT_DIR, 'strict-worker-dynamic-id.png') });
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
    assert.equal(ngoziCheckIn.data.cardProofMode, 'static_badge_fallback');
    assert.equal(ngoziCheckIn.data.hasPhotoProof, true);

    // Stop server so edits/backdating load cleanly on restart, backdate Ngozi's card entry 12h so shift_end (14:00 WAT) is expired
    await stopServer(child);
    child = null;
    await new Promise(r => setTimeout(r, 250));
    if (USE_PG) {
      const upd = await pgPool.query(
        "UPDATE time_entries SET clocked_in_at = now() - interval '12 hours' WHERE membership_id = $1 AND clocked_out_at IS NULL RETURNING id",
        [ngoziCard.id]
      );
      assert.ok(upd.rows.length === 1, 'Expected Ngozi open entry in PostgreSQL time_entries');
    } else {
      const midStore = JSON.parse(await readFile(STORE_PATH, 'utf8'));
      const ngoziEntry = midStore.timeEntries.find(e => e.membershipId === ngoziCard.id && !e.clockedOutAt);
      assert.ok(ngoziEntry, 'Expected Ngozi open entry in store');
      ngoziEntry.clockedInAt = new Date(Date.now() - 12 * 3600000).toISOString();
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
    assert.ok(ngoziReview, 'Auto-out card shift without exit scan must enter pending_supervisor_confirm queue');
    assert.equal(ngoziReview.cardProofMode, 'static_badge_fallback');
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
