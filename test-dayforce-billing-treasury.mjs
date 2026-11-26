import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { existsSync } from 'node:fs';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import {
  SAAS_PLAN_TIER_ORDER,
  SAAS_PLAN_TIERS,
  SANDBOX_PILOT_CONFIG,
  resolvePlanTier,
  recommendPlanTierForHeadcount,
  computeTierDistributionMetrics,
  calculateTenantMonthlyInvoice,
  calculateTenantAnnualInvoice,
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
  console.log('=== 1. TESTING 5-TIER SCALABLE PRICING (STARTUP / BUSINESS / ENTERPRISE / CORPORATE / MEGA) ===');

  assert.deepEqual(SAAS_PLAN_TIER_ORDER, ['startup', 'business', 'enterprise', 'corporate', 'mega']);

  // Headcount tier recommendation helper (exact 5 brackets)
  assert.equal(recommendPlanTierForHeadcount(1).key, 'startup');
  assert.equal(recommendPlanTierForHeadcount(20).key, 'startup');
  assert.equal(recommendPlanTierForHeadcount(21).key, 'business');
  assert.equal(recommendPlanTierForHeadcount(50).key, 'business');
  assert.equal(recommendPlanTierForHeadcount(51).key, 'enterprise');
  assert.equal(recommendPlanTierForHeadcount(100).key, 'enterprise');
  assert.equal(recommendPlanTierForHeadcount(101).key, 'corporate');
  assert.equal(recommendPlanTierForHeadcount(200).key, 'corporate');
  assert.equal(recommendPlanTierForHeadcount(201).key, 'mega');
  assert.equal(recommendPlanTierForHeadcount(500).key, 'mega');

  // Backward-compatible aliases
  assert.equal(resolvePlanTier('professional').key, 'business');
  assert.equal(resolvePlanTier('enterprise_plus').key, 'mega');
  assert.equal(resolvePlanTier('scale').key, 'corporate');

  // Startup (1-20): ₦30k base + ₦2,500 PEPM + ₦75k setup
  const startup = calculateTenantMonthlyInvoice({
    planKey: 'startup',
    coreHeadcount: 15,
    seasonalSurgeHeadcount: 0,
    billingStatus: 'active_subscription',
    onboardingCompleted: true
  });
  assert.equal(startup.baseFeeNgn, 30000);
  assert.equal(startup.pepmRateNgn, 2500);
  assert.equal(startup.recurringMonthlyTotalNgn, 30000 + 15 * 2500);
  assert.equal(startup.workerChargeNgn, 0);
  assert.equal(startup.billedTo, 'EMPLOYER_ONLY');

  // Business (21-50): ₦60k base + ₦2,500 PEPM + ₦150k setup
  const biz = calculateTenantMonthlyInvoice({
    planKey: 'business',
    coreHeadcount: 40,
    seasonalSurgeHeadcount: 5,
    billingStatus: 'active_subscription',
    onboardingCompleted: true
  });
  assert.equal(biz.baseFeeNgn, 60000);
  assert.equal(biz.recurringMonthlyTotalNgn, 60000 + 40 * 2500 + 5 * 2000);

  // Enterprise (51-100): ₦120k base + ₦2,250 PEPM + ₦300k setup
  const ent = calculateTenantMonthlyInvoice({
    planKey: 'enterprise',
    coreHeadcount: 80,
    seasonalSurgeHeadcount: 10,
    billingStatus: 'active_subscription',
    onboardingCompleted: true
  });
  assert.equal(ent.baseFeeNgn, 120000);
  assert.equal(ent.pepmRateNgn, 2250);
  assert.equal(ent.recurringMonthlyTotalNgn, 120000 + 80 * 2250 + 10 * 1800);

  // Corporate (101-200): ₦200k base + ₦2,000 PEPM + ₦550k setup
  const corp = calculateTenantMonthlyInvoice({
    planKey: 'corporate',
    coreHeadcount: 150,
    seasonalSurgeHeadcount: 0,
    billingStatus: 'active_subscription',
    onboardingCompleted: true
  });
  assert.equal(corp.baseFeeNgn, 200000);
  assert.equal(corp.pepmRateNgn, 2000);
  assert.equal(corp.recurringMonthlyTotalNgn, 200000 + 150 * 2000);

  // Mega (201+): ₦350k base + ₦1,750 PEPM + ₦1,000k setup
  const mega = calculateTenantMonthlyInvoice({
    planKey: 'mega',
    coreHeadcount: 300,
    seasonalSurgeHeadcount: 0,
    billingStatus: 'active_subscription',
    onboardingCompleted: true
  });
  assert.equal(mega.baseFeeNgn, 350000);
  assert.equal(mega.pepmRateNgn, 1750);
  assert.equal(mega.recurringMonthlyTotalNgn, 350000 + 300 * 1750);

  // Annual 12-Month Full-Year Plan calculation (with & without Setup Fee)
  const annualBizWithSetup = calculateTenantAnnualInvoice({
    planKey: 'business',
    coreHeadcount: 40,
    includeSetupFee: true
  });
  assert.equal(annualBizWithSetup.invoiceType, 'ANNUAL_ONBOARDING_BUNDLE');
  assert.equal(annualBizWithSetup.annualBaseFeeNgn, 60000 * 12);
  assert.equal(annualBizWithSetup.annualCorePepmFeeNgn, 40 * 2500 * 12);
  assert.equal(annualBizWithSetup.annualSubscriptionTotalNgn, (60000 + 40 * 2500) * 12);
  assert.equal(annualBizWithSetup.totalDueNgn, 150000 + (60000 + 40 * 2500) * 12);

  // Tier Distribution Metrics
  const dist = computeTierDistributionMetrics([startup, biz, ent, corp, mega]);
  assert.equal(dist.totalClients, 5);
  assert.equal(dist.byTier.startup.clientCount, 1);
  assert.equal(dist.byTier.business.clientCount, 1);
  assert.equal(dist.byTier.enterprise.clientCount, 1);
  assert.equal(dist.byTier.corporate.clientCount, 1);
  assert.equal(dist.byTier.mega.clientCount, 1);

  console.log('  PASS: All 5 scalable tiers (Startup, Business, Enterprise, Corporate, Mega) & metrics verified.');

  console.log('=== 2. TESTING ₦50k SANDBOX PILOT CREDIT & POST-ONBOARDING GATE ===');
  const pilot = calculateSandboxPilotInvoice();
  assert.equal(pilot.amountNgn, 50000);
  assert.equal(pilot.maxWorkers, 50);
  assert.equal(pilot.durationDays, 30);

  const obStartupWithPilot = calculateOnboardingInvoice({ planKey: 'startup', pilotPaid: true });
  assert.equal(obStartupWithPilot.grossOnboardingFeeNgn, 75000);
  assert.equal(obStartupWithPilot.pilotCreditAppliedNgn, 50000);
  assert.equal(obStartupWithPilot.netOnboardingFeeNgn, 25000);

  const obEntWithPilot = calculateOnboardingInvoice({ planKey: 'enterprise', pilotPaid: true });
  assert.equal(obEntWithPilot.grossOnboardingFeeNgn, 300000);
  assert.equal(obEntWithPilot.netOnboardingFeeNgn, 250000);

  const obMegaNoPilot = calculateOnboardingInvoice({ planKey: 'mega', pilotPaid: false });
  assert.equal(obMegaNoPilot.netOnboardingFeeNgn, 1000000);

  // Pre-go-live recurring billing must be 0
  const preLive = calculateTenantMonthlyInvoice({
    planKey: 'enterprise',
    coreHeadcount: 80,
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

    // 4c. Convert to full Enterprise contract: issue Onboarding invoice -> automatic ₦50,000 credit (₦300,000 - ₦50,000 = ₦250,000)
    const obInvRes = await fetch(`${baseUrl}/api/admin/billing/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admCookie },
      body: JSON.stringify({ tenantId, invoiceType: 'onboarding', month: '2026-11' })
    });
    assert.equal(obInvRes.status, 201);
    const obInv = (await obInvRes.json()).invoice;
    assert.equal(obInv.grossOnboardingFeeNgn, 300000);
    assert.equal(obInv.pilotCreditAppliedNgn, 50000);
    assert.equal(obInv.amountNgn, 250000);

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
    assert.ok(billingSnap.tierMetrics && billingSnap.tierMetrics.tiers.length === 5, '5-tier metrics must be returned');
    const officialReceipt = (billingSnap.receipts || []).find(r => r.invoiceId === obInv.invoiceId);
    assert.ok(officialReceipt, 'Official payment receipt must be recorded automatically on Paystack webhook');
    assert.ok(officialReceipt.issuer.includes('Riffmax Technology Limited'));
    assert.equal(officialReceipt.totalPaidNgn, 250000);

    const recurringInvRes = await fetch(`${baseUrl}/api/admin/billing/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admCookie },
      body: JSON.stringify({ tenantId, invoiceType: 'monthly_recurring', month: '2026-11', coreHeadcount: 80, seasonalSurgeHeadcount: 10 })
    });
    assert.equal(recurringInvRes.status, 201);
    const recurringInv = (await recurringInvRes.json()).invoice;
    assert.equal(recurringInv.baseFeeNgn, 120000);
    assert.equal(recurringInv.pepmFeeNgn, 180000);
    assert.equal(recurringInv.surgeFeeNgn, 18000);
    assert.equal(recurringInv.amountNgn, 318000);
    assert.equal(recurringInv.workerChargeNgn, 0);

    // 4d-2. Test Full 3-Stage Onboarding Pipeline with ANNUAL (12-Month) Plan selected (Intake -> 402 Gate -> Paystack Webhook Unlock -> Roster -> Live)
    const intakeRes = await fetch(`${baseUrl}/api/public/onboarding/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'Apex ColdChain Foods Ltd',
        contactName: 'Kemi Adeola',
        contactEmail: 'kemi@apexcoldchain.ng',
        contactPhone: '+2348035556666',
        industryKey: 'logistics',
        siteName: 'Apapa Cold Hub',
        state: 'Lagos',
        workerCount: 140,
        billingCycle: 'annual'
      })
    });
    assert.equal(intakeRes.status, 201);
    const intakeJson = await intakeRes.json();
    assert.equal(intakeJson.application.planTier, 'corporate');
    assert.equal(intakeJson.application.billingCycle, 'annual');
    assert.equal(intakeJson.application.setupFeeNgn, 550000);
    const expectedAnnualFull = 550000 + ((200000 + 140 * 2000) * 12);
    assert.equal(intakeJson.application.annualFullDueNgn, expectedAnnualFull);
    assert.equal(intakeJson.application.rosterUnlocked, false);
    const appId = intakeJson.application.id;
    const appToken = intakeJson.application.token;

    // Roster MUST be blocked (402) before setup/annual payment is confirmed!
    const blockedRosterRes = await fetch(`${baseUrl}/api/public/onboarding/roster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: appToken,
        staff: [{ fullName: 'Musa Ibrahim', email: 'musa@apexcoldchain.ng', roleTitle: 'Driver', monthlySalaryNgn: 160000 }]
      })
    });
    assert.equal(blockedRosterRes.status, 402);

    // Admin approves intake and sends secure Paystack Payment Link (full-year bundle!)
    const sendLinkRes = await fetch(`${baseUrl}/api/admin/onboarding/applications/${encodeURIComponent(appId)}/send-payment-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admCookie },
      body: JSON.stringify({})
    });
    assert.equal(sendLinkRes.status, 200);
    const sendLinkJson = await sendLinkRes.json();
    assert.equal(sendLinkJson.application.status, 'PAYMENT_LINK_SENT');
    assert.equal(sendLinkJson.invoice.invoiceType, 'ANNUAL_ONBOARDING_BUNDLE');
    assert.equal(sendLinkJson.invoice.amountNgn, expectedAnnualFull);
    const appInvoiceId = sendLinkJson.invoice.invoiceId;

    // Simulate Paystack webhook settling the annual bundle -> unlocks Stage 3!
    const appWhPayload = JSON.stringify({
      event: 'charge.success',
      data: {
        reference: appInvoiceId,
        amount: expectedAnnualFull * 100,
        channel: 'bank_transfer',
        paid_at: new Date().toISOString(),
        customer: { email: 'kemi@apexcoldchain.ng' },
        metadata: { type: 'saas_billing_invoice', invoiceId: appInvoiceId }
      }
    });
    const appWhSig = crypto.createHmac('sha512', testPaystackSecret).update(appWhPayload).digest('hex');
    const appWhRes = await fetch(`${baseUrl}/api/webhooks/paystack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-paystack-signature': appWhSig },
      body: appWhPayload
    });
    assert.equal(appWhRes.status, 200);

    // Status now unlocked -> Company submits staff roster!
    const statusAfterPay = await (await fetch(`${baseUrl}/api/public/onboarding/status?token=${encodeURIComponent(appToken)}`)).json();
    assert.equal(statusAfterPay.application.rosterUnlocked, true);
    assert.equal(statusAfterPay.application.status, 'PAID_AWAITING_ROSTER');

    const submitRosterRes = await fetch(`${baseUrl}/api/public/onboarding/roster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: appToken,
        staff: [
          { fullName: 'Musa Ibrahim', email: 'musa@apexcoldchain.ng', roleTitle: 'Fleet Driver', department: 'Logistics', monthlySalaryNgn: 160000, bankName: 'GTBank', accountNumber: '0123456789' },
          { fullName: 'Ngozi Eze', email: 'ngozi@apexcoldchain.ng', roleTitle: 'Shift Supervisor', department: 'Cold Storage', monthlySalaryNgn: 280000, bankName: 'Access Bank', accountNumber: '0987654321' }
        ]
      })
    });
    assert.equal(submitRosterRes.status, 200);
    const submitRosterJson = await submitRosterRes.json();
    assert.equal(submitRosterJson.application.status, 'ROSTER_SUBMITTED');

    // Admin imports staff roster -> LIVE!
    const importRes = await fetch(`${baseUrl}/api/admin/onboarding/applications/${encodeURIComponent(appId)}/import-roster`, {
      method: 'POST',
      headers: { Cookie: admCookie }
    });
    assert.equal(importRes.status, 200);
    const importJson = await importRes.json();
    assert.equal(importJson.importedCount, 2);
    assert.equal(importJson.application.status, 'LIVE');

    // Verify 5-tier metrics include the Corporate client!
    const tenantsSnap = await (await fetch(`${baseUrl}/api/admin/tenants`, { headers: { Cookie: admCookie } })).json();
    assert.ok(tenantsSnap.tierMetrics.byTier.corporate.clientCount >= 1);

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
