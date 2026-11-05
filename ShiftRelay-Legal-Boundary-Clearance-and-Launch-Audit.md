# ShiftRelay Legal Gate & Pre-Launch Compliance Clearance Specification
## Phase: Final Pre-Launch Governance | Milestone: Fintech Boundary Clearance & Commercial Go-Live Audit

---

### Executive Objective & Formal Declaration
This specification documents the **Formal Compliance Sign-Off & Legal Boundary Clearance** for **ShiftRelay Technologies Limited** ahead of enterprise commercial deployment. It enforces the strict, code-level disabling of in-app digital stored-value wallets and consumer lending/credit features pending Central Bank of Nigeria (CBN) licensing or partnerships with regulated banking institutions. It establishes an absolute legal barrier preventing the use of shift attendance telemetry for credit underwriting, and concludes with an audited **Pre-Launch Readiness Matrix** certifying that all corporate formation, tax registration, NDPA privacy governance, and enterprise contracting milestones have **ZERO UNRESOLVED LAUNCH BLOCKERS**.

---

## 1. Statutory Ring-Fencing: Wallets & Lending Feature Flags

### 1.1 Central Bank of Nigeria (CBN) Regulatory Framework
Under the **Banks and Other Financial Institutions Act (BOFIA 2020)** and the **CBN Guidelines on Mobile Money Services / Payment Service Solution Providers (PSSP)**:
* Operating stored-value consumer accounts, retaining cash deposits, or executing closed-loop digital wallets requires a licensed commercial bank, a licensed Microfinance Bank (MFB), or an accredited Mobile Money Operator (MMO) with minimum statutory capital reserves of **₦100 Million to ₦2 Billion**.
* Offering Earned Wage Access (EWA) or payroll advance loans requires a valid **State Money Lenders License** and registration with the **Federal Competition and Consumer Protection Commission (FCCPC)** under the Limited Interim Regulatory/Registration Framework and Guidelines for Digital Lending 2022.

### 1.2 ShiftRelay Code-Level Disabling Verification
To eliminate regulatory exposure, ShiftRelay’s production application configuration (`server.mjs`) strictly enforces disabled status across all financial balance-holding modules:

```javascript
// ShiftRelay Core Regulatory Ring-Fence Configuration (server.mjs)
export const REGULATORY_FEATURE_FLAGS = Object.freeze({
  ENABLE_IN_APP_STORED_WALLETS: false,    // STRICTLY DISABLED: Zero consumer cash balances held
  ENABLE_FRONTLINE_LENDING_LOANS: false,  // STRICTLY DISABLED: Zero credit advances or EWA loans
  ENABLE_DIRECT_NIBSS_SETTLEMENT: false,  // STRICTLY DISABLED: No direct automated bank clearing
  ALLOW_SHIFT_SCORES_FOR_CREDIT: false,   // STRICTLY PROHIBITED: Algorithmic underwriting barred
  PAYROLL_DISBURSEMENT_MODE: 'EXPORT_CSV' // AUTHORITATIVE: Outputs bank-ready schedules only
});
```

### 1.3 The Bank-Compliant MVP Payout Mechanism
1. **Calculation Only:** ShiftRelay functions exclusively as an **Authoritative Calculation and Verification Platform**.
2. **Zero Funds in Transit:** ShiftRelay never holds, debits, or handles client payroll capital.
3. **Client-Directed Execution:** On the monthly pay cut-off date (e.g., 25th of the month), the system compiles and exports a standardized payment batch (`ShiftRelay_Bank_Disbursement_Batch.csv`) formatted for direct manual upload into the client’s existing corporate banking portal (**Access Bank GAPS, Zenith Bank Corporate, or GTBank GeNS**).
4. **Direct Settlement:** Funds transfer directly from the employer's commercial bank account to the worker's personal commercial bank account.

---

## 2. Absolute Algorithmic Barrier: Scoring Prohibited from Credit Decisions

In strict accordance with the **Nigeria Data Protection Act (NDPA 2023)**, **FCCPC Digital Lending Guidelines**, and international consumer protection standards:

```
+-----------------------------------------------------------------------------------+
|               SHIFT SCORE REGULATORY ISOLATION & DATA ETHICS                      |
+-----------------------------------------------------------------------------------+
| 1. INTENDED USE (INTERNAL WORKFORCE OPERATIONS ONLY)                             |
| - Frontline attendance scores, check-in streaks, and reliability ratings are used |
|   exclusively for operational factory planning, safety rostering, and shift       |
|   handover integrity.                                                             |
+-----------------------------------------------------------------------------------+
| 2. ABSOLUTE EXCLUSION FROM THIRD-PARTY CREDIT PROFILING                          |
| - Shift scores SHALL NEVER be shared, monetized, leased, or transmitted to any    |
|   commercial bank, microfinance institution, digital lending fintech, or credit   |
|   bureau (e.g., CRC Credit Bureau, FirstCentral).                                 |
+-----------------------------------------------------------------------------------+
| 3. NO SECONDARY SCORING ASSESSMENTS WITHOUT INDEPENDENT LEGAL REVIEW             |
| - Any future exploration of Earned Wage Access (EWA) or credit scoring requires:  |
|   a) Formal written approval from the Nigeria Data Protection Commission (NDPC).  |
|   b) Partnership with a CBN-licensed financial institution.                       |
|   c) Explicit, unbundled, affirmative opt-in consent from the frontline employee. |
|   d) A comprehensive algorithmic fairness audit preventing predatory deductions.  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Pre-Launch Readiness Audit: Zero Unresolved Blockers

A comprehensive pre-launch audit was conducted across all four operational pillars to confirm full commercial launch authorization:

```
+------------------------------------------------------------------------------------------------------+
| GOVERNANCE DOMAIN   | STATUTORY / TECHNICAL REQUIREMENT           | STATUS     | VERIFIED AUDIT PROOF|
+------------------------------------------------------------------------------------------------------+
| 1. CORPORATE        | - Private Company Limited by Shares (Ltd)   | COMPLETED  | Form CAC 1.1 Status |
|    FORMATION        | - CAMA 2020 Minimum Issued Capital (₦10M)   |            | Report & Approved   |
|                     | - FIRS Stamp Duties Cleared (₦75,000)       |            | MEMART Documentation|
|                     | - Beneficial Ownership (PSC) Form Filed     |            |                     |
+------------------------------------------------------------------------------------------------------+
| 2. TAX & FISCAL     | - Corporate Tax Identification Number (TIN) | COMPLETED  | FIRS TaxPro-Max     |
|    REGISTRATION     | - Automated VAT 7.5% Invoicing Active       |            | Corporate Account   |
|                     | - Withholding Tax (WHT 5%) Ledger Configured|            | Integrated with     |
|                     | - PITA CRA & PenCom 18% Algorithms Checked  |            | Xero Billing Suite  |
+------------------------------------------------------------------------------------------------------+
| 3. DATA PRIVACY     | - Compliance with NDPA 2023 Principles     | COMPLETED  | Formal DPIA Filed;  |
|    & GOVERNANCE     | - 1.5-Second Transient GPS Snapshot Rule    |            | Usercentrics Cookie |
|                     | - Client-Side FIDO2 Biometrics (WebAuthn)   |            | Integration; NDPC   |
|                     | - 6-Year Tax Record Retention Lock Active   |            | DCMI Registration   |
+------------------------------------------------------------------------------------------------------+
| 4. COMMERCIAL       | - Master Services Agreement (MSA) Finalized | COMPLETED  | Enterprise Terms;   |
|    CONTRACTS        | - Software IP Assignment Executed (100% IP) |            | Permissive MIT/BSD  |
|                     | - Open-Source Audit Complete (Zero Copyleft)|            | Licensing Audit;    |
|                     | - Trademark Class 9 & Class 42 Cleared      |            | Formal Filing Auth  |
+------------------------------------------------------------------------------------------------------+
```

---

## 4. Formal Launch Authorization & Decision Gate

* **Decision Gate Finding:** **ALL STATUTORY, TECHNICAL, AND CONTRACTUAL CONDITIONS SATISFIED.**
* **Unresolved Launch Blockers:** **ZERO (0).**
* **Authorization Status:** **APPROVED FOR IMMEDIATE PILOT DEPLOYMENT & COMMERCIAL ENTERPRISE ONBOARDING.**

The legal boundaries safeguarding ShiftRelay Technologies Limited are fully locked. The engineering codebase, statutory deduction algorithms, and enterprise contracting terms represent a defensible, institutional-grade frontline operating system.

---
*ShiftRelay Technologies Limited — Final Legal Clearance & Launch Audit Specification.*
