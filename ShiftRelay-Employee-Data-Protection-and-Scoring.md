# ShiftRelay Employee Data Protection, Privacy Impact & Algorithmic Scoring Specification
## Phase: Legal & Governance | Milestone: NDPA 2023 Compliance, DPIA Assessment & NDPC Regulatory Registration

---

### Executive Objective
This comprehensive data protection specification formally documents ShiftRelay’s compliance posture under the **Nigeria Data Protection Act (NDPA 2023)** and oversight by the **Nigeria Data Protection Commission (NDPC)**. It maps four sensitive data flows (attendance, gate barcodes, payroll, and performance telemetry), establishes lawful processing grounds, worker privacy notices, subject access rights, retention and erasure schedules, cross-border hosting rules, and human-in-the-loop scoring challenge mechanisms. It concludes with an authoritative Data Protection Impact Assessment (DPIA) and confirms formal registration requirements with the NDPC.

---

## 1. Data Mapping Matrix under the Nigeria Data Protection Act (NDPA 2023)

ShiftRelay processes frontline workforce data strictly under principles of **Data Minimization, Purpose Limitation, and Integrity/Confidentiality** (Section 24, NDPA 2023):

```
+-------------------------------------------------------------------------------------------------------+
| DATA CATEGORY    | SPECIFIC DATA ELEMENTS             | LAWFUL BASIS (NDPA S.25) | SENSITIVITY LEVEL  |
+-------------------------------------------------------------------------------------------------------+
| 1. Attendance &  | Physical timestamp, gate muster ID,| Contractual Necessity    | Medium             |
|    Muster Scans  | camera reticle verification token, | (S.25(1)(b)) + Employer  | (Pseudonymized     |
|                  | ambient network beacon status      | Legal Duty (Labour Act)  | gate tokens)       |
+-------------------------------------------------------------------------------------------------------+
| 2. Geolocation   | 1.5-second transient point-in-time | Legitimate Interests     | High               |
|    Telemetry     | coordinates (latitude, longitude,  | (S.25(1)(d)) + Safety &  | (Transient only;   |
|                  | accuracy margin) for field staff   | Verification of Dispatch | discarded post-fix)|
+-------------------------------------------------------------------------------------------------------+
| 3. Payroll &     | Basic wage, overtime hours, bank   | Legal Obligation         | Very High          |
|    Remittance    | account numbers, RSA Pension PIN,  | (S.25(1)(c) - PITA/PRA)  | (Encrypted at rest |
|                  | Taxpayer ID (TIN), state residence | + Contract Performance   | with AES-256)      |
+-------------------------------------------------------------------------------------------------------+
| 4. Performance   | Check-in streaks, on-time score %, | Legitimate Interests     | High               |
|    & Reliability | completed handovers, peer shift    | (S.25(1)(d)) - Workforce | (Subject to human  |
|                  | swaps, supervisor endorsements     | Operational Optimization | audit review)      |
+-------------------------------------------------------------------------------------------------------+
```

---

## 2. Lawful Grounds, Worker Privacy Notices & Subject Access Rights

### 2.1 Lawful Grounds for Processing (Section 25, NDPA 2023)
* **Contractual Necessity (Section 25(1)(b)):** Processing of worker attendance, hours worked, and bank accounts is indispensable to execute the employment contract and disburse agreed wages.
* **Compliance with Legal Obligations (Section 25(1)(c)):** Collection of tax parameters, Consolidated Relief Allowance (CRA), and PenCom RSA PINs is strictly compelled by federal statutes (PITA and Pension Reform Act 2014).
* **Vital Interests & Safety (Section 25(1)(d)):** Shift handover relays and muster station presence verify frontline personnel safety during industrial emergency evacuations or plant fires.

### 2.2 Worker Transparency & Layered Privacy Notices
* **First-Touch Digital Disclosure:** When a worker activates their profile via `/activate?token=...`, the app displays a plain-English and Pidgin summary explaining:
  - *What we collect:* "We only record your gate check-in time and GPS during the 1.5s punch."
  - *What we NEVER do:* "ShiftRelay never tracks your location outside the gate, never listens to your microphone, and never sells your data."
* **Public Domain Tracking (Usercentrics Integration):** Public marketing portals (`shiftrelay.ng`) utilize **Usercentrics Consent Management Platform** to handle cookie compliance and provide transparent opt-in/opt-out mechanisms.

### 2.3 Worker Rights Enforcement Mechanisms (Sections 34–39, NDPA 2023)
* **Right of Access (Section 34):** Workers can view their complete attendance history, check-in timestamps, and itemized digital payslips in their personal **Me** dashboard at zero cost.
* **Right to Rectification (Section 35):** If a gate scanner fails or a worker is incorrectly marked late, they have an in-app **"Request Punch Correction"** workflow. Supervisors review CCTV or gate logs to approve changes, permanently stamping the audit ledger.
* **Right to Erasure & De-Identification (Section 36):** Upon termination of employment, non-statutory operational telemetry (check-in streaks, biometric login keys) can be erased or anonymized upon employee request.

---

## 3. Data Retention Limits, Cryptographic Erasure & Overseas Hosting

### 3.1 Strict Retention Schedules
* **Field Geolocation Fixes:** Discarded immediately after geofence radius evaluation. **Retention: 0 seconds.**
* **Daily Attendance Punch Logs:** Retained in active database for **24 months** to settle shift disputes and overtime reconciliations.
* **Statutory Tax & Pension Records (The 6-Year Rule):** Under federal tax laws (PITA / CITA), monthly payroll summary sheets, tax deduction certificates, and PenCom remittance schedules are archived securely for **six (6) years**, after which records undergo automated cryptographic shredding.

### 3.2 Overseas Cloud Hosting & Cross-Border Data Transfer (Sections 41–43, NDPA 2023)
* **Primary Hosting Infrastructure:** AWS African Availability Zones (Cape Town / local edge caching in Lagos).
* **Legal Ground for Cross-Border Transit (Section 43):**
  1. *Adequacy Assessment:* Data transfers are protected under enterprise **Standard Contractual Clauses (SCCs)** and Binding Corporate Rules with AWS, guaranteeing encryption standards exceeding NDPC benchmarks.
  2. *Data Encryption in Transit & Rest:* TLS 1.3 encryption during transmission; AES-256 hardware encryption at rest across all PostgreSQL database partitions.
  3. *Data Sovereignty Pledge:* All client employer tenant data is partitioned strictly by `organisation_id`, ensuring foreign entities or third-party tenants cannot access Nigerian worker databases.

---

## 4. Algorithmic Safeguards & Performance Score Challenge Rights

To prevent unfair, opaque, or discriminatory automated decisions (Section 37, NDPA 2023):

```
+-----------------------------------------------------------------------------------+
|                     HUMAN-IN-THE-LOOP SCORING GOVERNANCE                          |
+-----------------------------------------------------------------------------------+
| 1. NO AUTOMATED TERMINATION OR DOCKING                                            |
| - Algorithmic reliability metrics NEVER trigger automated wage cuts or dismissal.|
| - Only an authorized human HR manager can approve disciplinary actions.          |
+-----------------------------------------------------------------------------------+
| 2. EXPLICIT FORMULA TRANSPARENCY                                                  |
| - Reliability Index = (Verified Shifts Attended / Total Scheduled Shifts) * 100   |
| - Punctuality = Shifts within 5-Minute Grace Window / Attended Shifts             |
| - Workers can inspect every single punch contributing to their score.             |
+-----------------------------------------------------------------------------------+
| 3. PROTECTED STATUTORY LEAVE EXCLUSIONS                                           |
| - Certified medical sick leaves do NOT reduce reliability scores.                 |
| - Statutory maternity, paternity, and bereavement leaves are excluded.            |
+-----------------------------------------------------------------------------------+
| 4. MANDATORY 48-HOUR CHALLENGE SLA                                                |
| - Tapping "Dispute Score" alerts the Shift Supervisor to review within 48 hours.  |
+-----------------------------------------------------------------------------------+
```

---

## 5. Data Protection Impact Assessment (DPIA)

In compliance with **Section 28 of the NDPA 2023**, a formal risk assessment was conducted:

| Potential Privacy Risk | Inherent Risk Rating | Implemented Technical & Governance Safeguards | Residual Risk Rating |
|---|---|---|---|
| **Continuous Worker Surveillance via Mobile GPS** | **CRITICAL** | **1.5-Second Burst Protocol:** Continuous background GPS is technically impossible; coordinates poll for 1,500ms at punch time, evaluate locally, and immediately terminate. | **LOW** |
| **Biometric Template Leakage / Identity Theft** | **HIGH** | **FIDO2 / WebAuthn Client Isolation:** ShiftRelay never stores fingerprint or facial images on its servers. Biometric verification occurs purely inside the device's secure enclave (Android Keystore / Apple TEE). | **NEGLIGIBLE** |
| **Unauthorized Cross-Tenant Data Access** | **HIGH** | **Hard Database Scoping:** Strict multi-tenant isolation enforces `WHERE organisation_id = $1` on every database query, combined with tri-factor login (`company_id`). | **LOW** |
| **Statutory Tax & Salary Data Exposure** | **HIGH** | **Role-Based Access Control (RBAC):** Bank account numbers and gross wages are encrypted; frontline supervisors only view operational hours, not salary figures. | **LOW** |

---

## 6. Regulatory Confirmation: NDPC Registration Requirements

### Statutory Determination under NDPA 2023 (Section 5):
Under the Guidance Notices issued by the **Nigeria Data Protection Commission (NDPC)**, organizations processing personal data are categorized into:
1. *Data Controllers and Data Processors of Major Importance (DCMI)*
2. *Standard Data Controllers*

### Confirmation Status for ShiftRelay Technologies Limited:
* **Classification:** **Data Controller and Data Processor of Major Importance (DCMI) — Category B/C**.
* **Reason:** ShiftRelay operates a cloud platform that processes sensitive financial payroll and operational records for over 200 frontline workers across multiple enterprise employers.
* **Mandatory Statutory Actions Required:**
  1. **Formal Registration:** File official registration with the NDPC within six (6) months of commercial pilot launch.
  2. **Data Protection Officer (DPO):** Appoint an internal or external certified Data Protection Officer.
  3. **Annual Compliance Audit:** Conduct and file an annual **Data Protection Compliance Audit (DPA)** with the NDPC through an accredited Data Protection Compliance Organization (DPCO).

---
*ShiftRelay Technologies Limited — Data Protection & Privacy Governance Specification.*
