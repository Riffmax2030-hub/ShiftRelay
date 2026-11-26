import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { existsSync } from 'node:fs';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import {
  SAAS_PLAN_TIERS,
  SANDBOX_PILOT_CONFIG,
  resolvePlanTier,
  recommendPlanTierForHeadcount,
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
  console.log('=== 1. TESTING 3-TIER SCALABLE PRICING (STARTUP / BUSINESS / ENTERPRISE) ===');

  // Headcount tier recommendation helper
  assert.equal(recommendPlanTierForHeadcount(1).key, 'startup');
  assert.equal(recommendPlanTierForHeadcount(50).key, 'startup');
  assert.equal(recommendPlanTierForHeadcount(51).key, 'business');
  assert.equal(recommendPlanTierForHeadcount(100).key, 'business');
  assert.equal(recommendPlanTierForHeadcount(101).key, 'enterprise');
  assert.equal(recommendPlanTierForHeadcount(500).key, 'enterprise');

  // Backward-compatible aliases
  assert.equal(resolvePlanTier('professional').key, 'business');
  assert.equal(resolvePlanTier('enterprise_plus').key, 'enterprise');

  // Startup (1-50): ₦50k base + ₦2,500 PEPM + ₦100k setup
  const startup = calculateTenantMonthlyInvoice({
    planKey: 'startup',
    coreHeadcount: 30,
    seasonalSurgeHeadcount: 0,
    billingStatus: 'active_subscription',
    onboardingCompleted: true
  });
  assert.equal(startup.planKey, 'startup');
  assert.equal(startup.baseFeeNgn, 50000);
  assert.equal(startup.pepmRateNgn, 2500);
  assert.equal(startup.corePepmFeeNgn, 75000);
  assert.equal(startup.recurringMonthlyTotalNgn, 125000);
  assert.equal(startup.workerChargeNgn, 0);
  assert.equal(startup.billedTo, 'EMPLOYER_ONLY');

  // Business (51-100): ₦100k base + ₦2,500 PEPM + ₦250k setup (+ elasticity overage & surge)
  const bizElastic = calculateTenantMonthlyInvoice({
    planKey: 'business',
    coreHeadcount: 110,
    seasonalSurgeHeadcount: 10,
    billingStatus: 'active_subscription',
    onboardingCompleted: true
  });
  assert.equal(bizElastic.planKey, 'business');
  assert.equal(bizElastic.baseFeeNgn, 100000);
  assert.equal(bizElastic.pepmRateNgn, 2500);
  assert.equal(bizElastic.cappedCoreHeadcount, 100);
  assert.equal(bizElastic.overageHeadcount, 10);
  assert.equal(bizElastic.corePepmFeeNgn, 100 * 2500);
  assert.equal(bizElastic.overageFeeNgn, 10 * 2500);
  assert.equal(bizElastic.surgeFeeNgn, 10 * 2000);
  assert.equal(bizElastic.recurringMonthlyTotalNgn, 100000 + 250000 + 25000 + 20000);

  // Enterprise (101-500): ₦250k base + ₦2,000 PEPM + ₦750k setup
  const ent = calculateTenantMonthlyInvoice({
    planKey: 'enterprise',
    coreHeadcount: 300,
    seasonalSurgeHeadcount: 10,
    billingStatus: 'active_subscription',
    onboardingCompleted: true
  });
  assert.equal(ent.planKey, 'enterprise');
  assert.equal(ent.baseFeeNgn, 250000);
  assert.equal(ent.pepmRateNgn, 2000);
  assert.equal(ent.recurringMonthlyTotalNgn, 250000 + (300 * 2000) + (10 * 1800));

  console.log('  PASS: All 3 scalable tiers (Startup, Business, Enterprise) & elasticity verified.');

  console.log('=== 2. TESTING ₦50k SANDBOX PILOT CREDIT & POST-ONBOARDING GATE ===');
  const pilot = calculateSandboxPilotInvoice();
  assert.equal(pilot.amountNgn, 50000);
  assert.equal(pilot.maxWorkers, 50);
  assert.equal(pilot.durationDays, 30);

  const obStartupWithPilot = calculateOnboardingInvoice({ planKey: 'startup', pilotPaid: true });
  assert.equal(obStartupWithPilot.grossOnboardingFeeNgn, 100000);
  assert.equal(obStartupWithPilot.pilotCreditAppliedNgn, 50000);
  assert.equal(obStartupWithPilot.netOnboardingFeeNgn, 50000);

  const obBizWithPilot = calculateOnboardingInvoice({ planKey: 'business', pilotPaid: true });
  assert.equal(obBizWithPilot.grossOnboardingFeeNgn, 250000);
  assert.equal(obBizWithPilot.netOnboardingFeeNgn, 200000);

  const obEntWithPilot = calculateOnboardingInvoice({ planKey: 'enterprise', pilotPaid: true });
  assert.equal(obEntWithPilot.grossOnboardingFeeNgn, 750000);
  assert.equal(obEntWithPilot.netOnboardingFeeNgn, 700000);

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

  // Anti-cheat & post-withdrawal balance entitlement check:
  // Withdrawing ₦20,000 must reduce net_available_disbursal by exact ₦20,000 and never go negative
  const after20k = computeWorkerAccruedLedger({
    contract: { compensation_type: 'fixed_monthly', monthly_rate: 240000 },
    completedHours: 80,
    activeShiftHours: 0,
    ewaDisbursedNgn: 20000
  });
  assert.equal(after20k.ewa_disbursed_todate, 20000);
  assert.equal(
    after20k.net_available_disbursal,
    Math.round((ledger80h.net_available_disbursal - 20000) * 100) / 100
  );
  const overWithdrawn = computeWorkerAccruedLedger({
    contract: { compensation_type: 'fixed_monthly', monthly_rate: 240000 },
    completedHours: 80,
    activeShiftHours: 0,
    ewaDisbursedNgn: 999999
  });
  assert.equal(overWithdrawn.net_available_disbursal, 0);
  console.log('  PASS: Real-time accrued net pay, post-withdrawal deduction & CBN zero-lending EWA policy verified.');
}

async function runHttpIntegrationTests() {
  console.log('=== 4. RUNNING LIVE HTTP INTEGRATION TESTS (LIFECYCLE, EWA, FLOAT) ===');
  const originalStoreRaw = existsSync(STORE_PATH) ? await readFile(STORE_PATH, 'utf8') : null;
  const port = await pickFreePort();
  const testPaystackSecret = 'sk_test_shiftrelay_unit_webhook_secret';
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'development',
      DATABASE_URL: '',
      PAYSTACK_SECRET_KEY: testPaystackSecret,
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

    // 4a. Transition to pilot_active and issue ₦50,000 Sandbox Pilot invoice
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
    assert.equal(pilotInv.amountNgn, 50000);
    assert.equal(pilotInv.invoiceType, 'SANDBOX_PILOT_30D');

    // Mark pilot invoice PAID -> pilotPaid=true, pilotCreditNgn=50000
    const markPilotPaid = await fetch(`${baseUrl}/api/admin/billing/tenants/${tenantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: admCookie },
      body: JSON.stringify({ markInvoicePaidId: pilotInv.invoiceId })
    });
    assert.equal(markPilotPaid.status, 200);
    const afterPilotPaid = await markPilotPaid.json();
    assert.equal(afterPilotPaid.tenant.pilotPaid, true);
    assert.equal(afterPilotPaid.tenant.pilotCreditAppliedNgn, 50000);

    // 4b. Recurring monthly invoice MUST be blocked (409) before onboarding/go-live is marked complete!
    const blockedMonthlyRes = await fetch(`${baseUrl}/api/admin/billing/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admCookie },
      body: JSON.stringify({ tenantId, invoiceType: 'monthly_recurring', month: '2026-11' })
    });
    assert.equal(blockedMonthlyRes.status, 409);
    const blockedJson = await blockedMonthlyRes.json();
    assert.equal(blockedJson.code, 'ONBOARDING_NOT_COMPLETED');

    // 4c. Convert to full Enterprise contract: issue Onboarding invoice -> automatic ₦50,000 credit (₦750,000 - ₦50,000 = ₦700,000)
    const obInvRes = await fetch(`${baseUrl}/api/admin/billing/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admCookie },
      body: JSON.stringify({ tenantId, invoiceType: 'onboarding', month: '2026-11' })
    });
    assert.equal(obInvRes.status, 201);
    const obInv = (await obInvRes.json()).invoice;
    assert.equal(obInv.grossOnboardingFeeNgn, 750000);
    assert.equal(obInv.pilotCreditAppliedNgn, 50000);
    assert.equal(obInv.amountNgn, 700000);

    // 4d. Simulate signed Paystack charge.success webhook -> auto-marks Onboarding PAID, activates tenant & issues Official Receipt!
    const webhookPayload = JSON.stringify({
      event: 'charge.success',
      data: {
        reference: obInv.invoiceId,
        amount: obInv.amountNgn * 100,
        channel: 'bank_transfer',
        paid_at: new Date().toISOString(),
        customer: { email: 'emeka@atlanticterminal.ng' },
        metadata: { type: 'saas_billing_invoice', invoiceId: obInv.invoiceId, tenantId }
      }
    });
    const sig = crypto.createHmac('sha512', testPaystackSecret).update(webhookPayload).digest('hex');
    const whRes = await fetch(`${baseUrl}/api/webhooks/paystack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-paystack-signature': sig },
      body: webhookPayload
    });
    assert.equal(whRes.status, 200);

    // Verify receipt & active_subscription state via /api/admin/billing
    const billingSnapRes = await fetch(`${baseUrl}/api/admin/billing`, { headers: { Cookie: admCookie } });
    assert.equal(billingSnapRes.status, 200);
    const billingSnap = await billingSnapRes.json();
    const updatedTenant = billingSnap.tenants.find(t => t.tenantId === tenantId);
    assert.equal(updatedTenant.billingStatus, 'active_subscription');
    assert.equal(updatedTenant.onboardingCompleted, true);
    assert.equal(updatedTenant.onboardingFeePaid, true);
    const officialReceipt = (billingSnap.receipts || []).find(r => r.invoiceId === obInv.invoiceId);
    assert.ok(officialReceipt, 'Official payment receipt must be recorded automatically on Paystack webhook');
    assert.ok(officialReceipt.issuer.includes('Riffmax Technology Limited'));
    assert.equal(officialReceipt.totalPaidNgn, 700000);

    const recurringInvRes = await fetch(`${baseUrl}/api/admin/billing/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admCookie },
      body: JSON.stringify({ tenantId, invoiceType: 'monthly_recurring', month: '2026-11', coreHeadcount: 100, seasonalSurgeHeadcount: 10 })
    });
    assert.equal(recurringInvRes.status, 201);
    const recurringInv = (await recurringInvRes.json()).invoice;
    assert.equal(recurringInv.baseFeeNgn, 250000);
    assert.equal(recurringInv.pepmFeeNgn, 200000);
    assert.equal(recurringInv.surgeFeeNgn, 18000);
    assert.equal(recurringInv.amountNgn, 468000);
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
