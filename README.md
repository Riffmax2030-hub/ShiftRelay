# ShiftRelay

> **Enterprise Workforce Continuity, Verified Attendance, Zero-Fee Earned Wage Access (EWA) & Nigeria Tax Act (NTA) 2025 Payroll OS**  
> Built by **Riffmax Technology Limited** (`shiftrelayos.com`)

ShiftRelay unifies **accountable shift handovers**, **tamper-resistant GPS + biometric/ID attendance**, **continuous real-time payroll accrual**, **CBN-compliant zero-fee Earned Wage Access**, and **Nigeria Tax Act (NTA) 2025 statutory compliance** into a single multi-tenant platform across Web, PWA, Android, and iOS.

---

## Core Application Engines

### 1. Nigeria Tax Act (NTA) 2025 & Labour Act Compliance Engine (`compliance-engine.mjs`)
- **Zero Legacy CRA / 1% Minimum Tax:** Fully implements the NTA 2025 reform (effective Jan 1, 2026) with progressive annual bands:
  - `₦0 – ₦800,000`: `0%`
  - `₦800,001 – ₦3,000,000`: `15%`
  - `₦3,000,001 – ₦12,000,000`: `18%`
  - `₦12,000,001 – ₦25,000,000`: `21%`
  - `₦25,000,001 – ₦50,000,000`: `23%`
  - Above `₦50,000,000`: `25%`
- **National Minimum Wage Exemption:** Employees earning `₦70,000/month` (`₦840,000/year`) or less are strictly exempt from PAYE (`₦0`).
- **Allowable Reliefs & Statutory Deductions:**
  - **Rent Relief:** `20%` of annual rent paid, capped at `₦500,000/year`, gated behind verified tenancy documentation (`rent_doc_verified`).
  - **PenCom (PRA 2014):** `8%` Employee + `10%` Employer on **Basic + Housing + Transport (BHT)**, with compliance warning if BHT `< 50%` of gross.
  - **NHF (`2.5%` of Basic)** with applicability toggle, **NHIS**, and **Life Assurance** pre-tax deductions.
  - **NSITF (`1%` monthly payroll)** & **ITF (`1%` for qualifying employers with `>= 5` staff or `>= ₦50M` annual turnover)** as employer-only obligations.
- **State of Residence IRS Mapping:** Maps each worker to their State Internal Revenue Service (`LIRS`, `FCT-IRS`, `RIRS`, etc.) and PFA (`pfa_name`, `pencom_rsa_pin`) for remittance exports (`?groupBy=state`, `?groupBy=pfa`).
- **Net-to-Gross Reverse Solver & Overtime Matrix:** Binary-search net-to-gross convergence (`< ₦0.01`), casual daily pay accumulator, and `1.5x` weekday / `2.0x` Sunday & Federal Public Holiday overtime rules.
- **Nigerian Labour Act Governance:** Automated **Section 7 Written Particulars** generator (`/api/hr/written-particulars`), statutory annual/maternity leave minimums (`6` working days / `12` weeks at `>=50%` pay), and tenure-based notice schedules (`1 day` to `1 month`).

### 2. Continuous Real-Time Payroll, EWA & Treasury Float Engine (`billing-treasury-engine.mjs`)
- **Strict Clock-In Accrual Guard:** Workers never accrue pay for unworked days (`0` clock-ins = `₦0.00` accrued). Withdrawable EWA unlocks strictly from **verified completed shifts** after prorated NTA 2025 PAYE, PenCom, and NHF deductions.
- **Safety Cap & CBN Zero-Lending Guardrails:** Enforces a configurable `50%–70%` (`60%` default) safety cap on accrued net pay, `0%` interest, `₦0` worker fee, and no rollover debt.
- **Concurrency & Idempotency:** `POST /api/wallet/ewa-disburse` uses a per-user in-flight lock (`EWA_CONCURRENT_LOCK`) and `Idempotency-Key` replay protection.
- **Month-End Reconciliation:** `compilePayrollRun` deducts `ewaAdvanceDeduction` cleanly from final net bank payout without altering gross taxable income or statutory remittances.
- **Dual Employer Funding Modes:** Supports **Prefunded Custody** (`payroll_net`, `paye`, `pencom`, `nhf`, `nsitf` float buckets) and **Employer-Authorized Direct Debit**.
- **Dayforce-Style Tiered PEPM Billing & Pilot Credit:** Supports tiered base + PEPM pricing, seasonal surge flexibility, and `₦250,000` sandbox pilot credit lifecycle.

### 3. Paystack NIP & Nigerian Multi-Bank Remittance Engine (`nigerian-banking.mjs`, `server.mjs`)
- **CBN 22-Bank Directory & NUBAN Resolution:** Modulo-10 NUBAN validation and live Paystack `/bank/resolve` lookup.
- **Paystack Transfer & Fail-Closed Webhook:** Supports `sk_test_...` and `sk_live_...` (`PAYSTACK_SECRET_KEY`) for NUBAN transfer recipients and payouts with graceful staging when approval is pending, plus HMAC-SHA512 `timingSafeEqual` verification on `POST /api/webhooks/paystack`.
- **Multi-Bank Bulk CSV Profiles:** Formula-injection-safe CSV exports for **Generic**, **GTBank GAPS**, **AccessPay**, **Zenith Corporate**, and **NIBSS e-BillsPay/NIP**.

### 4. Attendance Security, Biometrics & Exception Engine (`attendance-security.mjs`, `attendance-policy-engine.mjs`, `gps-guard.js`)
- **Strict Physical Presence:** Geofence perimeter verification, biometric/facial capture & peer/kiosk badge handover verification (`verify_strict_gps_and_card.mjs`), and anti-spoofing guards.
- **Attendance Exceptions & Auto-Clockout Watchdog:** Automated detection of missed clock-outs, late arrivals, early departures, and supervisor pardon/deduction resolution (`attendance-exceptions-ui.js`).

### 5. Shift Handover, AI Briefing & Shift Score Engine (`shift-score-engine.mjs`, `team-realtime.js`, `phase1-shell.js`)
- **AI-Structured Handovers:** Converts outgoing shift notes into prioritized action items, safety risks, and incoming acknowledgements (`Outgoing -> Supervisor -> Incoming`).
- **Shift Score & Anti-Reward Farming:** Deterministic `0–100` reliability scoring (`A–F` grades) and ShiftCoin merit rewards with strict lifetime/daily anti-farming caps (`test-anti-farming.mjs`).

### 6. Enterprise Report & Document Engine (`report-engine.mjs`)
- Generates corporate-letterhead **PDF**, editable **Word (`.docx`)**, **Excel (`.xlsx`)**, **CSV**, and **HTML print** outputs for Attendance Registers, Executive Statutory Payroll Ledgers, Worker Operational Dossiers, and Terms/SLA documents — all branded with the official ShiftRelay crest (`icon-192.png` / `icon.svg`).

### 7. Smart Waterfall Notifications & Email Engine (`email-engine.mjs`, `push-notifications.js`)
- **Smart Waterfall Messaging:** Routes operational alerts via WhatsApp first with Termii SMS fallback, plus Resend/SMTP transactional emails (activation, password reset, shift handovers, weekly executive progress digests).

### 8. Multi-Tenant Data, Admin OS & Security Architecture (`database.mjs`, `admin-auth.mjs`, `admin.html`)
- **PostgreSQL (Supabase) + Local Fallback:** Full multi-tenant relational schema (`organisations`, `memberships`, `worker_pay_ledgers`, `settlement_float_accounts`, `time_entries`, `attendance_exceptions`, `idempotency_keys`, `audit_events`) with resilient local store fallback for offline/dev runs.
- **ShiftRelay Admin OS (`admin.html`):** Sovereign RBAC console (`owner_root`, `admin_ops`, etc.) with TOTP 2FA/MFA, treasury float controls, onboarding agent, and rectification receipts.
- **Security Hardening:** `HttpOnly` / `Secure` / `SameSite` cookies, strict tenant isolation, CSP & HSTS headers, rate limiting, and zero hardcoded credentials in source control.

### 9. Native Mobile & Offline Resilience (`www/`, `android/`, `ios/`, `offline-queue.js`, `service-worker.js`)
- **Capacitor 8:** Native Android and iOS wrappers with Camera, Haptics, Local Notifications, Network status, Preferences, and offline punch/handover queuing.

---

## Quick Start (Local Development)

### Prerequisites
- Node.js `>= 18` (`20+` recommended)
- PostgreSQL / Supabase connection string (optional — falls back cleanly to local store if `DATABASE_URL` is omitted)

### Setup
```bash
npm install
cp .env.example .env
# Populate your private keys in .env (never commit .env!)
npm start
```

### Environment Variables (Configure in `.env` or Render)
| Variable | Purpose |
| :--- | :--- |
| `PORT` | HTTP port (default `4000`) |
| `DATABASE_URL` | PostgreSQL / Supabase connection string |
| `SESSION_SECRET` | Session & card-signing secret |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (`sk_test_...` or `sk_live_...`) |
| `RESEND_API_KEY` / `SMTP_*` | Transactional & digest email delivery |
| `OPENAI_API_KEY` / `GEMINI_API_KEY` | AI handover briefing & vision verification |
| `SHIFTRELAY_DEMO_MEMBER_PASS` | Optional override for local demo account seeding |

---

## Verification & Mobile Sync

```bash
# Run syntax & compliance/unit test suites
node test-compliance-engine.mjs
node test-dayforce-billing-treasury.mjs --unit
node test-anti-farming.mjs
node test-forms-and-emails.mjs
node test-nigeria-rollout.mjs --unit
node verify_strict_gps_and_card.mjs --unit

# Package web assets into www/ and sync Android & iOS Capacitor projects
npm run cap:sync
```

---

## Deployment Architecture
- **App Hosting:** Render (`server.mjs` Node web service, auto-deploying from `main`).
- **Database:** Supabase PostgreSQL (`DATABASE_URL`).
- **Payments & Transfers:** Paystack (`PAYSTACK_SECRET_KEY` + `/api/webhooks/paystack`).
