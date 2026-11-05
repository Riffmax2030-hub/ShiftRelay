# SHIFT RELAY UI/UX & ENTERPRISE ARCHITECTURAL RULES (2026 EDITION)

## 1. Core Design Preservation Mandate (Non-Negotiable)
- **Never Overwrite or Strip the 6-Tab Shell**: Preserve `phase1-shell.js` (12,955+ lines) and `phase1-shell.css` (9,325+ lines) with all 6 primary tabs (`Today`, `Schedule`, `Earnings`, `Chat`, `Profile`, `Settings`) and their dual sub-pages (`Schedule` / `Attendance` / `Leave`, and `Earnings` / `Rewards`).
- **Today Tab & Biometric Water-Fill Clock**: Always keep the circular reactive water-fill clock button (`#sr-btn-water-clock` and `#sr-sup-water-clock`) with the **Dark Green Biometric Fingerprint + Keyhole Lock** icon and the 1-line star activity strip (`#sr-today-star-strip`).
- **Profile (`Me`) Page Signature Layout**:
  - High-tech cover photo banner (`.sr-me-cover-photo`) with top-right **Edit Pen symbol only** (`#sr-btn-edit-cv-modal`).
  - Overlapping clickable avatar with WhatsApp-style online dot.
  - **Verified Blue Tick Badge** (`#1D9BF0`, `.sr-verified-badge`) next to the user's name.
  - **No "Active Member" text or green pointer** in the role/employer metadata row.
  - Redesigned **Summary** (inline tap-to-edit), **Experience** (timeline), **Education** (timeline), **Certifications** (editable card grid), and **Skills** (interactive pills with typeahead search).
- **Concise Copy Across All Screens**: Avoid wordy explanations or verbose paragraphs. Keep section headers to 1–2 words (`Summary`, `Experience`, `Education`, `Certifications`, `Skills`, `Help`, `Chat`) and use concise action buttons.

## 2. Dark Green Brand Identity (`SHIFTRELAY`)
- **Primary Brand Mark (`icon.svg` & `assets/logos/logo-brand-motion.svg`)**:
  - Deep Dark Forest Green squircle (`#07291E` to `#02100C`) with emerald border (`#1AD079`).
  - Luminous mint-emerald Biometric Fingerprint swirl with lower-right circular Keyhole Lock badge.
  - Geometric `SHIFTRELAY` wordmark: `SHIFT` in emerald green (`#1AD079`), `RELAY` in crisp mint-white (`#ECFDF5`) featuring the 3-horizontal-bar `E` with an emerald middle bar and interlocked `AY`.

## 3. Enterprise HCM & Nigerian Statutory Framework
- **Supervisor Geofence & Gate Overrides**: `POST /api/supervisor/override` with SHA-256 cryptographic audit hash.
- **Live SSE Perimeter Breach Stream**: `GET /api/events/perimeter-breaches` & `POST /api/admin/breach-trigger` for industrial zones (Ikeja, Apapa, Lekki, Kano).
- **Statutory Nigerian Payroll Ledger**: `GET /api/payroll/ledger` computing Finance Act CRA PAYE tax, 8% Employee / 10% Employer PenCom Pension, 2.5% NHF, 1% NSITF, and Net Take-Home Pay in `₦`.
- **Paystack & Mono Instant Settlement**: `POST /api/settlements/paystack-transfer` & `POST /api/settlements/mono-lookup` for instant ShiftCoin / Earned Wage Access disbursements.
- **NDPA 2023 & NITDA Biometric Compliance**: `POST /api/compliance/biometric-consent` & `GET /api/compliance/audit-voucher`.
