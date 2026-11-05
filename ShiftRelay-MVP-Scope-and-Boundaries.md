# ShiftRelay MVP Scope & Safe Boundaries Specification
## Milestone: MVP Definition, Privacy Governance & Risk Boundary Control

---

### Executive Objective
To define a lean, defensible, and legally compliant First Version (MVP) of ShiftRelay. This document establishes feature rankings grounded in customer interview evidence, delineates strict legal boundaries under Nigerian statutory and privacy laws (NDPA 2023 / PITA / PenCom), guarantees employee data correction rights, and explicitly ring-fences high-risk fintech capabilities (wallets and credit) outside the initial release.

---

## 1. Feature Ranking Matrix (Interview-Backed)

Based on primary field discovery (including the "dual-ledger" card-swipe + paper sign-in bottleneck) and operational analysis of Nigerian frontline facilities:

| Feature / Capability | Priority | Justification from Research | In/Out of First Version |
|---|---|---|---|
| **Gate QR & GPS Snapshot Attendance** | **P0 (Critical)** | Directly eliminates the card-swiping + paper duplicate sign-in identified in field interviews. Zero-battery footprint. | **IN (Core MVP)** |
| **PITA, PenCom, NSITF, NHF Payroll Engine** | **P0 (Critical)** | Solves the primary pain point of HR transcribing paper registers into Excel tax formulas. Removes penalty risks. | **IN (Core MVP)** |
| **Shift Handover Relay Protocol** | **P0 (Critical)** | Replaces disorganized WhatsApp operational updates with structured handover logs. | **IN (Core MVP)** |
| **Timesheet Dispute & Punch Correction** | **P0 (Critical)** | Direct answer to interview finding: missed swipes/sign-ins need a self-service correction and approval workflow. | **IN (Core MVP)** |
| **Executive Analytics & Remittance Ledger** | **P1 (High)** | Gives plant owners real-time headcount and statutory remittance countdowns. | **IN (Core MVP)** |
| **Peer Shift Swap Exchange** | **P1 (High)** | Reduces manager scheduling overhead by letting workers trade approved rotations. | **IN (Core MVP)** |
| **Device-Native Web Biometrics (WebAuthn)** | **P1 (High)** | Eliminates credential re-typing for frontline staff on Android/iOS devices. | **IN (Core MVP)** |
| **Employee In-App Digital Wallets** | **Excluded** | Requires Central Bank of Nigeria (CBN) Payment Service Solution Provider (PSSP) / Mobile Money Operator (MMO) licensing. Introduces high balance-holding liability. | **OUT (Post-Series A)** |
| **Earned Wage Access / Frontline Lending** | **Excluded** | Requires Money Lender licensing (State or FCCPC digital lending clearance), credit scoring risk, and bad debt exposure. | **OUT (Post-Series A)** |
| **Automated Bank Account Direct Debiting** | **Excluded** | High API integration overhead and NIBSS compliance burden. Replaced in MVP by standard bank-ready CSV payout files. | **OUT (Phase 2)** |

---

## 2. Nigerian Regulatory & Privacy Governance Framework

### 2.1 Nigeria Data Protection Act (NDPA 2023) Compliance
* **Data Minimization:** Attendance tracking collects only point-in-time timestamp, gate identifier, or a 1.5-second transient GPS coordinate. No background persistent tracking or continuous listening.
* **Lawful Basis for Processing:** Employment contract necessity (Section 25, NDPA 2023) and statutory compliance with the Labour Act (Section 7 written records obligation).
* **Storage Sovereignty:** Data stored on African/local cloud endpoints with TLS 1.3 in transit and AES-256 encryption at rest.
* **Cookie & Tracking Governance:** Using standard zero-invasive session storage (`SameSite=Lax`, `HttpOnly`). Integration with consent management tools (such as Usercentrics) for public marketing domains.

### 2.2 Statutory Labour & Tax Advisory Bounds
* **Pension Reform Act 2014:** Hardcoded 18% total pension split (8% employee + 10% employer) computed on Basic + Housing + Transport emoluments. Automatic alert generated 7 working days post-payday to prevent the 2% monthly compounding PenCom penalty.
* **Personal Income Tax Act (PITA) / Finance Act:** Consolidated Relief Allowance (CRA) computed automatically (higher of ₦200,000 or 1% of gross + 20% of gross). Progressive tax scale (7% to 24%) applied to taxable balance.
* **Employees' Compensation Act (ECA 2010):** 1% NSITF levy computed strictly as employer cost-to-company without net salary deductions.

---

## 3. Worker Rights, Transparency & Scoring Explanations

To ensure transparency and protect workers against arbitrary algorithmic penalties:

### 3.1 Reliability & Attendance Scoring Explanations
* Any worker performance indicator (e.g., Attendance Rate, Check-In Streak, On-Time Score) must be accompanied by an itemized breakdown.
* Workers can view exact factors affecting their metrics:
  - Total verified shifts attended
  - Excused vs. unexcused late arrivals
  - Manager-approved leave days (which never negatively impact scores)
* No automated algorithmic terminations: ShiftRelay does not automatically dock wages or revoke access without manual supervisor/HR review.

### 3.2 Right to Dispute & Punch Correction Workflow
1. **Missed Punch Detection:** If a worker forgets to scan at the gate or their battery dies, a flagged draft entry is created in their Timesheets view.
2. **One-Tap Dispute Submission:** Worker taps "Request Correction", inputs estimated arrival time, and selects a reason (e.g., "Gate queue", "Field transit", "Device off").
3. **Supervisor Verification:** Shift Supervisor receives an instant notification, cross-verifies with the physical site log or CCTV, and approves/rejects with audit notes.
4. **Audit Trail:** Approved adjustments are permanently stamped: `Corrected by Supervisor [Name] at [Timestamp]` on the final payroll sheet.

---

## 4. Test Scope for Pilot Launch (Safe Sandbox)

The MVP pilot test group will be contained within a safe, non-banking boundary:

### 4.1 Pilot Profile
* **Target:** 1 to 2 industrial pilot facilities (e.g., 50–200 workers).
* **Environment:** Parallel run (operating alongside existing card swipe/paper muster logs for 30 days).
* **Duration:** 4 weeks (one full monthly payroll cycle).

### 4.2 Test Acceptance Criteria
1. **Attendance Reliability:** >98% Gate QR scan success rate within <1.0 second per worker.
2. **Offline Buffer Integrity:** Zero lost punches during simulated 3-hour facility internet outage.
3. **Payroll Reconciliation:** 100% mathematical match between ShiftRelay automated tax/pension output and historical audited payroll spreadsheets.
4. **Correction Latency:** Worker missed-punch disputes resolved by supervisors in under 24 hours.
5. **Zero Financial Exposure:** Payroll output provided as an exportable bank-ready CSV (GAPS/Access Bank format) for final manual authorization by client's authorized signatories. Zero handling of client deposits, wallets, or credit loans.

---
*ShiftRelay Technologies Limited — MVP Scope & Safe Boundaries Specification.*
