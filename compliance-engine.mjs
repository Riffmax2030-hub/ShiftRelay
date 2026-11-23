/**
 * ShiftRelay Nigerian Labor Law, Payroll & Time Compliance Engine
 * Implements Nigeria Tax Act (NTA) 2025 (effective Jan 1, 2026),
 * Pension Reform Act (PenCom BHT), NHF, NSITF, ITF,
 * Net-to-Gross Reverse Calculation, Casual Daily Pay,
 * Public Holiday Overtime Matrix, and Nigerian Labour Act Section 7 & Leave/Notice rules.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 0. NIGERIAN STATE TAX AUTHORITIES & NTA 2025 CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const NIGERIAN_STATE_IRS_MAP = Object.freeze({
  Lagos: 'LIRS (Lagos State Internal Revenue Service)',
  FCT: 'FCT-IRS (FCT Internal Revenue Service)',
  Abuja: 'FCT-IRS (FCT Internal Revenue Service)',
  Rivers: 'RIRS (Rivers State Internal Revenue Service)',
  Ogun: 'OGIRS (Ogun State Internal Revenue Service)',
  Oyo: 'OYIRS (Oyo State Internal Revenue Service)',
  Kano: 'KIRS (Kano State Internal Revenue Service)',
  Kaduna: 'KADIRS (Kaduna State Internal Revenue Service)',
  Enugu: 'ESIRS (Enugu State Internal Revenue Service)',
  Delta: 'DSIRS (Delta State Internal Revenue Service)',
  Edo: 'EIRS (Edo State Internal Revenue Service)'
});

export function resolveStateTaxAuthority(stateOfResidence = 'Lagos') {
  const raw = String(stateOfResidence || 'Lagos').trim();
  const hit = Object.entries(NIGERIAN_STATE_IRS_MAP).find(
    ([k]) => k.toLowerCase() === raw.toLowerCase()
  );
  if (hit) return { state: hit[0], authority: hit[1] };
  return {
    state: raw || 'Lagos',
    authority: `${raw || 'State'} Internal Revenue Service (SIRS)`
  };
}

export const NTA_2025_MINIMUM_WAGE_MONTHLY = 70000;
export const NTA_2025_MINIMUM_WAGE_ANNUAL = 840000;
export const NTA_2025_MAX_RENT_RELIEF_ANNUAL = 500000;

// ─────────────────────────────────────────────────────────────────────────────
// 1. STATUTORY DEDUCTIONS MODULE (PenCom on BHT, NHF, NSITF, ITF)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute statutory deductions according to Nigerian regulatory standards.
 * PenCom PRA 2014: minimum 8% Employee + 10% Employer on Basic + Housing + Transport (BHT).
 *
 * @param {number} basicSalary - Monthly basic salary (NGN)
 * @param {number} grossSalary - Monthly gross salary (NGN)
 * @param {object} [opts]
 * @param {number} [opts.housingAllowance] - Monthly housing allowance (defaults to 20% gross if omitted)
 * @param {number} [opts.transportAllowance] - Monthly transport allowance (defaults to 10% gross if omitted)
 * @param {boolean} [opts.nhfEnabled=true] - Toggle for private-sector NHF applicability
 * @param {number} [opts.nhisMonthly=0] - Monthly NHIS / Health Insurance employee contribution
 * @param {number} [opts.lifeAssuranceMonthly=0] - Monthly Life Assurance premium
 * @param {number} [opts.employeeCount=5] - Employer headcount for ITF threshold (>=5)
 * @param {number} [opts.annualTurnoverNgn=0] - Employer annual turnover for ITF threshold (>=₦50M)
 * @returns {object} Breakdown of employee and employer statutory liabilities
 */
export function calculateStatutoryDeductions(basicSalary, grossSalary, opts = {}) {
  const g = Math.max(0, Number(grossSalary) || 0);
  const b = basicSalary != null && Number(basicSalary) >= 0
    ? Math.max(0, Number(basicSalary) || 0)
    : Math.round(g * 0.50 * 100) / 100;

  const hasExplicitBht = opts.housingAllowance != null || opts.transportAllowance != null;
  const housing = opts.housingAllowance != null
    ? Math.max(0, Number(opts.housingAllowance) || 0)
    : Math.round(g * 0.20 * 100) / 100;
  const transport = opts.transportAllowance != null
    ? Math.max(0, Number(opts.transportAllowance) || 0)
    : Math.round(g * 0.10 * 100) / 100;

  // PenCom PRA 2014 base = Basic + Housing + Transport (BHT), capped at gross
  const rawBht = b + housing + transport;
  const bhtBase = g > 0 ? Math.min(g, rawBht > 0 ? rawBht : g * 0.80) : 0;
  const bhtRatio = g > 0 ? Math.round((bhtBase / g) * 10000) / 10000 : 0;
  const bhtComplianceWarning = g > 0 && bhtRatio < 0.50
    ? `BHT (${Math.round(bhtRatio * 100)}% of gross) is below the 50% statutory PenCom guideline.`
    : null;

  // PenCom: 8% Employee, 10% Employer on BHT
  const penComEmployee = Math.round(bhtBase * 0.08 * 100) / 100;
  const penComEmployer = Math.round(bhtBase * 0.10 * 100) / 100;

  // National Housing Fund (NHF): 2.5% of Basic Salary (subject to toggle)
  const nhfEnabled = opts.nhfEnabled !== false;
  const nhf = nhfEnabled ? Math.round(b * 0.025 * 100) / 100 : 0;

  const nhis = Math.max(0, Math.round((Number(opts.nhisMonthly) || 0) * 100) / 100);
  const lifeAssurance = Math.max(0, Math.round((Number(opts.lifeAssuranceMonthly) || 0) * 100) / 100);

  // Employees' Compensation Act (NSITF): 1% of total monthly payroll (Employer cost only)
  const nsitf = Math.round(g * 0.01 * 100) / 100;

  // Industrial Training Fund (ITF): 1% of annual payroll for qualifying employers (5+ staff OR >= ₦50M turnover)
  const empCount = Number(opts.employeeCount ?? 5);
  const turnover = Number(opts.annualTurnoverNgn ?? 0);
  const itfQualifies = opts.itfApplicable != null ? Boolean(opts.itfApplicable) : (empCount >= 5 || turnover >= 50_000_000);
  const itf = itfQualifies ? Math.round(g * 0.01 * 100) / 100 : 0;

  const totalEmployeeDeductions = Math.round((penComEmployee + nhf + nhis + lifeAssurance) * 100) / 100;

  return {
    bhtBase: Math.round(bhtBase * 100) / 100,
    bhtRatio,
    bhtComplianceWarning,
    hasExplicitBht,
    itfQualifies,
    employee: {
      penComPension: penComEmployee,
      nhf,
      nhis,
      lifeAssurance,
      totalEmployeeDeductions
    },
    employer: {
      penComPension: penComEmployer,
      nsitf,
      itf,
      totalEmployerContribution: Math.round((penComEmployer + nsitf + itf) * 100) / 100
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. NTA 2025 PIT / PAYE CALCULATOR (Effective January 1, 2026)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate Personal Income Tax (PAYE) per the Nigeria Tax Act (NTA) 2025:
 * - Legacy CRA completely eliminated.
 * - Legacy 1% minimum tax eliminated.
 * - National Minimum Wage Exemption: <= ₦70,000/month (₦840,000/year) => ₦0 PAYE.
 * - Rent Relief: 20% of annual rent paid, capped at ₦500,000/year (requires rentVerified=true).
 * - Allowable Tax-Exempt Deductions: Employee PenCom (8% BHT), NHF (2.5% Basic), NHIS, Life Assurance.
 * - Progressive NTA 2025 Annual Bands:
 *   First ₦800,000: 0%
 *   Next ₦2,200,000: 15%
 *   Next ₦9,000,000: 18%
 *   Next ₦13,000,000: 21%
 *   Next ₦25,000,000: 23%
 *   Above ₦50,000,000: 25%
 *
 * @param {number} monthlyGross - Monthly gross income (NGN)
 * @param {number} basicSalary - Monthly basic salary (NGN)
 * @param {number|object} [otherOrOpts=0] - Additional monthly exemptions OR full options object
 * @returns {object} Itemized NTA 2025 tax breakdown
 */
export function calculatePayeTax(monthlyGross, basicSalary, otherOrOpts = 0) {
  const opts = typeof otherOrOpts === 'object' && otherOrOpts !== null
    ? otherOrOpts
    : { otherExemptions: Number(otherOrOpts) || 0 };

  const gross = Math.max(0, Number(monthlyGross) || 0);
  if (gross <= 0) {
    return {
      monthlyGross: 0,
      annualGross: 0,
      minimumWageExempt: true,
      rentReliefAnnual: 0,
      rentReliefMonthly: 0,
      monthlyCra: 0,
      annualCra: 0,
      annualTaxableIncome: 0,
      monthlyTax: 0,
      annualTax: 0,
      effectiveTaxRate: 0,
      regime: 'NTA_2025'
    };
  }

  const annualGross = gross * 12;
  const statutory = calculateStatutoryDeductions(basicSalary ?? gross * 0.50, gross, opts);

  // National Minimum Wage Exemption (₦70,000/month or ₦840,000/year)
  if (annualGross <= NTA_2025_MINIMUM_WAGE_ANNUAL) {
    return {
      monthlyGross: gross,
      annualGross,
      minimumWageExempt: true,
      rentReliefAnnual: 0,
      rentReliefMonthly: 0,
      monthlyCra: 0,
      annualCra: 0,
      annualTaxableIncome: 0,
      monthlyTax: 0,
      annualTax: 0,
      effectiveTaxRate: 0,
      statutory,
      regime: 'NTA_2025'
    };
  }

  // Rent Relief: 20% of annual rent paid, capped at ₦500,000/yr, ONLY if document-verified
  const annualRentPaid = Math.max(0, Number(opts.annualRentPaid) || 0);
  const rentVerified = Boolean(opts.rentVerified);
  const rentReliefAnnual = rentVerified
    ? Math.min(NTA_2025_MAX_RENT_RELIEF_ANNUAL, Math.round(annualRentPaid * 0.20 * 100) / 100)
    : 0;
  const rentReliefMonthly = Math.round((rentReliefAnnual / 12) * 100) / 100;

  // Annual tax-exempt deductions (Employee PenCom + NHF + NHIS + Life Assurance + optional extra)
  const extraMonthly = Math.max(0, Number(opts.otherExemptions) || 0);
  const annualExemptDeductions = (statutory.employee.totalEmployeeDeductions + extraMonthly) * 12;

  // Annual Chargeable / Taxable Income (NO legacy CRA)
  const taxableAnnualIncome = Math.max(0, annualGross - rentReliefAnnual - annualExemptDeductions);

  // Progressive Tax Bands (Nigeria Tax Act 2025)
  let remaining = taxableAnnualIncome;
  let annualTax = 0;

  const NTA_2025_BANDS = [
    { limit: 800000, rate: 0.00 },
    { limit: 2200000, rate: 0.15 },
    { limit: 9000000, rate: 0.18 },
    { limit: 13000000, rate: 0.21 },
    { limit: 25000000, rate: 0.23 },
    { limit: Infinity, rate: 0.25 }
  ];

  for (const band of NTA_2025_BANDS) {
    if (remaining <= 0) break;
    const taxableInBand = Math.min(remaining, band.limit);
    annualTax += taxableInBand * band.rate;
    remaining -= taxableInBand;
  }

  const monthlyTax = Math.round((annualTax / 12) * 100) / 100;
  const effectiveTaxRate = annualGross > 0 ? Math.round((annualTax / annualGross) * 10000) / 100 : 0;

  return {
    monthlyGross: gross,
    annualGross,
    minimumWageExempt: false,
    rentReliefAnnual,
    rentReliefMonthly,
    monthlyCra: 0,
    annualCra: 0,
    annualTaxableIncome: Math.round(taxableAnnualIncome * 100) / 100,
    monthlyTax,
    annualTax: Math.round(annualTax * 100) / 100,
    effectiveTaxRate,
    statutory,
    regime: 'NTA_2025'
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. NET-TO-GROSS REVERSE CALCULATOR (Negotiated Net Salary Resolver)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Solves the gross salary backward from a desired net take-home salary under NTA 2025.
 * Uses binary search convergence (< ₦0.01 tolerance).
 * @param {number} targetNet - Negotiated monthly net salary (NGN)
 * @param {number} basicRatio - Ratio of basic salary to gross (default: 0.50)
 * @param {object} [opts] - Optional NTA 2025 reliefs/statutory flags
 * @returns {object} Derived gross, tax and deductions
 */
export function calculateGrossFromNet(targetNet, basicRatio = 0.50, opts = {}) {
  const target = Math.max(0, Number(targetNet) || 0);
  if (target === 0) return { grossSalary: 0, targetNetSalary: 0, actualNetSalary: 0, monthlyPayeTax: 0 };

  let low = target;
  let high = target * 1.75;
  let iteration = 0;

  while (iteration < 65) {
    iteration++;
    const midGross = (low + high) / 2;
    const basic = midGross * basicRatio;
    const statutory = calculateStatutoryDeductions(basic, midGross, opts);
    const tax = calculatePayeTax(midGross, basic, opts);
    const computedNet = midGross - statutory.employee.totalEmployeeDeductions - tax.monthlyTax;

    const diff = computedNet - target;
    if (Math.abs(diff) < 0.01) {
      return {
        grossSalary: Math.round(midGross * 100) / 100,
        targetNetSalary: target,
        actualNetSalary: Math.round(computedNet * 100) / 100,
        monthlyPayeTax: tax.monthlyTax,
        employeePension: statutory.employee.penComPension,
        employeeNhf: statutory.employee.nhf,
        employerPension: statutory.employer.penComPension,
        totalCostToEmployer: Math.round((midGross + statutory.employer.totalEmployerContribution) * 100) / 100
      };
    }

    if (computedNet < target) {
      low = midGross;
    } else {
      high = midGross;
    }
  }

  const finalGross = Math.round(((low + high) / 2) * 100) / 100;
  return {
    grossSalary: finalGross,
    targetNetSalary: target
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CASUAL LABOR & DAILY/WEEKLY PAY ACCUMULATOR
// ─────────────────────────────────────────────────────────────────────────────

export function calculateCasualDailyPay(shiftRecords = [], hourlyRate = 1200) {
  const rate = Math.max(0, Number(hourlyRate) || 1200);
  let totalRegularHours = 0;
  let totalOvertimeHours = 0;
  let totalGross = 0;

  shiftRecords.forEach(shift => {
    const hours = Number(shift.hoursWorked) || 0;
    const isOt = Boolean(shift.isOvertime);
    const multiplier = shift.multiplier || (isOt ? 1.5 : 1.0);

    if (isOt) {
      totalOvertimeHours += hours;
    } else {
      totalRegularHours += hours;
    }
    totalGross += hours * rate * multiplier;
  });

  return {
    totalShifts: shiftRecords.length,
    totalRegularHours: Math.round(totalRegularHours * 100) / 100,
    totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    totalHours: Math.round((totalRegularHours + totalOvertimeHours) * 100) / 100,
    hourlyRate: rate,
    totalPayableNgn: Math.round(totalGross * 100) / 100,
    formattedPayable: '₦' + Math.round(totalGross).toLocaleString('en-NG')
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PUBLIC HOLIDAY & OVERTIME MULTIPLIER MATRIX
// ─────────────────────────────────────────────────────────────────────────────

export const NIGERIAN_PUBLIC_HOLIDAYS_2026 = [
  '2026-01-01', // New Year's Day
  '2026-04-03', // Good Friday
  '2026-04-06', // Easter Monday
  '2026-05-01', // Workers' Day
  '2026-05-27', // Children's Day (Schools)
  '2026-06-12', // Democracy Day
  '2026-10-01', // Independence Day
  '2026-12-25', // Christmas Day
  '2026-12-26'  // Boxing Day
];

export function calculateHolidayOvertime(dateInput, hoursWorked, regularHourlyRate) {
  const d = new Date(dateInput);
  const dateStr = d.toISOString().slice(0, 10);
  const isSunday = d.getDay() === 0;
  const isPublicHoliday = NIGERIAN_PUBLIC_HOLIDAYS_2026.includes(dateStr);

  let multiplier = 1.0;
  let rateType = 'REGULAR_SHIFT';

  if (isPublicHoliday) {
    multiplier = 2.0;
    rateType = 'PUBLIC_HOLIDAY_DOUBLE_TIME';
  } else if (isSunday) {
    multiplier = 2.0;
    rateType = 'SUNDAY_REST_DAY_DOUBLE_TIME';
  } else if (hoursWorked > 8) {
    multiplier = 1.5;
    rateType = 'OVERTIME_TIME_AND_A_HALF';
  }

  const hours = Math.max(0, Number(hoursWorked) || 0);
  const baseRate = Math.max(0, Number(regularHourlyRate) || 0);
  const totalPay = hours * baseRate * multiplier;

  return {
    date: dateStr,
    isPublicHoliday,
    isSunday,
    rateType,
    multiplier,
    hoursWorked: hours,
    baseHourlyRate: baseRate,
    effectiveHourlyRate: baseRate * multiplier,
    totalCompensationNgn: Math.round(totalPay * 100) / 100
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. NIGERIAN LABOUR ACT GOVERNANCE (Section 7, Leave Minimums & Notice)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes statutory notice period & leave minimums under the Nigerian Labour Act (Cap L1).
 * - Annual Leave: minimum 6 working days with full pay after 12 months continuous service.
 * - Maternity Leave: minimum 12 weeks (84 days; 6 weeks before + 6 weeks after) at >= 50% pay.
 * - Notice Period:
 *   < 3 months: 1 day
 *   3 months to < 2 years: 1 week
 *   2 years to < 5 years: 2 weeks
 *   >= 5 years: 1 month
 */
export function getLabourActEntitlements({ hireDate = null, asOfDate = new Date() } = {}) {
  const ref = new Date(asOfDate);
  const hired = hireDate ? new Date(hireDate) : null;
  const tenureDays = hired && Number.isFinite(hired.getTime())
    ? Math.max(0, Math.floor((ref.getTime() - hired.getTime()) / 86400000))
    : 365;
  const tenureMonths = tenureDays / 30.4375;

  let statutoryNoticeLabel = '1 month';
  let statutoryNoticeDays = 30;
  if (tenureMonths < 3) {
    statutoryNoticeLabel = '1 day';
    statutoryNoticeDays = 1;
  } else if (tenureMonths < 24) {
    statutoryNoticeLabel = '1 week';
    statutoryNoticeDays = 7;
  } else if (tenureMonths < 60) {
    statutoryNoticeLabel = '2 weeks';
    statutoryNoticeDays = 14;
  }

  return {
    tenureDays,
    tenureMonths: Math.round(tenureMonths * 10) / 10,
    annualLeaveMinimumWorkingDays: tenureMonths >= 12 ? 6 : 0,
    annualLeaveEligible: tenureMonths >= 12,
    maternityLeaveMinimumWeeks: 12,
    maternityLeaveMinimumDays: 84,
    maternityMinPayPct: 50,
    statutoryNoticeLabel,
    statutoryNoticeDays
  };
}

export function validateLabourActLeaveRequest({ leaveType = 'annual', daysRequested = 0, hireDate = null, payPct = 100 } = {}) {
  const ent = getLabourActEntitlements({ hireDate });
  const type = String(leaveType || 'annual').toLowerCase();
  const days = Math.max(0, Number(daysRequested) || 0);
  const warnings = [];

  if (type === 'maternity') {
    if (days < 84) warnings.push('Nigerian Labour Act s.54 requires a minimum of 12 weeks (84 days) maternity leave.');
    if (Number(payPct) < 50) warnings.push('Nigerian Labour Act s.54 requires at least 50% wages during statutory maternity leave.');
  } else if (type === 'annual') {
    if (!ent.annualLeaveEligible) {
      warnings.push('Employee has under 12 months continuous service; statutory 6-day minimum accrues at 12 months (Labour Act s.18).');
    } else if (days > 0 && days < 6) {
      warnings.push('Note: Statutory annual leave entitlement is at least 6 working days with full pay after 12 months (Labour Act s.18).');
    }
  }
  return { ok: warnings.length === 0, warnings, entitlements: ent };
}

export function generateSection7WrittenParticulars(employee = {}, org = {}) {
  const ent = getLabourActEntitlements({ hireDate: employee.hireDate || employee.hire_date });
  const gross = Number(employee.grossPay || employee.monthly_rate || 0);
  const hireDateStr = (employee.hireDate || employee.hire_date || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const dueBy = new Date(new Date(hireDateStr).getTime() + 90 * 86400000).toISOString().slice(0, 10);
  const taxJurisdiction = resolveStateTaxAuthority(employee.state_of_residence || org.state || 'Lagos');

  return {
    statute: 'Nigerian Labour Act Cap L1, Section 7 (Written Particulars of Employment)',
    employerName: org.legal_name || org.trading_name || 'ShiftRelay Employer',
    employerAddress: org.headquarters_address || org.address || 'Nigeria',
    employeeName: employee.userName || employee.name || 'Employee',
    staffId: employee.staffId || 'SR-STAFF',
    jobTitle: employee.role || employee.title || 'Operations Specialist',
    department: employee.department || 'Operations',
    hireDate: hireDateStr,
    writtenParticularsDueBy: dueBy,
    remuneration: {
      monthlyGrossNgn: gross,
      payInterval: 'Monthly (25th)',
      overtimeRate: '1.5x Weekday OT / 2.0x Sunday & Federal Public Holiday'
    },
    workingHours: employee.shiftWindow || '40 hours/week (8 hours/day standard)',
    leaveEntitlements: {
      annualLeave: 'Minimum 6 working days paid leave after 12 months continuous service (s.18)',
      maternityLeave: 'Minimum 12 weeks (6 weeks pre-natal + 6 weeks post-natal) at >= 50% pay (s.54)',
      sickLeave: 'Up to 12 working days paid sick leave per year on medical certificate (s.16)'
    },
    terminationNotice: {
      currentTenureNotice: ent.statutoryNoticeLabel,
      schedule: '<3m: 1 day | 3m-2y: 1 week | 2y-5y: 2 weeks | 5y+: 1 month (s.11)'
    },
    taxAndPension: {
      payeStateAuthority: taxJurisdiction.authority,
      pfaName: employee.pfa_name || 'Employee-Nominated PFA',
      rsaPin: employee.pencom_rsa_pin || 'Pending RSA PIN'
    }
  };
}
