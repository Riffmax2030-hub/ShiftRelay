import { calculatePayeTax, calculateStatutoryDeductions } from './compliance-engine.mjs';

// ── 1. Employer-Paid SaaS Plans (Workers NEVER Charged) ──────────────────────
// 5-Tier Scalable Model based on company headcount selected during onboarding:
// One-Time Setup & Deployment + Combined Monthly Subscription
// (Monthly Maintenance Base + Active Workers × Per-Worker Fee)
export const SAAS_PLAN_TIER_ORDER = ['startup', 'business', 'enterprise', 'corporate', 'mega'];

export const SAAS_PLAN_TIERS = {
  startup: {
    key: 'startup',
    label: 'Startup',
    workerBand: '1–20 workers',
    minWorkers: 1,
    maxWorkers: 20,
    baseFeeNgn: 30000,
    pepmRateNgn: 2500,
    onboardingFeeNgn: 75000,
    overagePepmNgn: 2500,
    surgePepmNgn: 2000
  },
  business: {
    key: 'business',
    label: 'Business',
    workerBand: '21–50 workers',
    minWorkers: 21,
    maxWorkers: 50,
    baseFeeNgn: 60000,
    pepmRateNgn: 2500,
    onboardingFeeNgn: 150000,
    overagePepmNgn: 2500,
    surgePepmNgn: 2000
  },
  enterprise: {
    key: 'enterprise',
    label: 'Enterprise',
    workerBand: '51–100 workers',
    minWorkers: 51,
    maxWorkers: 100,
    baseFeeNgn: 120000,
    pepmRateNgn: 2250,
    onboardingFeeNgn: 300000,
    overagePepmNgn: 2250,
    surgePepmNgn: 1800
  },
  corporate: {
    key: 'corporate',
    label: 'Corporate',
    workerBand: '101–200 workers',
    minWorkers: 101,
    maxWorkers: 200,
    baseFeeNgn: 200000,
    pepmRateNgn: 2000,
    onboardingFeeNgn: 550000,
    overagePepmNgn: 2000,
    surgePepmNgn: 1600
  },
  mega: {
    key: 'mega',
    label: 'Mega',
    workerBand: '201+ workers',
    minWorkers: 201,
    maxWorkers: 10000,
    baseFeeNgn: 350000,
    pepmRateNgn: 1750,
    onboardingFeeNgn: 1000000,
    overagePepmNgn: 1750,
    surgePepmNgn: 1500
  }
};

export const SANDBOX_PILOT_CONFIG = {
  feeNgn: 50000,
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

export function recommendPlanTierForHeadcount(headcount = 1) {
  const n = Math.max(1, Math.round(Number(headcount || 1)));
  if (n <= SAAS_PLAN_TIERS.startup.maxWorkers) return SAAS_PLAN_TIERS.startup;
  if (n <= SAAS_PLAN_TIERS.business.maxWorkers) return SAAS_PLAN_TIERS.business;
  if (n <= SAAS_PLAN_TIERS.enterprise.maxWorkers) return SAAS_PLAN_TIERS.enterprise;
  if (n <= SAAS_PLAN_TIERS.corporate.maxWorkers) return SAAS_PLAN_TIERS.corporate;
  return SAAS_PLAN_TIERS.mega;
}

export function resolvePlanTier(planKeyOrOrg) {
  const raw = typeof planKeyOrOrg === 'string'
    ? planKeyOrOrg
    : (planKeyOrOrg?.plan_tier || planKeyOrOrg?.planTier || planKeyOrOrg?.subscription_tier || 'startup');
  const norm = String(raw || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (norm === 'mega' || norm === 'enterprise_plus' || norm === 'ent_plus' || norm === 'conglomerate') {
    return SAAS_PLAN_TIERS.mega;
  }
  if (norm === 'corporate' || norm === 'scale' || norm === 'growth_plus') {
    return SAAS_PLAN_TIERS.corporate;
  }
  if (norm === 'enterprise' || norm === 'enterprise_founding_partner') {
    return SAAS_PLAN_TIERS.enterprise;
  }
  if (norm === 'business' || norm === 'professional' || norm === 'growth') {
    return SAAS_PLAN_TIERS.business;
  }
  return SAAS_PLAN_TIERS.startup;
}

export function computeTierDistributionMetrics(tenantProfiles = []) {
  const totalClients = Array.isArray(tenantProfiles) ? tenantProfiles.length : 0;
  const byTier = {};
  for (const key of SAAS_PLAN_TIER_ORDER) {
    const t = SAAS_PLAN_TIERS[key];
    byTier[key] = {
      key: t.key,
      label: t.label,
      workerBand: t.workerBand,
      minWorkers: t.minWorkers,
      maxWorkers: t.maxWorkers,
      onboardingFeeNgn: t.onboardingFeeNgn,
      baseFeeNgn: t.baseFeeNgn,
      pepmRateNgn: t.pepmRateNgn,
      clientCount: 0,
      activeClients: 0,
      pendingClients: 0,
      totalWorkers: 0,
      monthlyMrrNgn: 0,
      projectedMrrNgn: 0,
      sharePct: 0
    };
  }
  for (const p of (tenantProfiles || [])) {
    const tier = resolvePlanTier(p.planKey || p.plan_tier || p.subscription_tier || 'startup');
    const bucket = byTier[tier.key];
    if (!bucket) continue;
    bucket.clientCount += 1;
    if (p.billingStatus === 'active_subscription') bucket.activeClients += 1;
    else bucket.pendingClients += 1;
    bucket.totalWorkers += Number(p.totalActiveHeadcount ?? p.coreHeadcount ?? p.activeWorkers ?? p.estimatedHeadcount ?? 0);
    bucket.monthlyMrrNgn += Number(p.billableThisCycleNgn ?? 0);
    bucket.projectedMrrNgn += Number(p.recurringMonthlyTotalNgn ?? p.monthlyFeeNgn ?? 0);
  }
  for (const key of SAAS_PLAN_TIER_ORDER) {
    byTier[key].sharePct = totalClients > 0 ? Math.round((byTier[key].clientCount / totalClients) * 100) : 0;
  }
  return {
    totalClients,
    tiers: SAAS_PLAN_TIER_ORDER.map(k => byTier[k]),
    byTier
  };
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

export function calculateTenantAnnualInvoice({
  planKey = 'startup',
  coreHeadcount = 0,
  seasonalSurgeHeadcount = 0,
  billingStatus = 'active_subscription',
  onboardingCompleted = true,
  includeSetupFee = false,
  pilotPaid = false,
  pilotCreditAmountNgn = SANDBOX_PILOT_CONFIG.feeNgn
} = {}) {
  const monthly = calculateTenantMonthlyInvoice({
    planKey,
    coreHeadcount,
    seasonalSurgeHeadcount,
    billingStatus,
    onboardingCompleted
  });
  const onboarding = includeSetupFee
    ? calculateOnboardingInvoice({ planKey: monthly.planKey, pilotPaid, pilotCreditAmountNgn })
    : null;
  const annualBaseFeeNgn = monthly.baseFeeNgn * 12;
  const annualCorePepmFeeNgn = monthly.corePepmFeeNgn * 12;
  const annualOverageFeeNgn = monthly.overageFeeNgn * 12;
  const annualSurgeFeeNgn = monthly.surgeFeeNgn * 12;
  const annualSubscriptionTotalNgn = monthly.recurringMonthlyTotalNgn * 12;
  const netOnboardingFeeNgn = onboarding ? onboarding.netOnboardingFeeNgn : 0;
  const grossOnboardingFeeNgn = onboarding ? onboarding.grossOnboardingFeeNgn : 0;
  const pilotCreditAppliedNgn = onboarding ? onboarding.pilotCreditAppliedNgn : 0;
  const totalDueNgn = annualSubscriptionTotalNgn + netOnboardingFeeNgn;

  return {
    invoiceType: includeSetupFee ? 'ANNUAL_ONBOARDING_BUNDLE' : 'ANNUAL_RECURRING',
    billingCycle: 'annual',
    billingMonths: 12,
    planKey: monthly.planKey,
    planLabel: monthly.planLabel,
    tierCap: monthly.tierCap,
    coreHeadcount: monthly.coreHeadcount,
    cappedCoreHeadcount: monthly.cappedCoreHeadcount,
    overageHeadcount: monthly.overageHeadcount,
    seasonalSurgeHeadcount: monthly.seasonalSurgeHeadcount,
    monthlyBaseFeeNgn: monthly.baseFeeNgn,
    pepmRateNgn: monthly.pepmRateNgn,
    monthlyCombinedTotalNgn: monthly.recurringMonthlyTotalNgn,
    annualBaseFeeNgn,
    annualCorePepmFeeNgn,
    annualOverageFeeNgn,
    annualSurgeFeeNgn,
    annualSubscriptionTotalNgn,
    includeSetupFee: Boolean(includeSetupFee),
    grossOnboardingFeeNgn,
    pilotCreditAppliedNgn,
    netOnboardingFeeNgn,
    totalDueNgn,
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
  scheduledMonthHours = 160,
  ewaMaxCapPct = 0.60,
  complianceOpts = {}
} = {}) {
  const isMonthly = (contract.compensation_type || 'fixed_monthly') === 'fixed_monthly';
  const monthlyRate = Number(contract.monthly_rate ?? contract.monthly_salary ?? 0);
  const hourlyRate = Number(contract.hourly_rate || (monthlyRate > 0 ? Math.round(monthlyRate / scheduledMonthHours) : 1500));
  // Strict EWA guardrail: only verified completed shift hours unlock withdrawable EWA
  const verifiedHours = Math.max(0, Number(completedHours || 0));
  const pendingActiveHours = Math.max(0, Number(activeShiftHours || 0));
  const totalWorkedHours = verifiedHours + pendingActiveHours;

  let grossEarnedTodate = 0;
  if (isMonthly && monthlyRate > 0) {
    const ratio = Math.min(1, verifiedHours / Math.max(1, scheduledMonthHours));
    grossEarnedTodate = Math.round(monthlyRate * ratio * 100) / 100;
  } else {
    grossEarnedTodate = Math.round(verifiedHours * hourlyRate * 100) / 100;
  }

  const basicRatio = Number(contract.basic_pct || 0.50);
  const basicEarnedTodate = Math.round(grossEarnedTodate * basicRatio * 100) / 100;
  const statOpts = {
    housingAllowance: contract.housing_pct != null ? Math.round(grossEarnedTodate * Number(contract.housing_pct) * 100) / 100 : undefined,
    transportAllowance: contract.transport_pct != null ? Math.round(grossEarnedTodate * Number(contract.transport_pct) * 100) / 100 : undefined,
    nhfEnabled: contract.nhf_enabled !== false,
    nhisMonthly: Number(contract.nhis_monthly_ngn || 0) * Math.min(1, verifiedHours / Math.max(1, scheduledMonthHours)),
    lifeAssuranceMonthly: Number(contract.life_assurance_monthly_ngn || 0) * Math.min(1, verifiedHours / Math.max(1, scheduledMonthHours)),
    annualRentPaid: Number(contract.annual_rent_ngn || 0),
    rentVerified: Boolean(contract.rent_doc_verified),
    ...complianceOpts
  };
  const stat = calculateStatutoryDeductions(basicEarnedTodate, grossEarnedTodate, statOpts);
  const paye = calculatePayeTax(grossEarnedTodate, basicEarnedTodate, statOpts);

  const payeNgn = Math.round(Number(paye.monthlyTax || 0) * 100) / 100;
  const pencomEmployeeNgn = Math.round(Number(stat.employee.penComPension || 0) * 100) / 100;
  const pencomEmployerNgn = Math.round(Number(stat.employer.penComPension || 0) * 100) / 100;
  const nhfNgn = Math.round(Number(stat.employee.nhf || 0) * 100) / 100;
  const nsitfNgn = Math.round(Number(stat.employer.nsitf || 0) * 100) / 100;

  const totalEmployeeWithheldNgn = Math.round((payeNgn + pencomEmployeeNgn + nhfNgn + Number(stat.employee.nhis || 0) + Number(stat.employee.lifeAssurance || 0)) * 100) / 100;
  const netEarnedTodate = Math.max(0, Math.round((grossEarnedTodate - totalEmployeeWithheldNgn) * 100) / 100);
  const safeCapPct = Math.min(0.70, Math.max(0.50, Number(ewaMaxCapPct || 0.60)));
  const ewaCappedLimitNgn = Math.round(netEarnedTodate * safeCapPct * 100) / 100;
  const disbursedTodate = Math.max(0, Math.round(Number(ewaDisbursedNgn || 0) * 100) / 100);
  const netAvailableDisbursal = Math.max(0, Math.round((ewaCappedLimitNgn - disbursedTodate) * 100) / 100);

  return {
    verifiedWorkedHours: Math.round(verifiedHours * 100) / 100,
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
    ewa_cap_pct: safeCapPct,
    ewa_capped_limit_ngn: ewaCappedLimitNgn,
    ewa_disbursed_todate: disbursedTodate,
    net_available_disbursal: netAvailableDisbursal,
    ewaPolicy: {
      employerSubscriptionNgn: 0,
      workerFeeNgn: 0,
      interestRatePct: 0,
      safetyCapPct: Math.round(safeCapPct * 100),
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
