# ShiftRelay MVP Architecture & Employer Setup Specification
## Milestone: System Workflow Mapping, Multi-Tenant Setup & Testable Resilience Standards

---

### Executive Objective
This document maps the technical workflows of ShiftRelay's initial production release (MVP) across seven core worker/supervisor interactions. It defines the enterprise tenant provisioning lifecycle (separate company accounts, zero public registration, multi-tier payroll sign-off, and SLA support tiers) and concludes with rigorous, testable acceptance criteria covering physical barcode scan fraud and zero-connectivity offline edge cases.

---

## 1. End-to-End Workflow Mapping: The 7 Core Operational Loops

```
[ 1. PROFILES & ACCESS ]
HR Bulk Intake → Secure SMS/WhatsApp Token → /activate Portal → Password + WebAuthn Biometrics Set
                                  ↓
[ 2. ROTATIONAL SCHEDULING ]
Supervisor Rosters 24/7 Shifts (Morning/Afternoon/Night) → Open Shift Pool → Peer Shift Swap Market
                                  ↓
[ 3. DUAL-MODE CLOCK-IN/OUT ]
Worker Arrives at Facility Gate → Scans Vector Gate QR (Zero-Battery) OR 1.5s GPS Burst Snapshot
                                  ↓
[ 4. AIR-GAPPED OFFLINE SYNC ]
Network Down? → Punches Queued in IndexedDB with Audit Timestamps → Auto-Flushes Upon Reconnection
                                  ↓
[ 5. PERFORMANCE & RELIABILITY ]
Shift Completed → Handover Relayed → On-Time Punctuality Score, Streak & Endorsements Updated
                                  ↓
[ 6. STATUTORY PAYROLL ENGINE ]
Cut-Off Trigger (25th of month) → PITA CRA, PenCom (18%), NSITF (1%), NHF (2.5%) Auto-Calculated
                                  ↓
[ 7. DIGITAL PAYSLIPS & DISBURSEMENT ]
Finance Desk Approves Vouchers → Digital Payslips Dispatched → GAPS/Access Bank Batch CSV Exported
```

### 1.1 Worker Profiles & Onboarding Lifecycle
* **Identity Ingestion:** HR imports worker roster (Full Name, Phone, Role, Shift Band, Salary Grade, PenCom RSA PIN) via standard CSV.
* **Closed-Loop Activation:** ShiftRelay generates a single-use cryptographically signed token: `https://app.shiftrelay.ng/activate?token=abc123xyz`.
* **Zero-Password Admin Exposure:** Neither HR nor ShiftRelay staff ever set worker passwords. The employee taps their activation link, enters their unique Company ID (`company_id`), sets their personal password, and binds their smartphone's native biometric hardware (Fingerprint / Face ID).

### 1.2 Rotational Shift Scheduling & Peer Swapping
* **Roster Builder:** Shift Supervisors configure rotational templates (e.g., 2 Morning, 2 Afternoon, 2 Night, 2 Off).
* **Peer Shift Swap Exchange:** 
  1. Worker A offers an upcoming Thursday night shift for swap.
  2. Qualified peer (Worker B) claims the shift.
  3. Supervisor receives an instant notification verifying rest-period compliance (minimum 24h rest per 7-day Labour Act Section 13 mandate) and approves with one tap.
  4. Both workers' rosters and attendance expectations update automatically.

### 1.3 Gate Barcode/QR Scanning & Clock-In/Out
* **Gate Vector Muster:** At factory gates, laminated high-contrast A4/A3 QR posters encode: `SHIFTRELAY:GATE:<company_id>:<site_hub>:<gate_id>:<hmac_signature>`.
* **Sub-Second Execution:** Worker points smartphone camera; scan verifies in <500 milliseconds. 
* **Zero Cellular Battery Drain:** Location is verified locally using the fixed site beacon; no active background GPS radio runs throughout the 8-hour shift.

### 1.4 Worker Performance & Reliability Scores
* **Dynamic Metric Matrix:** Every shift computes on-time arrival, handover completeness, and shift fulfillment.
* **Transparent Formula:** Reliability Score = `(Verified Shifts Attended / Scheduled Shifts) × 100`, adjusted for excused absences. 
* **Worker Rights Protection:** Scores always display an itemized breakdown. Algorithms cannot dock wages or trigger termination without formal supervisor review.

### 1.5 Monthly Payslips & Statutory Tax Deductions
* **Itemized Transparency:** Frontline employees access digital payslips directly in the **Earnings** tab showing:
  - Base Pay + Shift Differential Allowances + Overtime Hours
  - Less: Employee Pension (8% PRA 2014)
  - Less: Employee NHF (2.5% of Basic)
  - Less: PAYE Tax (Progressive 7%–24% post-Finance Act CRA deductions)
  - Employer Overhead (visible on audit ledger): Employer Pension (10%) + NSITF (1% ECA 2010).

---

## 2. Employer Setup Process & Administrative Governance

```
+-----------------------------------------------------------------------------------+
|                        ENTERPRISE TENANT SETUP LIFECYCLE                          |
+-----------------------------------------------------------------------------------+
| STEP 1: CONCIERGE PROVISIONING (/admin)                                           |
| - ShiftRelay internal team authenticates with Master Passcode.                    |
| - Creates new tenant entity (e.g., Flour Mills of Nigeria Plc).                   |
| - Issues permanent uppercase alphanumeric Tenant Code (e.g., FLO-NG-6093).        |
| - Configures physical site boundaries (Apapa Terminal Hub, 500m geofence radius). |
+-----------------------------------------------------------------------------------+
| STEP 2: SEPARATE COMPANY ACCOUNTS & DATA PARTITIONING                             |
| - Every database query and cache key is strictly scoped by `organisation_id`.     |
| - Company A cannot view, query, or leak records into Company B.                   |
| - Tri-factor login enforces: Company ID + Work Email + Password.                  |
+-----------------------------------------------------------------------------------+
| STEP 3: STATUTORY PAYROLL APPROVAL GATES                                          |
| - Level 1: Shift Supervisor validates daily attendance and missed-punch claims.   |
| - Level 2: Plant HR Manager reviews monthly overtime hours and shift allowances.  |
| - Level 3: Finance Desk clicks "Push to Finance" -> locks tamper-proof ledger,    |
|   generating GAPS/Access Bank disbursement CSV and PenCom/LIRS schedules.         |
+-----------------------------------------------------------------------------------+
| STEP 4: ONGOING SUPPORT SLA ARCHITECTURE                                          |
| - Tier 1 (Field): WhatsApp Business hotline for Shift Supervisors & Gate Security.|
| - Tier 2 (Payroll/Admin): Dedicated Customer Success Lead (2-hour ticket SLA).    |
| - Tier 3 (Legislative): Automatic cloud deployment of all Finance Act tax shifts. |
+-----------------------------------------------------------------------------------+
```

---

## 3. Testable Resilience Requirements & Edge-Case Guardrails

To ensure the platform survives real-world Nigerian manufacturing conditions, the MVP must pass these strict, verifiable test gates:

### Test Suite A: Scan Fraud & Proxy Punch Prevention (Buddy Clocking)
* **Requirement A1 (Ambient Cell Tower & GPS Distance Cross-Check):** If a worker attempts to scan a photograph or screenshot of the Gate QR poster sent over WhatsApp from home, the device's coarse cellular location is cross-checked against the plant coordinates.
  - *Pass Criteria:* Punch from >500m outside site boundary is blocked and flagged as `outside_geofence_flagged` on supervisor dashboard with an audible alert.
* **Requirement A2 (Dynamic Rotating Gate Tokens):** For turnstiles with tablet displays, the Gate QR token regenerates an HMAC signature every 60 seconds.
  - *Pass Criteria:* Scanning a QR code older than 60 seconds fails with `Token Expired. Please scan live gate screen.`
* **Requirement A3 (Simultaneous Device Lockout):** A worker's account cannot register two concurrent clock-ins on different hardware within a 4-hour window.
  - *Pass Criteria:* Second clock-in triggers security lockout and notifies shift supervisor.

### Test Suite B: Zero Connectivity & Air-Gapped Offline Resilience
* **Requirement B1 (Offline Punch Buffering):** When a worker scans the Gate QR or triggers a 1.5s GPS snapshot during a total plant internet blackout or in a basement cold-storage facility:
  - *Pass Criteria:* App displays amber banner: `[ ⏳ 1 Punch Queued Offline ]`. Punch data is cryptographically timestamped and saved in client `IndexedDB` storage. No error modal or data loss occurs.
* **Requirement B2 (Automatic Reconnection Flush & Anti-Replay):** When device reconnects to Wi-Fi or cellular network:
  - *Pass Criteria:* Service Worker automatically flushes buffered punches to `/api/time-entries/clock-in` with an `Idempotency-Key`. The backend records the original offline physical scan time, not the delayed sync time, preventing late-arrival penalties.
* **Requirement B3 (Multi-Day Cache Survivability):** If facility internet remains down for 48 hours:
  - *Pass Criteria:* Up to 500 queued offline punch records survive device reboots without corruption or data loss.

### Test Suite C: Statutory Payroll Mathematical Integrity
* **Requirement C1 (Finance Act CRA Exactness):** Input ₦250,000 gross monthly wage.
  - *Expected CRA Calculation:* Higher of (₦200,000/12 = ₦16,666.67) or (1% of Gross = ₦2,500) + 20% of Gross (₦50,000) = **₦66,666.67 total monthly tax relief**.
  - *Pass Criteria:* Automated engine calculates exactly ₦66,666.67 with zero rounding discrepancy.
* **Requirement C2 (PenCom 18% Statutory Split):** Input Basic (₦100,000) + Housing (₦50,000) + Transport (₦30,000) = ₦180,000 Emoluments.
  - *Employee Deduction (8%):* Exactly ₦14,400.
  - *Employer Contribution (10%):* Exactly ₦18,000.
  - *Total PenCom RSA Remittance:* Exactly ₦32,400.
  - *Pass Criteria:* 100% mathematical match across both worker payslip and employer statutory remittance schedule.

---
*ShiftRelay Technologies Limited — MVP System Architecture & Employer Setup Specification.*
