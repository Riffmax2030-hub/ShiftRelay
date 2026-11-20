import { calculatePayeTax, calculateStatutoryDeductions } from './compliance-engine.mjs';

// ── 1. Employer-Paid SaaS Plans (Workers NEVER Charged) ──────────────────────
export const SAAS_PLAN_TIERS = {
  professional: {
    key: 'professional',
    label: 'Professional',
    maxWorkers: 150,
    baseFeeNgn: 150000,
    pepmRateNgn: 4500,
    onboardingFeeNgn: 750000,
    overagePepmNgn: 3000,
    surgePepmNgn: 2500
  },
  enterprise: {
    key: 'enterprise',
    label: 'Enterprise',
    maxWorkers: 500,
    baseFeeNgn: 400000,
    pepmRateNgn: 3500,
    onboardingFeeNgn: 1500000,
    overagePepmNgn: 3000,
    surgePepmNgn: 2500
  },
  enterprise_plus: {
    key: 'enterprise_plus',
    label: 'Enterprise Plus',
    maxWorkers: 1500,
    baseFeeNgn: 750000,
    pepmRateNgn: 2500,
    onboardingFeeNgn: 3000000,
    overagePepmNgn: 3000,
    surgePepmNgn: 2500
  }
};

export const SANDBOX_PILOT_CONFIG = {
  feeNgn: 250000,
  durationDays: 30,
  maxWorkers: 50,
  creditOnConversionPct: 100
};

export const BILLING_LIFECYCLE_STATES = [
  'pilot_active',
  'onboarding_pending',
  'active_subscription',
  'overdue_readonly'
];

export function resolvePlanTier(planKeyOrOrg) {
  const raw = typeof planKeyOrOrg === 'string'
    ? planKeyOrOrg
    : (planKeyOrOrg?.plan_tier || planKeyOrOrg?.planTier || planKeyOrOrg?.subscription_tier || 'professional');
  const norm = String(raw || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (norm === 'enterprise_plus' || norm === 'ent_plus') return SAAS_PLAN_TIERS.enterprise_plus;
  if (norm === 'enterprise' || norm === 'enterprise_founding_partner') return SAAS_PLAN_TIERS.enterprise;
  return SAAS_PLAN_TIERS.professional;
}

export function normalizeBillingLifecycleStatus(rawStatus) {
  const s = String(rawStatus || '').trim().toLowerCase();
  if (s === 'pilot_active' || s === 'pilot') return 'pilot_active';
  if (s === 'onboarding_pending' || s === 'onboarding') return 'onboarding_pending';
  if (s === 'active_subscription' || s === 'active') return 'active_subscription';
  if (s === 'overdue_readonly' || s === 'overdue_locked' || s === 'grace_period' || s === 'overdue') {
    return 'overdue_readonly';
  }
  return 'active_subscription';
}

export function countTenantBillableHeadcount(memberships = [], contracts = [], orgId) {
  const activeMembers = (memberships || []).filter(m => m.organisation_id === orgId && m.status === 'active');
  const contractByUid = new Map();
  for (const c of (contracts || [])) {
    if ((c.tenant_id || c.organisation_id) !== orgId) continue;
    const uid = c.userId || c.user_id || c.id;
    if (uid) contractByUid.set(uid, c);
  }
  let coreHeadcount = 0;
  let seasonalSurgeHeadcount = 0;
  for (const m of activeMembers) {
    const c = contractByUid.get(m.user_id) || contractByUid.get(m.id) || {};
    const empType = String(m.employment_type || c.employment_type || '').toLowerCase();
    const durationDays = Number(m.contract_duration_days ?? c.contract_duration_days ?? c.duration_days ?? 365);
    const isSurge = Boolean(
      m.is_seasonal || c.is_seasonal || c.surge_worker ||
      empType === 'seasonal' || empType === 'casual_surge' ||
      (Number.isFinite(durationDays) && durationDays > 0 && durationDays < 90)
    );
    if (isSurge) seasonalSurgeHeadcount += 1;
    else coreHeadcount += 1;
  }
  return {
    coreHeadcount,
    seasonalSurgeHeadcount,
    totalHeadcount: coreHeadcount + seasonalSurgeHeadcount
  };
}

export function calculateTenantMonthlyInvoice({
  planKey = 'professional',
  coreHeadcount = 0,
  seasonalSurgeHeadcount = 0,
  billingStatus = 'active_subscription',
  onboardingCompleted = true
} = {}) {
  const tier = resolvePlanTier(planKey);
  const status = normalizeBillingLifecycleStatus(billingStatus);
  const core = Math.max(0, Math.round(Number(coreHeadcount || 0)));
  const surge = Math.max(0, Math.round(Number(seasonalSurgeHeadcount || 0)));

  const cappedCoreHeadcount = Math.min(core, tier.maxWorkers);
  const overageHeadcount = Math.max(0, core - tier.maxWorkers);

  const baseFeeNgn = tier.baseFeeNgn;
  const corePepmFeeNgn = cappedCoreHeadcount * tier.pepmRateNgn;
  const overageFeeNgn = overageHeadcount * tier.overagePepmNgn;
  const surgeFeeNgn = surge * tier.surgePepmNgn;

  const recurringMonthlyTotalNgn = baseFeeNgn + corePepmFeeNgn + overageFeeNgn + surgeFeeNgn;
  const isPostOnboardingLive = Boolean(onboardingCompleted) && (status === 'active_subscription' || status === 'overdue_readonly');

  return {
    planKey: tier.key,
    planLabel: tier.label,
    tierCap: tier.maxWorkers,
    billingStatus: status,
    onboardingCompleted: Boolean(onboardingCompleted),
    recurringBillingEnabled: isPostOnboardingLive,
    coreHeadcount: core,
    cappedCoreHeadcount,
    overageHeadcount,
    seasonalSurgeHeadcount: surge,
    totalActiveHeadcount: core + surge,
    baseFeeNgn,
    pepmRateNgn: tier.pepmRateNgn,
    overagePepmNgn: tier.overagePepmNgn,
    surgePepmNgn: tier.surgePepmNgn,
    corePepmFeeNgn,
    overageFeeNgn,
    surgeFeeNgn,
    recurringMonthlyTotalNgn,
    billableThisCycleNgn: isPostOnboardingLive ? recurringMonthlyTotalNgn : 0,
    billedTo: 'EMPLOYER_ONLY',
    workerChargeNgn: 0
  };
}

export function calculateOnboardingInvoice({
  planKey = 'professional',
  pilotPaid = false,
  pilotCreditAmountNgn = SANDBOX_PILOT_CONFIG.feeNgn
} = {}) {
  const tier = resolvePlanTier(planKey);
  const grossOnboardingFeeNgn = tier.onboardingFeeNgn;
  const pilotCreditAppliedNgn = pilotPaid
    ? Math.min(grossOnboardingFeeNgn, Math.max(0, Number(pilotCreditAmountNgn || 0)))
    : 0;
  const netOnboardingFeeNgn = Math.max(0, grossOnboardingFeeNgn - pilotCreditAppliedNgn);

  return {
    invoiceType: 'ONBOARDING_ONE_TIME',
    planKey: tier.key,
    planLabel: tier.label,
    grossOnboardingFeeNgn,
    pilotPaid: Boolean(pilotPaid),
    pilotCreditAppliedNgn,
    netOnboardingFeeNgn,
    billedTo: 'EMPLOYER_ONLY',
    workerChargeNgn: 0
  };
}

export function calculateSandboxPilotInvoice() {
  return {
    invoiceType: 'SANDBOX_PILOT_30D',
    amountNgn: SANDBOX_PILOT_CONFIG.feeNgn,
    durationDays: SANDBOX_PILOT_CONFIG.durationDays,
    maxWorkers: SANDBOX_PILOT_CONFIG.maxWorkers,
    creditablePct: SANDBOX_PILOT_CONFIG.creditOnConversionPct,
    billedTo: 'EMPLOYER_ONLY',
    workerChargeNgn: 0
  };
}

// ── 2. Continuous Real-Time Payroll & Zero-Fee EWA Ledger (CBN Compliant) ────
export function computeWorkerAccruedLedger({
  contract = {},
  completedHours = 0,
  activeShiftHours = 0,
  ewaDisbursedNgn = 0,
  scheduledMonthHours = 160
} = {}) {
  const isMonthly = (contract.compensation_type || 'fixed_monthly') === 'fixed_monthly';
  const monthlyRate = Number(contract.monthly_rate ?? contract.monthly_salary ?? 0);
  const hourlyRate = Number(contract.hourly_rate || (monthlyRate > 0 ? Math.round(monthlyRate / scheduledMonthHours) : 1500));
  const totalWorkedHours = Math.max(0, Number(completedHours || 0) + Number(activeShiftHours || 0));

  let grossEarnedTodate = 0;
  if (isMonthly && monthlyRate > 0) {
    const ratio = Math.min(1, totalWorkedHours / Math.max(1, scheduledMonthHours));
    grossEarnedTodate = Math.round(monthlyRate * ratio * 100) / 100;
  } else {
    grossEarnedTodate = Math.round(totalWorkedHours * hourlyRate * 100) / 100;
  }

  const basicEarnedTodate = Math.round(grossEarnedTodate * 0.5 * 100) / 100;
  const stat = calculateStatutoryDeductions(basicEarnedTodate, grossEarnedTodate);
  const paye = calculatePayeTax(grossEarnedTodate, basicEarnedTodate);

  const payeNgn = Math.round(Number(paye.monthlyTax || 0) * 100) / 100;
  const pencomEmployeeNgn = Math.round(Number(stat.employee.penComPension || 0) * 100) / 100;
  const pencomEmployerNgn = Math.round(Number(stat.employer.penComPension || 0) * 100) / 100;
  const nhfNgn = Math.round(Number(stat.employee.nhf || 0) * 100) / 100;
  const nsitfNgn = Math.round(Number(stat.employer.nsitf || 0) * 100) / 100;

  const totalEmployeeWithheldNgn = Math.round((payeNgn + pencomEmployeeNgn + nhfNgn) * 100) / 100;
  const netEarnedTodate = Math.max(0, Math.round((grossEarnedTodate - totalEmployeeWithheldNgn) * 100) / 100);
  const disbursedTodate = Math.max(0, Math.round(Number(ewaDisbursedNgn || 0) * 100) / 100);
  const netAvailableDisbursal = Math.max(0, Math.round((netEarnedTodate - disbursedTodate) * 100) / 100);

  return {
    totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
    gross_earned_todate: grossEarnedTodate,
    statutory_withheld_todate: {
      paye: payeNgn,
      pencom_employee: pencomEmployeeNgn,
      pencom_employer: pencomEmployerNgn,
      nhf: nhfNgn,
      nsitf: nsitfNgn,
      total_employee_withheld: totalEmployeeWithheldNgn
    },
    net_earned_todate: netEarnedTodate,
    ewa_disbursed_todate: disbursedTodate,
    net_available_disbursal: netAvailableDisbursal,
    ewaPolicy: {
      employerSubscriptionNgn: 0,
      workerFeeNgn: 0,
      interestRatePct: 0,
      cbnZeroLendingCompliant: true,
      rails: ['Paystack NIP', 'Mono Open Banking']
    }
  };
}

// ── 3. Prefunded Payroll & Statutory Settlement Float Ledger ─────────────────
export const FLOAT_BUCKETS = ['payroll_net', 'paye', 'pencom', 'nhf', 'nsitf'];

export function ensureSettlementFloatState(store) {
  if (!store.settlementFloat || typeof store.settlementFloat !== 'object') {
    store.settlementFloat = { accounts: {}, ledger: [] };
  }
  if (!store.settlementFloat.accounts || typeof store.settlementFloat.accounts !== 'object') {
    store.settlementFloat.accounts = {};
  }
  if (!Array.isArray(store.settlementFloat.ledger)) {
    store.settlementFloat.ledger = [];
  }
  return store.settlementFloat;
}

export function getOrInitTenantFloatAccount(store, org) {
  const sf = ensureSettlementFloatState(store);
  const orgId = org.id;
  if (!sf.accounts[orgId]) {
    sf.accounts[orgId] = {
      tenantId: orgId,
      companyName: org.trading_name || org.legal_name || 'Enterprise Tenant',
      companyCode: org.organisation_code || 'SR-ORG',
      custodyPartner: org.custody_partner || 'Paystack Titan / Access Bank Custody',
      balances: {
        payroll_net: 0,
        paye: 0,
        pencom: 0,
        nhf: 0,
        nsitf: 0
      },
      updatedAt: new Date().toISOString()
    };
  }
  return sf.accounts[orgId];
}

export function computeTenantFloatReconciliation({ floatAccount, accruedObligations = {} }) {
  const b = floatAccount?.balances || {};
  const prefunded = {
    payroll_net: Math.round(Number(b.payroll_net || 0)),
    paye: Math.round(Number(b.paye || 0)),
    pencom: Math.round(Number(b.pencom || 0)),
    nhf: Math.round(Number(b.nhf || 0)),
    nsitf: Math.round(Number(b.nsitf || 0))
  };
  const totalPrefundedNgn = prefunded.payroll_net + prefunded.paye + prefunded.pencom + prefunded.nhf + prefunded.nsitf;

  const obligations = {
    payroll_net: Math.round(Number(accruedObligations.payroll_net || 0)),
    paye: Math.round(Number(accruedObligations.paye || 0)),
    pencom: Math.round(Number(accruedObligations.pencom || 0)),
    nhf: Math.round(Number(accruedObligations.nhf || 0)),
    nsitf: Math.round(Number(accruedObligations.nsitf || 0))
  };
  const totalObligationNgn = obligations.payroll_net + obligations.paye + obligations.pencom + obligations.nhf + obligations.nsitf;
  const varianceNgn = totalPrefundedNgn - totalObligationNgn;

  let reconciliationStatus = 'RECONCILED';
  if (totalPrefundedNgn < totalObligationNgn) reconciliationStatus = 'UNDERFUNDED';
  else if (totalPrefundedNgn > totalObligationNgn && totalObligationNgn > 0) reconciliationStatus = 'SURPLUS';

  return {
    tenantId: floatAccount.tenantId,
    companyName: floatAccount.companyName,
    companyCode: floatAccount.companyCode,
    custodyPartner: floatAccount.custodyPartner,
    prefunded,
    obligations,
    totalPrefundedNgn,
    totalObligationNgn,
    varianceNgn,
    reconciliationStatus,
    updatedAt: floatAccount.updatedAt
  };
}
