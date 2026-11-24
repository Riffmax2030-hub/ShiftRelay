import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const PORT = 3471;
const BASE = `http://127.0.0.1:${PORT}`;
const srv = spawn('node', ['server.mjs'], {
  env: { ...process.env, PORT: String(PORT), ALLOW_SQLITE_FALLBACK: '1' },
  stdio: 'ignore',
});

async function waitHealth() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('Server timeout');
}

async function signIn(email, password) {
  const res = await fetch(`${BASE}/api/auth/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId: 'RIF-2026', email, password }),
  });
  const data = await res.json();
  assert.equal(res.status, 200, `Expected 200 sign-in for ${email}, got ${res.status}: ${data.error}`);
  const cookie = (res.headers.get('set-cookie') || '').split(';')[0];
  return { user: data.user, cookie };
}

try {
  await waitHealth();

  console.log('1. Testing Iamgreat@2030 login + Kenya coordinates for RIF-2026...');
  const owner = await signIn('sherif@riffmax.tech', 'Iamgreat@2030');
  assert.equal(owner.user.hub_lat, -1.2921, 'Riffmax hub_lat should be Kenya (-1.2921)');
  assert.equal(owner.user.hub_lng, 36.8219, 'Riffmax hub_lng should be Kenya (36.8219)');
  assert.equal(owner.user.organisation_name, 'Riffmax Technology');

  console.log('2. Assigning shift to frontline worker (tariq@riffmax.tech)...');
  const futureDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const minOffset = String(new Date().getMinutes()).padStart(2, '0');
  const startsAt = `${futureDate}T09:${minOffset}:00.000Z`;
  const endsAt = `${futureDate}T17:${minOffset}:00.000Z`;
  const targetId = '00000000-0000-4000-8000-000000000005';

  const assignRes = await fetch(`${BASE}/api/calendar/shifts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: owner.cookie },
    body: JSON.stringify({ membershipId: targetId, startsAt, endsAt }),
  });
  const assignData = await assignRes.json();
  assert.ok([201, 409].includes(assignRes.status), `Shift assign failed: ${assignRes.status} ${assignData.error}`);

  console.log('3. Logging in as worker (tariq@riffmax.tech) and verifying notification + earnings...');
  const worker = await signIn('tariq@riffmax.tech', 'Iamgreat@2030');
  const notifRes = await fetch(`${BASE}/api/notifications`, { headers: { Cookie: worker.cookie } });
  const notifData = await notifRes.json();
  assert.equal(notifRes.status, 200);
  const hasShiftNotif = (notifData.notifications || []).some((n) =>
    String(n.message || '').toLowerCase().includes('new shift assigned')
  );
  assert.ok(hasShiftNotif, 'Worker must receive a "New shift assigned" notification upon login');

  const earnRes = await fetch(`${BASE}/api/earnings`, { headers: { Cookie: worker.cookie } });
  const earnData = await earnRes.json();
  assert.equal(earnData.unassigned, false, 'Worker earnings must not be unassigned');
  assert.ok(Number(earnData.statement?.grossPay || earnData.statement?.netPay || 0) >= 500000, `Worker gross/net pay should be >= 500,000 (got gross=${earnData.statement?.grossPay}, net=${earnData.statement?.netPay})`);
  assert.ok(Number(earnData.statement?.netPay || 0) > 0, 'Worker netPay must be > 0');

  console.log('PASS: Shift notification, Iamgreat@2030 login, Kenya coords & 500k+ earnings verified!');
} finally {
  srv.kill();
}
