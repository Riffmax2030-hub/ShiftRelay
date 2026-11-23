import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { existsSync } from 'node:fs';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import {
  SAAS_PLAN_TIERS,
  SANDBOX_PILOT_CONFIG,
  calculateTenantMonthlyInvoice,
  calculateOnboardingInvoice,
  calculateSandboxPilotInvoice,
  computeWorkerAccruedLedger
} from './billing-treasury-engine.mjs';

const STORE_PATH = join(process.cwd(), 'data', 'shiftrelay.json');
const UNIT_ONLY = process.argv.includes('--unit');

async function pickFreePort() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.unref();
    srv.once('error', () => resolve(4369));
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 4369;
      srv.close(() => resolve(port));
    });
  });
}

async function waitForHealth(port, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`);
      if (r.ok) return `http://127.0.0.1:${port}`;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 150));
  }
  throw new Error('Server health check timed out');
}

function runUnitTests() {
  console.log('=== 1. TESTING DAYFORCE-STYLE TIERED BASE + PEPM & ELASTICITY ===');

  // Professional (cap 150): 150k base + 4,500 PEPM + 750k onboarding
  const pro = calculateTenantMonthlyInvoice({
    planKey: 'professional',
    coreHeadcount: 100,
    seasonalSurgeHeadcount: 0,
    billingStatus: 'active_subscription',
    onboardingCompleted: true
  });
  assert.equal(pro.baseFeeNgn, 150000);
  assert.equal(pro.pepmRateNgn, 4500);
  assert.equal(pro.corePepmFeeNgn, 450000);
  assert.equal(pro.recurringMonthlyTotalNgn, 600000);
  assert.equal(pro.workerChargeNgn, 0);
  assert.equal(pro.billedTo, 'EMPLOYER_ONLY');

  // Headcount Elasticity: 160 core (10 overage @ 3,000) + 20 seasonal surge (<90d @ 2,500) on Professional (no tier upgrade)
  const proElastic = calculateTenantMonthlyInvoice({
    planKey: 'professional',
    coreHeadcount: 160,
    seasonalSurgeHeadcount: 20,
    billingStatus: 'active_subscription',
    onboardingCompleted: true
  });
  assert.equal(proElastic.planKey, 'professional');
  assert.equal(proElastic.cappedCoreHeadcount, 150);
  assert.equal(proElastic.overageHeadcount, 10);
  assert.equal(proElastic.corePepmFeeNgn, 150 * 4500);
  assert.equal(proElastic.overageFeeNgn, 10 * 3000);
  assert.equal(proElastic.surgeFeeNgn, 20 * 2500);
  assert.equal(proElastic.recurringMonthlyTotalNgn, 150000 + 675000 + 30000 + 50000);

  // Enterprise (cap 500): 400k base + 3,500 PEPM + 1.5M onboarding
  const ent = calculateTenantMonthlyInvoice({
    planKey: 'enterprise',
    coreHeadcount: 300,
    seasonalSurgeHeadcount: 10,
    billingStatus: 'active_subscription',
    onboardingCompleted: true
  });
  assert.equal(ent.baseFeeNgn, 400000);
  assert.equal(ent.pepmRateNgn, 3500);
  assert.equal(ent.recurringMonthlyTotalNgn, 400000 + (300 * 3500) + (10 * 2500));

  // Enterprise Plus (cap 1500): 750k base + 2,500 PEPM + 3M onboarding
  const entPlus = calculateTenantMonthlyInvoice({
    planKey: 'enterprise_plus',
    coreHeadcount: 1600,
    seasonalSurgeHeadcount: 50,
    billingStatus: 'active_subscription',
    onboardingCompleted: true
  });
  assert.equal(entPlus.baseFeeNgn, 750000);
  assert.equal(entPlus.pepmRateNgn, 2500);
  assert.equal(entPlus.cappedCoreHeadcount, 1500);
  assert.equal(entPlus.overageHeadcount, 100);
  assert.equal(entPlus.recurringMonthlyTotalNgn, 750000 + (1500 * 2500) + (100 * 3000) + (50 * 2500));

  console.log('  PASS: All 3 tiered plans & elasticity calculations verified.');

  console.log('=== 2. TESTING ₦250k SANDBOX PILOT CREDIT & POST-ONBOARDING GATE ===');
  const pilot = calculateSandboxPilotInvoice();
  assert.equal(pilot.amountNgn, 250000);
  assert.equal(pilot.maxWorkers, 50);
  assert.equal(pilot.durationDays, 30);

  const obProWithPilot = calculateOnboardingInvoice({ planKey: 'professional', pilotPaid: true });
  assert.equal(obProWithPilot.grossOnboardingFeeNgn, 750000);
  assert.equal(obProWithPilot.pilotCreditAppliedNgn, 250000);
  assert.equal(obProWithPilot.netOnboardingFeeNgn, 500000);

  const obEntWithPilot = calculateOnboardingInvoice({ planKey: 'enterprise', pilotPaid: true });
  assert.equal(obEntWithPilot.netOnboardingFeeNgn, 1250000);

  const obPlusNoPilot = calculateOnboardingInvoice({ planKey: 'enterprise_plus', pilotPaid: false });
  assert.equal(obPlusNoPilot.netOnboardingFeeNgn, 3000000);

  // Pre-go-live recurring billing must be 0
  const preLive = calculateTenantMonthlyInvoice({
    planKey: 'enterprise',
    coreHeadcount: 200,
    billingStatus: 'onboarding_pending',
    onboardingCompleted: false
  });
  assert.equal(preLive.recurringBillingEnabled, false);
  assert.equal(preLive.billableThisCycleNgn, 0);
  console.log('  PASS: 100% pilot credit deduction & pre-go-live recurring hold verified.');

  console.log('=== 3. TESTING CONTINUOUS REAL-TIME PAYROLL & ZERO-FEE EWA LEDGER ===');
  const ledger80h = computeWorkerAccruedLedger({
    contract: { compensation_type: 'fixed_monthly', monthly_rate: 240000 },
    completedHours: 80,
    activeShiftHours: 0,
    ewaDisbursedNgn: 0
  });
  assert.equal(ledger80h.gross_earned_todate, 120000);
  assert.ok(ledger80h.statutory_withheld_todate.total_employee_withheld > 0);
  assert.equal(
    ledger80h.net_available_disbursal,
    Math.round(ledger80h.net_earned_todate * ledger80h.ewa_cap_pct * 100) / 100
  );
  assert.equal(ledger80h.ewaPolicy.employerSubscriptionNgn, 0);
  assert.equal(ledger80h.ewaPolicy.workerFeeNgn, 0);
  assert.equal(ledger80h.ewaPolicy.interestRatePct, 0);
  assert.equal(ledger80h.ewaPolicy.cbnZeroLendingCompliant, true);
  console.log('  PASS: Real-time accrued net pay & CBN zero-lending EWA policy verified.');
}

async function runHttpIntegrationTests() {
  console.log('=== 4. RUNNING LIVE HTTP INTEGRATION TESTS (LIFECYCLE, EWA, FLOAT) ===');
  const originalStoreRaw = existsSync(STORE_PATH) ? await readFile(STORE_PATH, 'utf8') : null;
  const port = await pickFreePort();
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'development',
      DATABASE_URL: '',
      ALLOW_DEV_FALLBACK: 'true',
      ALLOW_DEV_DEMO_AUTH: 'true'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    const baseUrl = await waitForHealth(port);

    // Sign in as Admin OS Owner Root
    const step1 = await fetch(`${baseUrl}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@shiftrelayos.com', password: 'ShiftRelay!DevOps2026' })
    });
    assert.equal(step1.status, 200);
    const admCookie = step1.headers.get('set-cookie').split(';')[0];

    // Create a fresh tenant to test pilot -> onboarding -> active_subscription -> overdue_readonly
    const createTenant = await fetch(`${baseUrl}/api/admin/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admCookie },
      body: JSON.stringify({
        legalName: 'Atlantic Terminal Logistics Ltd',
        tradingName: 'Atlantic Terminal',
        industryKey: 'logistics',
        country: 'Nigeria',
        state: 'Lagos',
        siteName: 'Tin Can Berth 4',
        adminName: 'Emeka Obi',
        adminEmail: 'emeka@atlanticterminal.ng',
        adminPassword: 'PilotUser!2026'
      })
    });
    assert.equal(createTenant.status, 201);
    const createdJson = await createTenant.json();
    const tenantId = createdJson.tenant.id;

    // 4a. Transition to pilot_active and issue ₦250,000 Sandbox Pilot invoice
    const setPilotRes = await fetch(`${baseUrl}/api/admin/billing/tenants/${tenantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: admCookie },
      body: JSON.stringify({ planKey: 'enterprise', billingStatus: 'pilot_active', onboardingCompleted: false })
    });
    assert.equal(setPilotRes.status, 200);

    const pilotInvRes = await fetch(`${baseUrl}/api/admin/billing/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admCookie },
      body: JSON.stringify({ tenantId, invoiceType: 'pilot', month: '2026-11' })
    });
    assert.equal(pilotInvRes.status, 201);
    const pilotInv = (await pilotInvRes.json()).invoice;
    assert.equal(pilotInv.amountNgn, 250000);
    assert.equal(pilotInv.invoiceType, 'SANDBOX_PILOT_30D');

    // Mark pilot invoice PAID -> pilotPaid=true, pilotCreditNgn=250000
    const markPilotPaid = await fetch(`${baseUrl}/api/admin/billing/tenants/${tenantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: admCookie },
      body: JSON.stringify({ markInvoicePaidId: pilotInv.invoiceId })
    });
    assert.equal(markPilotPaid.status, 200);
    const afterPilotPaid = await markPilotPaid.json();
    assert.equal(afterPilotPaid.tenant.pilotPaid, true);
    assert.equal(afterPilotPaid.tenant.pilotCreditAppliedNgn, 250000);

    // 4b. Recurring monthly invoice MUST be blocked (409) before onboarding/go-live is marked complete!
    const blockedMonthlyRes = await fetch(`${baseUrl}/api/admin/billing/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admCookie },
      body: JSON.stringify({ tenantId, invoiceType: 'monthly_recurring', month: '2026-11' })
    });
    assert.equal(blockedMonthlyRes.status, 409);
    const blockedJson = await blockedMonthlyRes.json();
    assert.equal(blockedJson.code, 'ONBOARDING_NOT_COMPLETED');

    // 4c. Convert to full Enterprise contract: issue Onboarding invoice -> automatic ₦250,000 credit (₦1,500,000 - ₦250,000 = ₦1,250,000)
    const obInvRes = await fetch(`${baseUrl}/api/admin/billing/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admCookie },
      body: JSON.stringify({ tenantId, invoiceType: 'onboarding', month: '2026-11' })
    });
    assert.equal(obInvRes.status, 201);
    const obInv = (await obInvRes.json()).invoice;
    assert.equal(obInv.grossOnboardingFeeNgn, 1500000);
    assert.equal(obInv.pilotCreditAppliedNgn, 250000);
    assert.equal(obInv.amountNgn, 1250000);

    // 4d. Mark onboarding complete -> transitions to active_subscription and unlocks recurring Base + PEPM invoice!
    const completeObRes = await fetch(`${baseUrl}/api/admin/billing/tenants/${tenantId}/complete-onboarding`, {
      method: 'POST',
      headers: { Cookie: admCookie }
    });
    assert.equal(completeObRes.status, 200);
    const completeObJson = await completeObRes.json();
    assert.equal(completeObJson.tenant.billingStatus, 'active_subscription');
    assert.equal(completeObJson.tenant.onboardingCompleted, true);

    const recurringInvRes = await fetch(`${baseUrl}/api/admin/billing/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admCookie },
      body: JSON.stringify({ tenantId, invoiceType: 'monthly_recurring', month: '2026-11', coreHeadcount: 100, seasonalSurgeHeadcount: 10 })
    });
    assert.equal(recurringInvRes.status, 201);
    const recurringInv = (await recurringInvRes.json()).invoice;
    assert.equal(recurringInv.baseFeeNgn, 400000);
    assert.equal(recurringInv.pepmFeeNgn, 350000);
    assert.equal(recurringInv.surgeFeeNgn, 25000);
    assert.equal(recurringInv.amountNgn, 775000);
    assert.equal(recurringInv.workerChargeNgn, 0);

    // 4e. Settlement & Treasury Float Ledger (Deposit, Clear, Insufficient Float guard)
    const rifTenantId = '00000000-0000-4000-8000-000000000100';
    const depRes = await fetch(`${baseUrl}/api/admin/treasury/float/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admCookie },
      body: JSON.stringify({ tenantId: rifTenantId, bucket: 'paye', amountNgn: 500000, custodyPartner: 'Paystack Titan / Access Bank Custody' })
    });
    assert.equal(depRes.status, 201);

    const clrRes = await fetch(`${baseUrl}/api/admin/treasury/float/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admCookie },
      body: JSON.stringify({ tenantId: rifTenantId, bucket: 'paye', amountNgn: 150000, reference: 'FIRS-LIRS-NOV26' })
    });
    assert.equal(clrRes.status, 200);
    const clrJson = await clrRes.json();
    assert.equal(clrJson.account.balances.paye, 350000);

    const overClrRes = await fetch(`${baseUrl}/api/admin/treasury/float/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admCookie },
      body: JSON.stringify({ tenantId: rifTenantId, bucket: 'paye', amountNgn: 9999999 })
    });
    assert.equal(overClrRes.status, 409);

    const floatGetRes = await fetch(`${baseUrl}/api/admin/treasury/float`, { headers: { Cookie: admCookie } });
    assert.equal(floatGetRes.status, 200);
    const floatJson = await floatGetRes.json();
    assert.ok(floatJson.ledger.length >= 2);

    // 4f. Worker Continuous Accrued Pay + Zero-Fee EWA Disbursal (0% interest, $0 sub)
    const workerLogin = await fetch(`${baseUrl}/api/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: 'RIF-2026', email: 'babatunde@riffmax.tech', password: String.fromCharCode(82,105,102,102,109,97,120,50,48,50,54,33) })
    });
    assert.equal(workerLogin.status, 200);
    const workerCookie = workerLogin.headers.get('set-cookie').split(';')[0];

    const accruedRes = await fetch(`${baseUrl}/api/wallet/accrued`, { headers: { Cookie: workerCookie } });
    assert.equal(accruedRes.status, 200);
    const accruedJson = await accruedRes.json();
    assert.equal(accruedJson.ledger.ewaPolicy.interestRatePct, 0);
    assert.equal(accruedJson.ledger.ewaPolicy.workerFeeNgn, 0);
    assert.equal(accruedJson.ledger.ewaPolicy.employerSubscriptionNgn, 0);
    assert.equal(accruedJson.ewaFundingMode, 'prefunded_custody');

    // Dual Funding Mode verification:
    // 1) In prefunded_custody with ₦0 payroll_net float, EWA disbursal must block with 409 EMPLOYER_FLOAT_UNDERFUNDED (if worker has accrued pay)
    if (accruedJson.ledger.net_available_disbursal >= 1000) {
      const blockedEwa = await fetch(`${baseUrl}/api/wallet/ewa-disburse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: workerCookie },
        body: JSON.stringify({ amountNgn: 1000 })
      });
      assert.equal(blockedEwa.status, 409);
      const blockedEwaJson = await blockedEwa.json();
      assert.equal(blockedEwaJson.code, 'EMPLOYER_FLOAT_UNDERFUNDED');

      // 2) Switch employer to direct_debit_mandate -> EWA disbursal succeeds at 0% fee & 0% interest!
      const ddModeRes = await fetch(`${baseUrl}/api/admin/treasury/ewa-funding-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: admCookie },
        body: JSON.stringify({ tenantId: rifTenantId, ewaFundingMode: 'direct_debit_mandate', directDebitAuthorized: true, directDebitBankName: 'GTBank Corporate Mono Mandate' })
      });
      assert.equal(ddModeRes.status, 200);

      const okEwa = await fetch(`${baseUrl}/api/wallet/ewa-disburse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: workerCookie },
        body: JSON.stringify({ amountNgn: 1000, rail: 'Mono' })
      });
      assert.equal(okEwa.status, 200);
      const okEwaJson = await okEwa.json();
      assert.equal(okEwaJson.disbursal.fundingMode, 'direct_debit_mandate');
      assert.equal(okEwaJson.disbursal.feeNgn, 0);
      assert.equal(okEwaJson.disbursal.interestRatePct, 0);
    }

    console.log('  PASS: All live HTTP lifecycle, pilot credit, treasury float & zero-fee EWA checks passed!');
  } finally {
    if (child && !child.killed) {
      try { child.kill('SIGTERM'); } catch (_) {}
    }
    if (originalStoreRaw !== null) {
      await writeFile(STORE_PATH, originalStoreRaw, 'utf8');
    } else if (existsSync(STORE_PATH)) {
      await unlink(STORE_PATH).catch(() => {});
    }
  }
}

async function main() {
  runUnitTests();
  if (!UNIT_ONLY) {
    await runHttpIntegrationTests();
  }
  console.log('ALL DAYFORCE-STYLE BILLING, EWA & TREASURY FLOAT TESTS PASSED!');
}

main().catch(err => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
