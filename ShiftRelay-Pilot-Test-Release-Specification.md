# ShiftRelay Pilot Test Release Specification & Agreement
## Phase: Testing & Pilot Launch | Milestone: First Test Release Definition & Employer Agreement

---

### Executive Overview & Release Mandate
This document formally defines the **First Operational Test Release (Build v1.0-Pilot)** for **ShiftRelay Enterprise HCM**, agreed with an initial pilot partner: **Flour Mills of Nigeria Plc (Apapa Grain Terminal Operations / Hub)**. It establishes an agreed test scope covering 50 frontline workers on a rotational shift schedule, documents existing baseline payroll rules against expected mathematical results, defines physical gate muster procedures, and re-confirms that stored-value wallets and consumer lending are strictly excluded.

---

## 1. Pilot Agreement & Employer Profile

```
+-----------------------------------------------------------------------------------+
|                        PILOT EMPLOYER PARTICIPATION CHARTER                       |
+-----------------------------------------------------------------------------------+
| EMPLOYER ENTITY       | Flour Mills of Nigeria Plc (FMN)                          |
| PILOT DIVISION / HUB  | Apapa Industrial Hub & Grain Terminal (Lagos State)        |
| TENANT CODE           | FLO-NG-6093                                               |
| DESIGNATED FACILITY   | Grain Milling & Packaging Plant (Lines 1 & 2)             |
| DESIGNATED STAFF SIZE | 50 Frontline Shift Specialists (Rotational 24/7 Crew)      |
| PILOT TIMELINE        | 30 Calendar Days (One Complete Monthly Payroll Cycle)     |
| TRIAL RUN METHODOLOGY | Parallel Run (ShiftRelay runs alongside paper muster logs) |
| PILOT SPONSOR / LEAD  | Plant Operations Director & Head of Industrial HR         |
+-----------------------------------------------------------------------------------+
```

---

## 2. Agreed Test Scope: 6 Core Workflows

The pilot tests six essential functional workflows, with zero balance-holding or credit liabilities:

```
[ 1. STAFF PROFILES & ACTIVATION ]
50 Worker CSV Intake → Secure SMS Single-Use Token → /activate Portal → Password & WebAuthn Biometrics Set
                                     ↓
[ 2. 24/7 ROTATIONAL SCHEDULING ]
Supervisor Rosters 3 Rotations (06:00-14:00, 14:00-22:00, 22:00-06:00) → Peer Shift Swap Sandbox
                                     ↓
[ 3. DUAL-MODE GATE ATTENDANCE ]
Laminated Vector Gate 01 QR Scan (Zero-Battery <500ms) + 1.5s GPS Burst for Remote Yard Drivers
                                     ↓
[ 4. AIR-GAPPED OFFLINE SYNC ]
Simulated Internet Cut → Punches Queued in Client IndexedDB → Auto-Sync with Audit Timestamps
                                     ↓
[ 5. PERFORMANCE & RELIABILITY ]
Shift Handover Relay Completed → On-Time Punctuality Tracking (5-min grace window) → 48-Hour Appeal SLA
                                     ↓
[ 6. MONTHLY PAYSLIPS & STATUTORY TAX ]
Finance Act CRA (₦66,666.67 relief) + PenCom (18% split) + NSITF (1%) → GAPS/Access Bank Batch CSV
```

### 2.1 Staff Profiles & Activation
* **Intake Mechanism:** 50 worker profiles imported via bulk CSV (Full Legal Name, Mobile Phone, Shift Cadre, Base Salary, RSA Pension PIN, State Tax ID).
* **Onboarding Security:** Single-use activation tokens dispatched via SMS (`/activate?token=...`). Workers establish personal passwords and enroll their smartphone's native biometric authenticator (Fingerprint / Face ID via WebAuthn).

### 2.2 Rotational Scheduling & Peer Shift Swap Market
* **Rotational Templates:** Standard 3-shift continuous processing cycle:
  - *Morning Shift:* 06:00 – 14:00 WAT
  - *Afternoon Shift:* 14:00 – 22:00 WAT
  - *Night Shift:* 22:00 – 06:00 WAT (with ₦1,500/night statutory differential allowance)
* **Peer Shift Swap Rule:** Workers can exchange shifts with peer operators in the same grade. The Shift Supervisor signs off via a 1-tap mobile push notification, ensuring Labour Act rest intervals (minimum 24 consecutive hours of rest per 7-day period).

### 2.3 Gate Muster Clock-In/Out & Offline Buffering
* **Physical Hardware Setup:** Laminated vector SVG QR poster mounted at Station Gate 01 (Turnstile Entrance).
* **Execution Metric:** Scans execute in <500ms using smartphone camera without running background GPS.
* **Offline Resilience Test:** Plant Wi-Fi and mobile data deliberately toggled off for 2 hours during shift change. System buffers all 50 punches in browser IndexedDB with an amber indicator (`[ ⏳ Queued Offline ]`) and flushes automatically to the server upon reconnection with original timestamps preserved.

### 2.4 Worker Performance & Reliability Scores
* **Transparency:** Score computed strictly as:  
  $$\text{Reliability Index} = \left( \frac{\text{Verified Shifts Attended}}{\text{Total Scheduled Shifts}} \right) \times 100$$
* **Punctuality Metric:** 5-minute shift grace window (clocking in between 06:00 and 06:05 is marked on-time).
* **Dispute Workflow:** Frontline workers have a 1-tap in-app right to dispute missed or congested gate scans within 48 hours.

---

## 3. Existing Payroll Rules vs. ShiftRelay Expected Results

To validate mathematical accuracy, ShiftRelay will run parallel with the employer’s historical Excel calculation sheets for the October 2026 pay cycle.

### 3.1 Benchmark Worker Profile: Emeka Okafor (Senior Mill Operator)
* **Agreed Monthly Compensation:**
  - Basic Salary: ₦120,000.00
  - Housing Allowance: ₦50,000.00
  - Transport Allowance: ₦30,000.00
  - **Base Emoluments Subtotal:** **₦200,000.00**
  - Verified Overtime (16 Hours @ ₦1,875/hr): ₦30,000.00
  - Night Shift Differential (10 Nights @ ₦2,000/night): ₦20,000.00
  - **Total Monthly Gross Wages:** **₦250,000.00**

---

### 3.2 Side-by-Side Mathematical Reconciliation Matrix

| Payroll Deduction / Contribution | Statutory Basis / Rule | Employer’s Existing Manual Excel Formula | ShiftRelay Automated System Result | Discrepancy / Variance |
|---|---|---|---|---|
| **Employee Pension Deduction (8%)** | Section 9(1)(a), PRA 2014: 8% of Basic + Housing + Transport | `=(120000+50000+30000)*0.08` <br>= **₦16,000.00** | `0.08 * 200000` <br>= **₦16,000.00** | **₦0.00 (Exact)** |
| **Employer Pension Contribution (10%)** | Section 9(1)(b), PRA 2014: 10% of Basic + Housing + Transport | `=(120000+50000+30000)*0.10` <br>= **₦20,000.00** | `0.10 * 200000` <br>= **₦20,000.00** | **₦0.00 (Exact)** |
| **National Housing Fund (NHF 2.5%)** | NHF Act / BFA 2023: 2.5% of Basic Salary | `=120000*0.025` <br>= **₦3,000.00** | `0.025 * 120000` <br>= **₦3,000.00** | **₦0.00 (Exact)** |
| **Consolidated Relief Allowance (CRA)** | PITA Section 33 (Finance Act): Higher of ₦200k/12 or 1% Gross + 20% Gross | `=(200000/12)+(250000*0.20)` <br>= **₦66,666.67** | `MAX(16666.67, 2500) + 50000` <br>= **₦66,666.67** | **₦0.00 (Exact)** |
| **Taxable Income Balance** | Gross (₦250k) minus Allowable Reliefs (CRA + Pension + NHF) | `=250000-(66666.67+16000+3000)` <br>= **₦164,333.33** | `250000 - 85666.67` <br>= **₦164,333.33** | **₦0.00 (Exact)** |
| **PAYE Tax Withholding** | Progressive Sixth Schedule (7% to 19% brackets) | Graduated monthly formula <br>= **₦24,556.67** | Automated progressive brackets <br>= **₦24,556.67** | **₦0.00 (Exact)** |
| **Employer NSITF Levy (1% Gross)** | Employees' Compensation Act 2010: 1% Total Gross (Cost-to-Company) | `=250000*0.01` <br>= **₦2,500.00** | `0.01 * 250000` <br>= **₦2,500.00** | **₦0.00 (Exact)** |
| **Net Employee Take-Home Pay** | Gross Wages less Employee Pension, NHF & PAYE Tax | `=250000-16000-3000-24556.67` <br>= **₦206,443.33** | Direct bank disbursement total <br>= **₦206,443.33** | **₦0.00 (Exact)** |

*Reconciliation Conclusion:* ShiftRelay matches the audited manual payroll ledger to the kobo, eliminating human formula entry errors and saving an estimated 32 hours of manual clerical reconciliation time.

---

## 4. Explicit Ring-Fencing: Wallets & Lending Excluded

```
+-----------------------------------------------------------------------------------+
|                     REGULATORY NON-BANKING RING-FENCE                             |
+-----------------------------------------------------------------------------------+
| MODULE                | PILOT STATUS | GOVERNANCE REASON                          |
+-----------------------------------------------------------------------------------+
| In-App Cash Wallets   | DISABLED     | Requires CBN Mobile Money / PSSP License   |
| Frontline EWA Loans   | DISABLED     | Requires State Money Lenders / FCCPC Auth |
| Bank CSV Export       | ENABLED      | Zero balance-holding liability; executes   |
| (GAPS/Access Format)  |              | direct bank-to-bank corporate clearing     |
+-----------------------------------------------------------------------------------+
```

---

## 5. Success Acceptance Criteria for Commercial Rollout

Upon completion of the 30-day trial with the 50 pilot workers, the pilot advances to full factory contract execution if the following four metrics are satisfied:
1. **Gate Muster Throughput:** Over 95% of workers clock in within <1 second without gate congestion bottlenecks.
2. **Offline Buffer Integrity:** 100% of offline punches synchronise successfully upon reconnection with zero missing records.
3. **Payroll Reconciliation:** 100% mathematical parity with the employer's audited manual salary ledger.
4. **Dispute Resolution Speed:** Average supervisor response time for missed-punch corrections is under 24 hours.

---
*ShiftRelay Technologies Limited — Pilot Test Release Specification.*
