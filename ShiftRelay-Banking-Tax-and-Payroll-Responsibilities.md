# ShiftRelay Enterprise Banking, Tax Governance & Payroll Remittance Specification
## Phase: Legal & Financial Infrastructure | Milestone: Banking Setup, Tax Registration & Payroll Compliance

---

### Executive Objective
This operational specification formalizes the banking, corporate tax registration, and statutory payroll remittance infrastructure for **ShiftRelay Technologies Limited**. It outlines enterprise banking integration with Nigerian commercial institutions, establishes billing rules for subscription and onboarding fees (including Withholding Tax and Value Added Tax), codifies employer statutory deduction and remittance duties under federal legislation, and concludes with an audited, checked payroll calculation schedule for a representative frontline manufacturing operator.

---

## 1. Commercial Banking Setup & Corporate Treasury Architecture

ShiftRelay establishes its primary operating treasury with a Tier-1 Nigerian commercial banking partner (e.g., **Access Bank Plc / Zenith Bank Plc / Guaranty Trust Bank**) to support high-volume B2B subscription collections, automated corporate billing, and vendor settlement:

```
+-----------------------------------------------------------------------------------+
|                        SHIFTRELAY CORPORATE BANKING SETUP                         |
+-----------------------------------------------------------------------------------+
| 1. PRIMARY OPERATING ACCOUNT (NAIRA - NGN)                                        |
| - Dedicated to collecting client onboarding setup fees and monthly SaaS billings. |
| - Integrated with automated direct-debit clearing switches (GAPS / NIBSS).        |
+-----------------------------------------------------------------------------------+
| 2. STATUTORY TAX & ESCROW TRANSIT LEDGER                                          |
| - Dedicated non-interest buffer ring-fenced for payroll statutory liabilities.    |
| - Pre-funds PAYE tax, PenCom pension, and NSITF remittances on a 30-day cycle.   |
+-----------------------------------------------------------------------------------+
| 3. MULTI-CURRENCY DOMICILIARY ACCOUNT (USD / GBP)                                 |
| - Designated for receiving foreign angel investments, SAFEs, and paying cloud     |
|   infrastructure expenses (AWS compute, GitHub Enterprise, specialized tooling).  |
+-----------------------------------------------------------------------------------+
```

### 1.1 Account Opening Compliance Verification
* **Entity Documentation:** Certified CAC Status Report (Form CAC 1.1), Certificate of Incorporation, Memorandum & Articles of Association (MEMART).
* **Tax Clearance:** Corporate Tax Identification Number (TIN) generated via the integrated FIRS-CAC portal.
* **SCUML Exemption / Clearance:** Registered with the Special Control Unit Against Money Laundering (SCUML) under EFCC regulatory mandates.
* **Authorized Signatories & Mandate:** Dual-signatory authorization governance (Category A: Managing Director/CEO; Category B: Chief Financial Officer/Financial Controller).

---

## 2. Corporate Tax Registration & Enterprise Invoicing Rules

ShiftRelay’s commercial invoicing engine (integrated with **Xero**) adheres strictly to Nigerian tax legislation governed by the **Federal Inland Revenue Service (FIRS)** and relevant **State Internal Revenue Services (e.g., LIRS for Lagos State)**:

### 2.1 Value Added Tax (VAT 7.5%)
* **Statutory Baseline:** Section 34 of the Value Added Tax Act (as amended by recent Finance Acts).
* **Invoicing Requirement:** Every client invoice for subscription fees and onboarding packages carries a mandatory **7.5% VAT line-item**.
* **Remittance Obligation:** Collected output VAT is filed and remitted to the FIRS via the **TaxPro-Max** digital portal on or before the **21st day of the month** following the transaction.

### 2.2 Withholding Tax (WHT 5% on SaaS / Services)
* **Statutory Baseline:** Companies Income Tax (Withholding Tax) Regulations.
* **Enterprise Client Practice:** Blue-chip industrial clients (e.g., Flour Mills of Nigeria, BUA, Dangote) routinely withhold 5% on corporate software and consulting invoices, remitting directly to FIRS.
* **Credit Reconciliation in Xero:** ShiftRelay records the 5% deduction as an asset (**Withholding Tax Credit Receivable**), cross-referencing official FIRS WHT Credit Notes to offset annual Company Income Tax (CIT) liabilities.

### 2.3 Sample Enterprise Invoice Matrix (Xero Automated Schedule)
* **Client:** Flour Mills of Nigeria Plc (Apapa Hub)
* **Description:** Enterprise Tier Subscription (200 Frontline Workers) + Setup Package

```
+-----------------------------------------------------------------------------------+
| SHIFTRELAY TECHNOLOGIES LIMITED — TAX INVOICE (XERO INTEGRATED)                   |
| Invoice Ref: SR-INV-2026-0881 | Date: October 31, 2026 | Due Date: Net 15 Days   |
+-----------------------------------------------------------------------------------+
| ITEM DESCRIPTION                                         | AMOUNT (NGN)           |
+-----------------------------------------------------------------------------------+
| 1. One-Time Onboarding, Gate Blueprinting & Muster Setup | ₦1,500,000.00          |
| 2. Enterprise Platform Base Subscription Fee (Nov 2026)  | ₦400,000.00            |
| 3. Frontline Specialist Seats (200 Workers @ ₦4,500/mo)  | ₦900,000.00            |
+-----------------------------------------------------------------------------------+
| SUB-TOTAL                                                | ₦2,800,000.00          |
| Value Added Tax (VAT @ 7.5%)                             | ₦210,000.00            |
| TOTAL INVOICE VALUE PAYABLE                              | ₦3,010,000.00          |
| Less: Client Withholding Tax (WHT @ 5% on Service)       | (₦140,000.00)          |
| NET CASH DISBURSEMENT EXPECTED TO SHIFTRELAY BANK        | ₦2,870,000.00          |
+-----------------------------------------------------------------------------------+
```

---

## 3. Statutory Payroll Deductions & Employer Remittance Responsibilities

ShiftRelay enforces exact compliance with four mandatory Nigerian statutory bodies, ring-fencing remittance calendars and employer cost-to-company duties:

```
+-----------------------------------------------------------------------------------+
|                     STATUTORY PAYROLL REMITTANCE GOVERNANCE                       |
+-----------------------------------------------------------------------------------+
| STATUTORY BODY       | DEDUCTION BASE       | SPLIT / RATE       | REMITTANCE     |
|                      |                      |                    | DEADLINE       |
+-----------------------------------------------------------------------------------+
| 1. PAYE Income Tax   | Taxable Income       | Progressive Scale  | On or before   |
|    (State SIRS/LIRS) | (Gross minus CRA)    | (7% to 24%)        | 10th of next   |
|                      |                      |                    | calendar month |
| 2. PenCom Pension    | Monthly Emoluments   | 8% (Employee)      | Within 7       |
|    (Approved PFAs)   | (Basic+Housing+Trans)| 10% (Employer)     | working days   |
|                      |                      | Total = 18%        | of salary pay  |
| 3. NSITF Scheme      | Total Gross Monthly  | 1.0% (Employer     | Monthly        |
|    (Workers Comp)    | Payroll              | Cost-to-Company)   | statutory      |
|                      |                      | Zero worker cut    | filing         |
| 4. Nat. Housing Fund | Monthly Basic Salary | 2.5% (Employee)    | Within 1 month |
|    (FMBN - NHF)      |                      | Voluntary opt-in   | of deduction   |
+-----------------------------------------------------------------------------------+
```

### 3.1 Strict Statutory Deadlines & Penalty Avoidance
1. **The PenCom 7-Day Trap:** Under Section 11(3)(b) of the Pension Reform Act 2014, failure to remit pension deductions to the employee's Pension Fund Administrator (PFA) within **7 working days** attracts a statutory penalty of **not less than 2% of the unpaid balance for every month** of default. ShiftRelay automatically triggers countdown alerts on Day 3 post-payday.
2. **State PAYE 10th-Day Deadline:** Under Section 81 of PITA, unremitted taxes incur a **10% penalty plus interest at the Central Bank of Nigeria Monetary Policy Rate (MPR)**. The system auto-generates Form H1 state tax schedules by the 5th of each month.
3. **NSITF Audit Clearance:** ShiftRelay isolates the 1% NSITF contribution as an employer overhead, automatically producing the required payment schedule for annual **NSITF Compliance Certificates** (mandatory for corporate factory operations).

---

## 4. Checked Frontline Payroll Example (Audited Case Study)

### 4.1 Employee Profile & Operating Context
* **Worker Name:** Emeka Okafor
* **Role:** Senior Mill Operator (Grain Milling Department)
* **Employer:** Flour Mills of Nigeria Plc (Tenant ID: `FLO-NG-6093`)
* **Pay Cycle:** Monthly (26th of previous month to 25th of current month; Paid on the 28th)
* **Agreed Emoluments Breakdown:**
  - Basic Salary: ₦120,000.00
  - Housing Allowance: ₦50,000.00
  - Transport Allowance: ₦30,000.00
  - **Base Emoluments Subtotal:** **₦200,000.00**
  - Verified Overtime (16 Hours @ ₦1,875/hr): ₦30,000.00
  - Night Shift Differential Allowance: ₦20,000.00
  - **Total Gross Taxable Wages:** **₦250,000.00**

---

### 4.2 Step-by-Step Mathematical Calculation

#### Step 1: Pension Contribution (PRA 2014)
* Statutory Pension Base (Basic + Housing + Transport) = ₦200,000.00
* **Employee Pension (8%):** $₦200,000 \times 0.08 =$ **₦16,000.00** (Deducted from wage)
* **Employer Pension (10%):** $₦200,000 \times 0.10 =$ **₦20,000.00** (Employer cost)
* **Total PenCom Remittance:** **₦36,000.00**

#### Step 2: National Housing Fund (NHF)
* NHF Base = Basic Salary = ₦120,000.00
* **Employee NHF (2.5%):** $₦120,000 \times 0.025 =$ **₦3,000.00** (Deducted from wage)

#### Step 3: Consolidated Relief Allowance (CRA) Calculation (PITA / Finance Act)
* Total Gross Emoluments = ₦250,000.00
* Component 1: Higher of ₦200,000/12 (₦16,666.67) OR 1% of Gross (₦2,500.00) = **₦16,666.67**
* Component 2: 20% of Gross = $₦250,000 \times 0.20 =$ **₦50,000.00**
* **Total Statutory CRA Tax Relief:** $₦16,666.67 + ₦50,000.00 =$ **₦66,666.67**

#### Step 4: Taxable Income Determination
* Total Allowable Deductions: CRA (₦66,666.67) + Employee Pension (₦16,000.00) + Employee NHF (₦3,000.00) = **₦85,666.67**
* **Taxable Income Balance:** $₦250,000.00 - ₦85,666.67 =$ **₦164,333.33**

#### Step 5: Progressive PAYE Tax Bracket Computation
* First ₦25,000 (₦300,000/12) @ 7% = ₦1,750.00
* Next ₦25,000 (₦300,000/12) @ 11% = ₦2,750.00
* Next ₦41,666.67 (₦500,000/12) @ 15% = ₦6,250.00
* Remaining ₦72,666.66 @ 19% = ₦13,806.67
* **Total Monthly PAYE Tax Liability:** **₦24,556.67**

#### Step 6: Employer Overhead (NSITF 1%)
* Total Gross Wage = ₦250,000.00
* **Employer NSITF Contribution (1%):** $₦250,000 \times 0.01 =$ **₦2,500.00** (Zero employee impact)

---

### 4.3 Final Net Disbursement & Remittance Summary

```
+-----------------------------------------------------------------------------------+
|               OFFICIAL FRONTLINE WORKER MONTHLY PAYSLIP LEDGER                    |
+-----------------------------------------------------------------------------------+
| TOTAL GROSS EARNINGS (Base + Overtime + Shift Differential)       | ₦250,000.00   |
+-----------------------------------------------------------------------------------+
| STATUTORY EMPLOYEE DEDUCTIONS:                                                    |
| - PenCom Employee Pension (8%):                                   | (₦16,000.00)  |
| - National Housing Fund (NHF 2.5%):                               | (₦3,000.00)   |
| - State Internal Revenue PAYE Tax:                                | (₦24,556.67)  |
+-----------------------------------------------------------------------------------+
| TOTAL EMPLOYEE STATUTORY DEDUCTIONS                               | (₦43,556.67)  |
+-----------------------------------------------------------------------------------+
| NET TAKE-HOME SALARY (Bank-Ready Payout to Worker Account)        | ₦206,443.33   |
+-----------------------------------------------------------------------------------+
| EMPLOYER STATUTORY COST-TO-COMPANY (Paid directly by Employer):   |               |
| - PenCom Employer Pension Contribution (10%):                     | ₦20,000.00    |
| - NSITF Workers' Compensation Contribution (1% Gross):            | ₦2,500.00     |
+-----------------------------------------------------------------------------------+
| TOTAL EMPLOYER OVERHEAD REMITTANCE                                | ₦22,500.00    |
| TOTAL COMBINED STATUTORY REMITTANCE GENERATED TO GOVERNMENT/PFAs  | ₦66,056.67    |
+-----------------------------------------------------------------------------------+
```

---

## 5. Automated Financial Controls (Xero Integration Verification)
* **Reconciliation Accuracy:** The automated payroll calculation outputs match manual audited ICAN tax worksheets to 2 decimal places (zero rounding leakage).
* **Automated Batch Export:** Pushing to the Finance Desk generates two distinct output files:
  1. `ShiftRelay_Bank_Disbursement_Batch.csv` (Compatible with Access Bank GAPS / Zenith Bank direct clearing).
  2. `ShiftRelay_State_PAYE_PenCom_Schedule.csv` (Mapped directly to official state LIRS and PFA electronic intake templates).

---
*ShiftRelay Technologies Limited — Banking, Tax Governance & Payroll Specification.*
