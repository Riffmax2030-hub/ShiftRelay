# ShiftRelay Statutory, Privacy & Lending Safeguards Specification
## Phase: Planning | Milestone: Legal Safeguards, NDPA Privacy Controls & Risk Ring-Fencing

---

### Executive Objective
This planning specification establishes formal legal and compliance review protocols for ShiftRelay under Nigerian statutory frameworks. It details five core review domains (statutory deductions, worker transparency notices, data access and subject rights under NDPA 2023, retention limits, and algorithmic fairness for shift scores), provides an explicit operational justification for excluding wallets and consumer lending from Version 1, and documents a structured registry of unresolved risks and mitigations.

---

## 1. Nigerian Legal & Statutory Payroll Review Questions

The following formal questionnaire directs our technical and legal advisory engagements with external Nigerian labor lawyers (NBA Section on Legal Practice) and chartered tax practitioners (CITN / ICAN):

### 1.1 Statutory Deductions & Overtime (PITA, PenCom, ECA, NHF)
1. **PITA Consolidated Relief Allowance (CRA) Compliance:** Does the automated payroll engine strictly reflect Section 33 of the Personal Income Tax Act (PITA) as amended by recent Finance Acts, correctly granting an annual relief of ₦200,000 or 1% of gross emoluments (whichever is higher) plus 20% of gross emoluments, before progressive tax brackets (7% to 24%) apply?
2. **PenCom 7-Day Remittance Window:** Under Section 11(3)(b) of the Pension Reform Act (PRA 2014), employers must remit both employee (8%) and employer (10%) pension contributions within 7 working days from the date salaries are paid. How should ShiftRelay’s automated reminder notifications and audit countdown timers account for Nigerian public holidays and bank non-clearing days to prevent the 2% monthly compounding penalty?
3. **Employees’ Compensation Act (NSITF 1%):** Under the ECA 2010, the 1% NSITF contribution is strictly an employer operating cost. How does the system ensure zero inadvertent deduction from net frontline wages while generating valid monthly schedules for corporate NSITF clearance certificates?
4. **National Housing Fund (NHF) Voluntary Status:** Under the Business Facilitation (Miscellaneous Provisions) Act 2023, NHF participation is optional/voluntary for private-sector employers and employees earning above national minimum wage. Does our tenant configuration engine provide compliant opt-in/opt-out switches with documented worker consent logs?
5. **Overtime Multipliers & Collective Bargaining Agreements (CBAs):** Under Section 13 of the Nigerian Labour Act (Cap L1, LFN 2004), normal hours are fixed by agreement or wages board. Where industrial unions (e.g., NUTMGTWW in textiles/manufacturing or NUPENG in petroleum) mandate premium overtime multipliers (1.25x weekday, 1.5x rest day, 2.0x public holiday), are these rule sets mathematically isolated by department without hardcoded global overrides?

### 1.2 Worker Notices & Transparency Obligations
1. **Written Terms of Employment (Labour Act Section 7):** Nigerian law mandates that employers give workers written statements of employment particulars within 3 months of resumption. Does ShiftRelay’s **Worker Profile & CV** view satisfy this disclosure requirement for shift workers who receive digital contracts?
2. **Itemized Payslip Disclosures:** Does the mobile payslip viewer clearly segregate Gross Pay, Base Salary, Shift Differential Allowances, Overtime Hours, Tax Deductions, and Pension Allocations, ensuring compliance with general labor transparency standards?
3. **Shift Alteration & Cancellation Notice Periods:** What minimum advance notice window is required under Nigerian common law and standard collective agreements before an employer can cancel or swap a scheduled shift without incurring full shift pay liability?

---

## 2. Privacy & Data Protection Safeguards (NDPA 2023 / NDPR)

ShiftRelay processes personal and locational data of Nigerian frontline employees. In accordance with the **Nigeria Data Protection Act (NDPA 2023)** and oversight by the **Nigeria Data Protection Commission (NDPC)**:

### 2.1 Lawful Basis for Processing
* **Contractual Necessity (NDPA Section 25(1)(b)):** Processing of worker names, employee reference IDs, bank accounts, and shift schedules is strictly necessary for executing the employment contract and calculating payroll.
* **Legal Obligation (NDPA Section 25(1)(c)):** Collection and processing of tax identification numbers (TIN) and Pension RSA PINs is mandated by federal tax and pension statutes.

### 2.2 Data Access, Rectification & Subject Rights
* **Role-Based Access Control (RBAC):** Frontline workers can view only their own records, shifts, and earnings. Shift Supervisors access operational attendance and shift handovers for their designated units only. Financial controllers and HR directors access consolidated payroll ledgers. ShiftRelay internal administrators have zero visibility into client salary numbers.
* **Right to Rectification (Section 34, NDPA 2023):** Workers have an in-app self-service right to dispute missing attendance punches or incorrect shift logs, triggering an auditable supervisor review workflow.
* **Right to Data Portability:** Workers can export their personal work history, verified check-in streaks, and digital payslips in standard PDF format upon contract separation.

### 2.3 Data Retention & Erasure Protocols
* **Active Workforce Records:** Retained throughout the duration of employment.
* **Tax & Audit Retention Limit (6-Year Rule):** Under federal tax laws (PITA / CITA), payroll calculation sheets, tax deduction certificates, and PenCom schedules must be retained for **six (6) years** from the date of creation, after which they enter automated cryptographic archiving.
* **Transient Geolocation Data (The 1.5-Second Snapshot Rule):** Point-in-time coordinates captured during field GPS punches are evaluated immediately against site geofences and then discarded; no historical latitude/longitude coordinate traces are stored permanently, preventing continuous worker surveillance.

### 2.4 Cookies & Digital Tracking (Usercentrics Integration)
* **PWA & Mobile Operations:** The ShiftRelay operational PWA uses strict, non-tracking, essential authentication cookies (`SameSite=Lax`, `HttpOnly`, `Secure`). No third-party behavioral advertising trackers are injected into frontline operational interfaces.
* **Public Web & Marketing Domains:** The public marketing portal (`shiftrelay.ng`) integrates **Usercentrics Consent Management Platform (CMP)** to provide transparent cookie consent banners complying with NDPA 2023 and global privacy standards.

---

## 3. Algorithmic Fairness & Shift Scoring Safeguards

To prevent algorithmic bias, discriminatory shift allocations, or arbitrary penalties against frontline staff:

```
+-----------------------------------------------------------------------------------+
|                        FAIR SHIFT SCORING SAFEGUARD MATRIX                        |
+-----------------------------------------------------------------------------------+
| 1. TRANSPARENT METRICS ONLY                                                       |
| - Score = (Verified Shifts Attended / Scheduled Shifts) * 100                     |
| - Punctuality = Shifts Started Within Grace Period (<= 5 Mins) / Attended Shifts  |
| - Itemized audit view showing every attendance factor visible to worker.          |
+-----------------------------------------------------------------------------------+
| 2. MANDATORY HUMAN-IN-THE-LOOP (NO AUTOMATED TERMINATION)                         |
| - Algorithmic scores NEVER trigger automatic pay deductions or job termination.   |
| - Low-score warnings automatically flag for human supervisor counseling.          |
+-----------------------------------------------------------------------------------+
| 3. PROTECTED STATUTORY LEAVE EXEMPTIONS                                           |
| - Approved sick leave (with doctor's fit note) does NOT lower reliability scores. |
| - Statutory maternity/paternity leaves are mathematically excluded from scoring.  |
| - Documented facility transit/gate queues trigger grace period exemptions.        |
+-----------------------------------------------------------------------------------+
| 4. MANDATORY RIGHT OF APPEAL                                                      |
| - Every score drop provides a 1-tap "Request Review" button with 48-hour SLA.     |
+-----------------------------------------------------------------------------------+
```

---

## 4. Exclusion of Digital Wallets & Lending from Version 1

### 4.1 Regulatory & Licensing Justification
Integrating in-app digital wallets, consumer cash balances, or Earned Wage Access (EWA) lending into the initial release introduces massive regulatory hurdles that would derail pilot execution:

| Fintech Capability | Required Regulatory License in Nigeria | Compliance & Capital Barrier | Decision for Version 1 |
|---|---|---|---|
| **In-App Stored Value Wallets** | Central Bank of Nigeria (CBN) **Mobile Money Operator (MMO)** or **PSSP License** | ₦100M – ₦2 Billion minimum capital requirement, rigorous CBN regulatory sandbox, mandatory reserve audits. | **EXCLUDED (Ring-fenced)** |
| **Earned Wage Access (EWA Loans)** | State Government **Money Lenders License** + FCCPC Digital Lending Registration | Usury laws, consumer credit disclosures, capital underwriting risks, default recovery liabilities. | **EXCLUDED (Ring-fenced)** |
| **Direct Core Banking Ledger** | Commercial / Microfinance Banking License | Deposit insurance (NDIC), mandatory reserves, balance-sheet capital risk. | **EXCLUDED (Ring-fenced)** |

### 4.2 The ShiftRelay MVP Payout Protocol (Zero Balance Holding)
Rather than holding worker balances or disbursing funds through internal software wallets:
1. ShiftRelay acts strictly as an **Authoritative Calculation & Verification Engine**.
2. Upon monthly payroll sign-off, ShiftRelay compiles and exports an immutable, bank-compliant batch disbursement schedule (in **Access Bank / GAPS / Zenith Bank CSV format**).
3. The client company's authorized finance officers upload the schedule directly into their existing corporate banking portal.
4. Salaries are paid directly from the employer’s commercial bank account into the employee’s commercial bank account.
5. **Result:** ShiftRelay holds **zero customer deposits**, carries **zero credit default risk**, and requires **no CBN banking/lending license** for Version 1.

---

## 5. Unresolved Risks & Active Mitigation Registry

The following technical, legal, and operational risks remain under active management as we proceed toward pilot deployment:

| Risk Identifier | Identified Risk Domain | Likelihood | Impact | Current Unresolved Status & Active Mitigation Strategy |
|---|---|---|---|---|
| **RSK-01** | **State IRS Multi-Jurisdictional Tax Variance** | High | Moderate | *Status:* Unresolved across interstate factory sites.  <br>*Issue:* Workers living in Ogun State but working in Lagos factories are subject to residency-based tax remittance rules under PITA Section 2.  <br>*Mitigation:* Enforce mandatory residential state collection during CSV intake and generate split Form H1 schedules by state of residence. |
| **RSK-02** | **Union Pushback on Digital Gate Check-in** | Moderate | High | *Status:* Active negotiation item.  <br>*Issue:* Plant shop stewards in older manufacturing sites may view digital Gate QR scans as excessive monitoring.  <br>*Mitigation:* Position system as an **overtime protector**: digital records prove every minute of extra shifts, preventing uncompensated manual muster clipping by floor managers. |
| **RSK-03** | **Biometric Device Compatibility Dispersion** | Moderate | Moderate | *Status:* Partially resolved via WebAuthn fallbacks.  <br>*Issue:* Older feature phones or budget Android devices (< Android 9) lack hardware biometric authenticators or WebAuthn support.  <br>*Mitigation:* Automatic graceful fallback to standard Tri-Factor PIN authentication on legacy hardware. |
| **RSK-04** | **National Minimum Wage Adjustment Volatility** | High | Low | *Status:* Monitored legislative item.  <br>*Issue:* Implementation of the new ₦70,000 national minimum wage benchmark and corresponding revisions to lower-tier tax relief thresholds.  <br>*Mitigation:* Dynamic cloud parameters in `server.mjs` allow instantaneous minimum wage threshold updates without code redeployment. |

---
*ShiftRelay Technologies Limited — Statutory, Privacy & Lending Safeguards Specification.*
