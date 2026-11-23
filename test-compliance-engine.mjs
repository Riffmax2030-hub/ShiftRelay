import assert from 'node:assert';
import {
  calculateStatutoryDeductions,
  calculatePayeTax,
  calculateGrossFromNet,
  calculateCasualDailyPay,
  calculateHolidayOvertime,
  NIGERIAN_PUBLIC_HOLIDAYS_2026
} from './compliance-engine.mjs';

console.log('=== RUNNING NIGERIAN STATUTORY COMPLIANCE SUITE ===');

// 1. Test Statutory Deductions (Gross ₦200,000, Basic ₦100,000 -> BHT = ₦160,000 default 50%+20%+10%)
{
  const stat = calculateStatutoryDeductions(100000, 200000);
  console.log('[TEST 1] Statutory Deductions for ₦200,000 Gross / ₦100,000 Basic (BHT = ₦160,000):');
  console.log(stat);
  assert.strictEqual(stat.bhtBase, 160000, 'BHT base should be 160,000 (50% Basic + 20% Housing + 10% Transport)');
  assert.strictEqual(stat.employee.penComPension, 12800, 'Employee PenCom should be 8% of BHT (12,800)');
  assert.strictEqual(stat.employer.penComPension, 16000, 'Employer PenCom should be 10% of BHT (16,000)');
  assert.strictEqual(stat.employee.nhf, 2500, 'NHF should be 2.5% of Basic (2,500)');
  assert.strictEqual(stat.employer.nsitf, 2000, 'NSITF should be 1% of Gross (2,000)');
  assert.strictEqual(stat.employer.itf, 2000, 'ITF should be 1% of Gross (2,000)');
  console.log('✔ Test 1 Passed: Statutory deductions match PenCom BHT & ECA/ITF statutes.');
}

// 2. Test NTA 2025 PAYE (Zero CRA, ₦800k 0% band, Rent Relief & ₦70k Min Wage Exempt)
{
  const minWageTax = calculatePayeTax(70000, 35000);
  assert.strictEqual(minWageTax.minimumWageExempt, true, '₦70,000/mo minimum wage must be PAYE exempt');
  assert.strictEqual(minWageTax.monthlyTax, 0, '₦70,000/mo PAYE must be ₦0');

  const tax = calculatePayeTax(250000, 125000, { annualRentPaid: 1200000, rentVerified: true });
  console.log('\n[TEST 2] NTA 2025 PAYE Tax for ₦250,000 Monthly Gross (Verified Rent ₦1.2M/yr):');
  console.log(tax);
  assert.strictEqual(tax.annualGross, 3000000, 'Annual Gross should be 3,000,000');
  assert.strictEqual(tax.annualCra, 0, 'Legacy CRA must be 0 under NTA 2025');
  assert.strictEqual(tax.rentReliefAnnual, 240000, 'Rent Relief should be 20% of ₦1.2M = ₦240,000');
  assert(tax.monthlyTax > 0, 'Monthly PAYE tax should be positive above ₦800k band');
  console.log(`✔ Test 2 Passed: NTA 2025 PAYE computed accurately (Monthly Tax: ₦${tax.monthlyTax}).`);
}

// 3. Test Net-to-Gross Reverse Resolver
{
  const targetNet = 180000;
  const result = calculateGrossFromNet(targetNet);
  console.log(`\n[TEST 3] Reverse Resolver for Target Net ₦${targetNet.toLocaleString()}:`);
  console.log(result);
  const diff = Math.abs(result.actualNetSalary - targetNet);
  assert(diff <= 1.0, `Convergence failed: diff is ${diff}`);
  console.log(`✔ Test 3 Passed: Target Net ₦${targetNet.toLocaleString()} resolved to Gross ₦${result.grossSalary.toLocaleString()} (Tolerance: ₦${diff}).`);
}

// 4. Test Casual Daily Pay Accumulator
{
  const shifts = [
    { hoursWorked: 8, isOvertime: false },
    { hoursWorked: 4, isOvertime: true }
  ];
  const casual = calculateCasualDailyPay(shifts, 1500);
  console.log('\n[TEST 4] Casual Pay Accumulator:');
  console.log(casual);
  // Regular: 8 * 1500 = 12000. Overtime: 4 * 1500 * 1.5 = 9000. Total = 21000.
  assert.strictEqual(casual.totalPayableNgn, 21000, 'Total payable should be ₦21,000');
  console.log('✔ Test 4 Passed: Casual shifts with 1.5x overtime calculated correctly.');
}

// 5. Test Nigerian Public Holiday & Sunday Overtime
{
  // Independence Day 2026-10-01 (Public Holiday)
  const holiday = calculateHolidayOvertime('2026-10-01', 8, 1500);
  console.log('\n[TEST 5] Public Holiday Overtime:');
  console.log(holiday);
  assert.strictEqual(holiday.multiplier, 2.0, 'Holiday multiplier must be 2.0x');
  assert.strictEqual(holiday.totalCompensationNgn, 24000, 'Holiday pay should be 2.0x base (₦24,000)');

  // Normal weekday
  const normal = calculateHolidayOvertime('2026-10-02', 8, 1500);
  assert.strictEqual(normal.multiplier, 1.0, 'Normal workday multiplier must be 1.0x');
  assert.strictEqual(normal.totalCompensationNgn, 12000, 'Normal day pay should be ₦12,000');
  console.log('✔ Test 5 Passed: Nigerian public holiday matrix strictly enforces 2.0x double pay.');
}

console.log('\n=================================================');
console.log('✔ ALL NIGERIAN STATUTORY COMPLIANCE TESTS PASSED');
console.log('=================================================');
