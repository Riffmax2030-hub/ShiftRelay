/**
 * ShiftRelay Nigerian Labor Law, Payroll & Time Compliance Engine
 * Implements the Finance Act PAYE, Pension Reform Act (PenCom), NHF, NSITF,
 * Net-to-Gross Reverse Calculation, Casual Daily Pay & Public Holiday Overtime Matrix.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. STATUTORY DEDUCTIONS MODULE (PenCom, NHF, NSITF, ITF)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute statutory deductions according to Nigerian regulatory standards.
 * @param {number} basicSalary - Monthly basic salary (NGN)
 * @param {number} grossSalary - Monthly gross salary (NGN)
 * @returns {object} Breakdown of employee and employer statutory liabilities
 */
export function calculateStatutoryDeductions(basicSalary, grossSalary) {
  const b = Math.max(0, Number(basicSalary) || 0);
  const g = Math.max(0, Number(grossSalary) || 0);

  // PenCom PRA 2014: 8% Employee, 10% Employer (on Gross or Basic+Housing+Transport)
  const penComEmployee = Math.round(g * 0.08 * 100) / 100;
  const penComEmployer = Math.round(g * 0.10 * 100) / 100;

  // National Housing Fund (NHF): 2.5% of Basic Salary
  const nhf = Math.round(b * 0.025 * 100) / 100;

  // Employees' Compensation Act (NSITF): 1% of Gross (Employer cost)
  const nsitf = Math.round(g * 0.01 * 100) / 100;

  // Industrial Training Fund (ITF): 1% of total payroll (Employer liability)
  const itf = Math.round(g * 0.01 * 100) / 100;

  return {
    employee: {
      penComPension: penComEmployee,
      nhf: nhf,
      totalEmployeeDeductions: Math.round((penComEmployee + nhf) * 100) / 100
    },
    employer: {
      penComPension: penComEmployer,
      nsitf: nsitf,
      itf: itf,
      totalEmployerContribution: Math.round((penComEmployer + nsitf + itf) * 100) / 100
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PIT / PAYE CALCULATOR (Nigeria Finance Act & Consolidated Relief Allowance)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate Personal Income Tax (PAYE) per the Finance Act.
 * Consolidated Relief Allowance (CRA): Higher of 1% Gross or ₦200,000/yr (₦16,666.67/mo) + 20% Gross.
 * @param {number} monthlyGross - Monthly gross income (NGN)
 * @param {number} basicSalary - Monthly basic salary (NGN)
 * @param {number} otherExemptions - Additional voluntary pension, NHIS or life assurance
 * @returns {object} Itemized tax breakdown
 */
export function calculatePayeTax(monthlyGross, basicSalary, otherExemptions = 0) {
  const gross = Math.max(0, Number(monthlyGross) || 0);
  if (gross <= 0) {
    return { gross: 0, cra: 0, taxableIncome: 0, annualTax: 0, monthlyTax: 0, effectiveTaxRate: 0 };
  }

  const annualGross = gross * 12;
  const statutory = calculateStatutoryDeductions(basicSalary || gross * 0.5, gross);

  // Consolidated Relief Allowance (Annual)
  // Higher of 1% annual gross OR ₦200,000, PLUS 20% of annual gross
  const baseCra = Math.max(annualGross * 0.01, 200000);
  const percentageCra = annualGross * 0.20;
  const annualCra = baseCra + percentageCra;

  // Annual tax-exempt deductions (Employee PenCom + NHF + Other Exemptions)
  const annualExemptDeductions = (statutory.employee.totalEmployeeDeductions + otherExemptions) * 12;

  // Chargeable / Taxable Income
  const taxableAnnualIncome = Math.max(0, annualGross - annualCra - annualExemptDeductions);

  // Progressive Tax Bands (Sixth Schedule to the Personal Income Tax Act)
  let remaining = taxableAnnualIncome;
  let annualTax = 0;

  const BANDS = [
    { limit: 300000, rate: 0.07 },
    { limit: 300000, rate: 0.11 },
    { limit: 500000, rate: 0.15 },
    { limit: 500000, rate: 0.19 },
    { limit: 1600000, rate: 0.21 },
    { limit: Infinity, rate: 0.24 }
  ];

  for (const band of BANDS) {
    if (remaining <= 0) break;
    const taxableInBand = Math.min(remaining, band.limit);
    annualTax += taxableInBand * band.rate;
    remaining -= taxableInBand;
  }

  // Minimum Tax rule: Minimum 1% of Gross if calculated tax is lower (for low earners)
  const minimumAnnualTax = annualGross * 0.01;
  if (annualTax < minimumAnnualTax && taxableAnnualIncome > 0) {
    annualTax = minimumAnnualTax;
  }

  const monthlyTax = Math.round((annualTax / 12) * 100) / 100;
  const effectiveTaxRate = annualGross > 0 ? Math.round((annualTax / annualGross) * 10000) / 100 : 0;

  return {
    monthlyGross: gross,
    annualGross,
    monthlyCra: Math.round((annualCra / 12) * 100) / 100,
    annualCra: Math.round(annualCra * 100) / 100,
    annualTaxableIncome: Math.round(taxableAnnualIncome * 100) / 100,
    monthlyTax,
    annualTax: Math.round(annualTax * 100) / 100,
    effectiveTaxRate
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. NET-TO-GROSS REVERSE CALCULATOR (Negotiated Net Salary Resolver)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Solves the gross salary backward from a desired net take-home salary.
 * Uses binary search convergence (< ₦0.01 tolerance).
 * @param {number} targetNet - Negotiated monthly net salary (NGN)
 * @param {number} basicRatio - Ratio of basic salary to gross (default: 0.50)
 * @returns {object} Derived gross, tax and deductions
 */
export function calculateGrossFromNet(targetNet, basicRatio = 0.50) {
  const target = Math.max(0, Number(targetNet) || 0);
  if (target === 0) return { gross: 0, net: 0, tax: 0, deductions: 0 };

  let low = target;
  let high = target * 1.65; // High bound estimate for top tax brackets
  let iteration = 0;

  while (iteration < 60) {
    iteration++;
    const midGross = (low + high) / 2;
    const basic = midGross * basicRatio;
    const statutory = calculateStatutoryDeductions(basic, midGross);
    const tax = calculatePayeTax(midGross, basic);
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

/**
 * Accumulate shift earnings for casual workers paid daily or weekly.
 * Generates ready-to-disburse transfer objects for banking / transfer APIs.
 * @param {Array} shiftRecords - Array of verified punches with hoursWorked
 * @param {number} hourlyRate - Agreed hourly rate (NGN)
 * @returns {object} Total hours, gross earnings, and payment recipient object
 */
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

/**
 * Official Federal Nigerian Public Holidays (Fixed and Calendar Dates)
 */
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

/**
 * Determines whether a date is a Nigerian Public Holiday or Sunday rest day,
 * and returns the appropriate overtime multiplier:
 * - Normal Workday Overtime: 1.5x
 * - Sunday / Official Public Holiday Shift: 2.0x (Double Pay)
 * @param {string|Date} dateInput - ISO date or Date object
 * @param {number} hoursWorked - Total hours worked on shift
 * @param {number} regularHourlyRate - Base hourly rate (NGN)
 * @returns {object} Overtime rate classification and compensation
 */
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
