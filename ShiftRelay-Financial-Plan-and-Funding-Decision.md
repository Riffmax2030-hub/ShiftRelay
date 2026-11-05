# ShiftRelay Financial Plan & Funding Decision Model
## Phase: Planning | Milestone: Consolidated Financial Model, Breakeven Analysis & Capital Strategy

---

### Executive Summary & Funding Decision Gate
* **Funding Decision Outcome:** **PURSUE TARGETED PRE-SEED CAPITALIZATION (₦35,000,000 / ~$22,000 USD)**
* **Financial Model Purpose:** This consolidated financial plan combines our technical architecture, commercial pricing tiers, and field onboarding specs into an investor-grade financial model. It evaluates 12-month operational expenditure (OpEx), projects cash flows under **Cautious Demand** and **Stronger Demand** scenarios, determines the exact **breakeven threshold (3 enterprise employers)**, and establishes runway requirements.
* **Accounting Integration Standard:** Structured according to IFRS/NGAAP accounting principles, optimized for automated bookkeeping integration with modern enterprise tools like **Xero**.

---

## 1. Capital Position & Resource Inventory

### 1.1 Available Internal Capital & Founder Contributions
* **Founder Committed Cash Reserves:** ₦5,000,000
* **Pre-Committed Angel / Family & Friends Capital:** ₦10,000,000
* **Total Available Internal Capital:** **₦15,000,000**

### 1.2 Sweat Equity & Technical Development Resources
* **Full-Stack Engineering & Architecture:** In-house founder engineering (Vanilla JS PWA, Node.js backend, PostgreSQL database, WebAuthn biometrics, vector QR generator). Zero third-party dev agency costs incurred for MVP build.
* **Cloud & Development Credits:** Pre-qualified for AWS Activate / Cloud credits ($5,000 equivalent / ~₦8,000,000 non-cash cloud compute).
* **Advisory & Regulatory Support:** Pro-bono initial guidance from certified CIPM and CITN practitioners on Nigerian tax and pension algorithms.

---

## 2. 12-Month Operational Expenditure (OpEx) Budget

To calculate the exact breakeven requirement, operational expenses are segmented into fixed overhead and variable unit-level delivery costs:

```
+-----------------------------------------------------------------------------------+
|                        12-MONTH OPEX RUNWAY BUDGET (NAIRA)                        |
+-----------------------------------------------------------------------------------+
| EXPENSE CATEGORY                             | MONTHLY RUN-RATE | ANNUAL TOTAL (₦)|
+-----------------------------------------------------------------------------------+
| 1. Cloud Infrastructure & Database Hosting   | ₦250,000         | ₦3,000,000      |
|    (AWS African Local Zone, RDS PostgreSQL,  |                  |                 |
|     Automated Backups, SSL/TLS Encryption)   |                  |                 |
| 2. Communications, SMS Gateway & Auth Tokens | ₦100,000         | ₦1,200,000      |
|    (Twilio/Termii SMS OTP & Activation Links)|                  |                 |
| 3. Technical & Engineering Team Maintenance  | ₦1,200,000       | ₦14,400,000     |
|    (2 Full-Time Senior Software Engineers)   |                  |                 |
| 4. Enterprise Sales, Solutions & Field Setup | ₦800,000         | ₦9,600,000      |
|    (1 Field Implementation Lead + 1 B2B Rep) |                  |                 |
| 5. Regulatory, NDPR Compliance & Legal Audit | ₦250,000         | ₦3,000,000      |
|    (Annual NDPC Data Protection Audit, Legal |                  |                 |
|     Filings, CAC/FIRS Retainer)              |                  |                 |
| 6. Accounting, Billing & Bookkeeping (Xero)  | ₦50,000          | ₦600,000        |
|    (Xero Enterprise Accounting, VAT/WHT filing)|                |                 |
| 7. Administrative, Office & Field Mobility   | ₦300,000         | ₦3,600,000      |
|    (Travel between Apapa/Ikeja/Sagamu hubs)  |                  |                 |
| 8. Contingency Buffer (10%)                  | ₦295,000         | ₦3,540,000      |
+-----------------------------------------------------------------------------------+
| TOTAL ANNUAL OPERATING EXPENDITURE (OPEX)    | ₦3,245,000 / mo  | ₦38,940,000     |
+-----------------------------------------------------------------------------------+
```

---

## 3. Revenue Projections Under Two Demand Scenarios

Both scenarios assume our core commercial beachhead: **Enterprise Tier (₦400,000 Monthly Base + ₦4,500 PEPM)** with an average factory headcount of **200 frontline workers**, generating **₦1,300,000 MRR per client** and a **₦1,500,000 one-time onboarding fee**.

### 3.1 Scenario A: Cautious Demand (Slow Pilot Adoption)
*Assumes extended enterprise procurement cycles (3-month sales latency) and conservative conversion:*

* **Quarter 1:** 1 Client Pilot Onboarded (200 workers) → Revenue: ₦1.5M Setup + ₦3.9M Subs = **₦5,400,000**
* **Quarter 2:** 1 Additional Client (Total 2) → Revenue: ₦1.5M Setup + ₦7.8M Subs = **₦9,300,000**
* **Quarter 3:** 1 Additional Client (Total 3) → Revenue: ₦1.5M Setup + ₦11.7M Subs = **₦13,200,000**
* **Quarter 4:** 1 Additional Client (Total 4) → Revenue: ₦1.5M Setup + ₦15.6M Subs = **₦17,100,000**
* **Year 1 Total Revenue (Cautious):** **₦45,000,000**  
* **Annual Operating Expenses:** ₦38,940,000  
* **Year 1 Net Operating Profit (Cautious):** **+₦6,060,000 (13.5% Net Margin)**

---

### 3.2 Scenario B: Stronger Demand (Accelerated Industrial Corridor Adoption)
*Assumes rapid pilot expansion across the Apapa, Ikeja, and Sagamu industrial corridors driven by CIPM/MAN partner roadshows:*

* **Quarter 1:** 2 Client Plants Onboarded (400 workers) → Revenue: ₦3.0M Setup + ₦7.8M Subs = **₦10,800,000**
* **Quarter 2:** 3 Additional Plants (Total 5 / 1,000 workers) → Revenue: ₦4.5M Setup + ₦19.5M Subs = **₦24,000,000**
* **Quarter 3:** 4 Additional Plants (Total 9 / 1,800 workers) → Revenue: ₦6.0M Setup + ₦35.1M Subs = **₦41,100,000**
* **Quarter 4:** 5 Additional Plants (Total 14 / 2,800 workers) → Revenue: ₦7.5M Setup + ₦54.6M Subs = **₦62,100,000**
* **Year 1 Total Revenue (Stronger):** **₦138,000,000**  
* **Annual Operating Expenses (scaled for added field reps):** ₦48,500,000  
* **Year 1 Net Operating Profit (Stronger):** **+₦89,500,000 (64.8% Net Margin)**

---

## 4. Breakeven Analysis & Capacity Metrics

### 4.1 The Core Breakeven Equation
* **Fixed Monthly Overhead:** ₦3,245,000
* **Gross Contribution per Enterprise Client (200 Workers):**
  - Monthly Subscription Revenue: ₦1,300,000
  - Less Direct Servicing Cost (AWS, SMS, support allocation): ₦305,000
  - **Net Contribution Margin per Client:** **₦995,000 / month (76.5% Contribution Margin)**

$$\text{Breakeven Employers} = \frac{\text{Fixed Monthly Overhead}}{\text{Net Monthly Contribution per Client}} = \frac{₦3,245,000}{₦995,000} = 3.26 \text{ Clients}$$

### 4.2 The Breakeven Threshold
* **Exact Number of Employers Needed to Cover Ongoing Costs:** **3 to 4 Enterprise Plants (600–800 workers total)**.
* **Timeline to Breakeven:** Achieved in **Month 7** under Cautious Demand, and in **Month 4** under Stronger Demand.

---

## 5. Funding Gap & Capitalization Decision

### 5.1 Financial Gap Analysis
* **Total Annual Capital Needed (OpEx Runway):** ₦38,940,000
* **Committed Internal Funds (Founders & Angels):** (₦15,000,000)
* **Maximum Theoretical Pre-Revenue Capital Gap:** **₦23,940,000**

### 5.2 Capital Strategy & Funding Ask
To ensure a secure 12-month operational buffer without relying immediately on customer cash collections, ShiftRelay is raising a targeted **Pre-Seed Funding Round of ₦35,000,000 (~$22,000 USD)**:

```
+---------------------------------------------------------------------------------+
| SOURCES OF CAPITAL (YEAR 1)                                                     |
+---------------------------------------------------------------------------------+
| Founder & Existing Angel Equity:                                  ₦15,000,000   |
| Pre-Seed Capitalization Ask:                                      ₦35,000,000   |
+---------------------------------------------------------------------------------+
| TOTAL AVAILABLE CAPITAL POOL:                                     ₦50,000,000   |
+---------------------------------------------------------------------------------+
| ALLOCATION OF CAPITAL (₦50,000,000)                                             |
+---------------------------------------------------------------------------------+
| [38%] Engineering & Software Hardening (2 Senior Full-Time Devs): ₦19,000,000   |
| [26%] Field Deployment, Client Gate Setup & Account Reps:         ₦13,000,000   |
| [14%] Cloud Architecture, AWS High-Availability & Local Hosting:  ₦7,000,000    |
| [10%] Regulatory Certification (NDPC Audit, Legal Retainers):     ₦5,000,000    |
| [12%] Working Capital Reserve & Contingency Runway:               ₦6,000,000    |
+---------------------------------------------------------------------------------+
```

---

## 6. Financial Governance & Bookkeeping Controls (Xero Integration)

To maintain financial discipline, avoid tax leakage, and prepare for institutional Series A diligence:
* **Cloud Accounting Engine:** Direct integration with **Xero Enterprise** for automated tracking of client subscription invoicing, accounts receivable aging, and multi-currency reconciliations.
* **Statutory Withholding Tax (WHT) Tracking:** Nigerian B2B software invoices are subject to 5% WHT deductions. Xero automatically tracks WHT credit notes from enterprise clients to offset corporate income tax liabilities.
* **Monthly Financial Reviews:** Board-level review of Monthly Recurring Revenue (MRR), Customer Churn (targeted <0.5% monthly), Customer Acquisition Cost (CAC), and Cash Runway on the 5th of every calendar month.

---

## 7. Final Strategic Decision Gate: PROCEED

* **Decision:** **PROCEED WITH PRE-SEED CAPITALIZATION & PILOT LAUNCH**
* **Key Financial Drivers:**
  1. Exceptional unit economics: 76.5% monthly gross contribution margin.
  2. Low breakeven hurdle: Only 3 to 4 enterprise clients required to achieve operating profitability.
  3. Manageable capital requirement: ₦35M (~$22k USD) provides 12 months of runway to reach cash-flow independence.

---
*ShiftRelay Technologies Limited — Consolidated Financial Plan & Funding Decision Model.*
