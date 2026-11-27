/**
 * ShiftRelay 2026 Nigerian Tax, Labour & Data Rights Guide
 * - Plain English + authentic Nigerian Pidgin instant toggle
 * - Live personalised Tax & Rent Relief Snapshot from logged-in user's ShiftRelay statement
 * - Direct 1-tap 'Claim Rent Relief' deep action
 * - Role-aware Executive Employer Remittance & Audit Deadlines banner
 * - Zero Unicode emojis — precision Lucide geometric SVGs only
 */
(function () {
  'use strict';

  const STYLE_ID = 'sr-law-guide-styles';
  const MODAL_ID = 'sr-law-guide-modal';

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtNgn(val) {
    const n = Math.round(Number(val || 0));
    return '₦' + n.toLocaleString('en-NG');
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes srLgBackdropIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes srLgSheetUp {
        from { opacity: 0; transform: translateY(22px) scale(0.985); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }

      .sr-lg-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2147482500;
        background: rgba(2, 12, 20, 0.72);
        backdrop-filter: blur(12px) saturate(160%);
        -webkit-backdrop-filter: blur(12px) saturate(160%);
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 0;
        animation: srLgBackdropIn 0.18s ease both;
      }
      @media (min-width: 768px) {
        .sr-lg-backdrop {
          align-items: center;
          padding: 20px;
        }
      }

      .sr-lg-sheet {
        width: 100%;
        max-width: 680px;
        max-height: 92dvh;
        background: #ffffff;
        color: #0f172a;
        border-radius: 24px 24px 0 0;
        border: 1px solid rgba(15, 23, 42, 0.09);
        box-shadow: 0 28px 70px rgba(0, 0, 0, 0.35);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: srLgSheetUp 0.24s cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      @media (min-width: 768px) {
        .sr-lg-sheet {
          border-radius: 24px;
          max-height: 86dvh;
        }
      }
      [data-theme="dark"] .sr-lg-sheet {
        background: #0d1622;
        color: #f1f5f9;
        border-color: rgba(148, 163, 184, 0.18);
        box-shadow: 0 32px 80px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.06);
      }

      .sr-lg-handle-wrap {
        display: flex;
        justify-content: center;
        padding: 9px 0 2px;
      }
      .sr-lg-handle {
        width: 38px;
        height: 4px;
        border-radius: 99px;
        background: rgba(148, 163, 184, 0.4);
      }
      @media (min-width: 768px) {
        .sr-lg-handle-wrap { display: none; }
      }

      .sr-lg-head {
        display: flex;
        flex-direction: column;
        gap: 9px;
        padding: 10px 16px 10px;
        border-bottom: 1px solid rgba(15, 23, 42, 0.07);
        flex-shrink: 0;
      }
      .sr-lg-head-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      [data-theme="dark"] .sr-lg-head { border-bottom-color: rgba(148, 163, 184, 0.13); }

      .sr-lg-head-left {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .sr-lg-emblem {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        background: linear-gradient(145deg, #10b981 0%, #059669 100%);
        color: #ffffff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 6px 16px -4px rgba(5, 150, 105, 0.45);
      }
      .sr-lg-title {
        margin: 0;
        font-size: 15.5px;
        font-weight: 800;
        letter-spacing: -0.02em;
        line-height: 1.2;
      }
      .sr-lg-sub {
        margin: 2px 0 0;
        font-size: 11.5px;
        color: #64748b;
      }
      [data-theme="dark"] .sr-lg-sub { color: #94a3b8; }

      .sr-lg-head-right {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .sr-lg-lang-switch {
        display: inline-flex;
        padding: 2px;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.06);
        border: 1px solid rgba(15, 23, 42, 0.08);
      }
      [data-theme="dark"] .sr-lg-lang-switch {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(148, 163, 184, 0.16);
      }
      .sr-lg-lang-btn {
        height: 26px !important;
        min-height: 26px !important;
        padding: 0 10px !important;
        border-radius: 999px !important;
        border: none;
        background: transparent;
        color: #64748b;
        font-size: 11px !important;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      [data-theme="dark"] .sr-lg-lang-btn { color: #94a3b8; }
      .sr-lg-lang-btn.is-active {
        background: #059669;
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(5, 150, 105, 0.35);
      }
      .sr-lg-close {
        width: 32px !important;
        height: 32px !important;
        min-width: 32px !important;
        min-height: 32px !important;
        padding: 0 !important;
        border-radius: 50% !important;
        border: 1px solid rgba(15, 23, 42, 0.1);
        background: rgba(15, 23, 42, 0.04);
        color: inherit;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      [data-theme="dark"] .sr-lg-close {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(148, 163, 184, 0.16);
      }

      /* Pill Category Tabs */
      .sr-lg-tabs {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 16px;
        overflow-x: auto;
        scrollbar-width: none;
        border-bottom: 1px solid rgba(15, 23, 42, 0.06);
        flex-shrink: 0;
      }
      .sr-lg-tabs::-webkit-scrollbar { display: none; }
      [data-theme="dark"] .sr-lg-tabs { border-bottom-color: rgba(148, 163, 184, 0.12); }

      .sr-lg-tab {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 32px !important;
        min-height: 32px !important;
        padding: 0 12px !important;
        border-radius: 999px !important;
        border: 1px solid rgba(15, 23, 42, 0.09);
        background: rgba(15, 23, 42, 0.03);
        color: #475569;
        font-size: 11.5px !important;
        font-weight: 700;
        white-space: nowrap;
        cursor: pointer;
        flex-shrink: 0;
        transition: all 0.16s ease;
      }
      [data-theme="dark"] .sr-lg-tab {
        background: rgba(255, 255, 255, 0.045);
        border-color: rgba(148, 163, 184, 0.16);
        color: #94a3b8;
      }
      .sr-lg-tab.is-active {
        background: #0f172a;
        border-color: #0f172a;
        color: #ffffff;
      }
      [data-theme="dark"] .sr-lg-tab.is-active {
        background: rgba(16, 185, 129, 0.2);
        border-color: rgba(52, 211, 153, 0.45);
        color: #6ee7b7;
      }

      /* Scrollable Body */
      .sr-lg-body {
        flex: 1;
        overflow-y: auto;
        padding: 14px 16px 18px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        -webkit-overflow-scrolling: touch;
      }

      /* Live Snapshot Card */
      .sr-lg-snapshot {
        border-radius: 16px;
        padding: 13px 14px;
        background: linear-gradient(145deg, #0b1f2c 0%, #093c36 65%, #065f46 100%);
        color: #f8fafc;
        border: 1px solid rgba(52, 211, 153, 0.3);
        box-shadow: 0 10px 26px -10px rgba(4, 27, 20, 0.45);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .sr-lg-snap-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .sr-lg-snap-eyebrow {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: #6ee7b7;
      }
      .sr-lg-snap-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }
      .sr-lg-snap-stat {
        padding: 8px 9px;
        border-radius: 11px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.11);
      }
      .sr-lg-snap-stat small {
        display: block;
        font-size: 10px;
        color: #cbd5e1;
        margin-bottom: 2px;
      }
      .sr-lg-snap-stat strong {
        font-size: 12.5px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        color: #ffffff;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sr-lg-snap-tip {
        font-size: 12px;
        line-height: 1.45;
        color: #e2e8f0;
        margin: 0;
      }
      .sr-lg-snap-cta {
        align-self: flex-start;
        height: 32px !important;
        min-height: 32px !important;
        padding: 0 13px !important;
        border-radius: 999px !important;
        border: none;
        background: #10b981;
        color: #032219;
        font-size: 11.5px !important;
        font-weight: 800;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
      }

      /* Employer Checklist Banner */
      .sr-lg-exec-banner {
        border-radius: 14px;
        padding: 12px 13px;
        background: rgba(2, 132, 199, 0.08);
        border: 1px solid rgba(2, 132, 199, 0.25);
        font-size: 12px;
        line-height: 1.48;
      }
      [data-theme="dark"] .sr-lg-exec-banner {
        background: rgba(56, 189, 248, 0.1);
        border-color: rgba(56, 189, 248, 0.26);
      }
      .sr-lg-exec-title {
        font-size: 11.5px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #0284c7;
        margin-bottom: 5px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      [data-theme="dark"] .sr-lg-exec-title { color: #38bdf8; }

      /* Law Cards */
      .sr-lg-card {
        border-radius: 16px;
        padding: 13px 14px;
        background: #f8fafc;
        border: 1px solid rgba(15, 23, 42, 0.08);
      }
      [data-theme="dark"] .sr-lg-card {
        background: rgba(255, 255, 255, 0.04);
        border-color: rgba(148, 163, 184, 0.14);
      }
      .sr-lg-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 6px;
        flex-wrap: wrap;
      }
      .sr-lg-card-title {
        margin: 0;
        font-size: 13.5px;
        font-weight: 800;
        letter-spacing: -0.01em;
      }
      .sr-lg-pill {
        font-size: 10px;
        font-weight: 800;
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(16, 185, 129, 0.14);
        color: #047857;
      }
      [data-theme="dark"] .sr-lg-pill { color: #6ee7b7; background: rgba(16, 185, 129, 0.2); }
      .sr-lg-pill.is-amber { background: rgba(245, 158, 11, 0.15); color: #b45309; }
      [data-theme="dark"] .sr-lg-pill.is-amber { color: #fcd34d; }
      .sr-lg-pill.is-blue { background: rgba(2, 132, 199, 0.14); color: #0369a1; }
      [data-theme="dark"] .sr-lg-pill.is-blue { color: #7dd3fc; }

      .sr-lg-card p {
        margin: 0 0 8px;
        font-size: 12.5px;
        line-height: 1.52;
        color: #334155;
      }
      [data-theme="dark"] .sr-lg-card p { color: #cbd5e1; }
      .sr-lg-card p:last-child { margin-bottom: 0; }

      .sr-lg-example {
        padding: 9px 11px;
        border-radius: 11px;
        background: rgba(16, 185, 129, 0.08);
        border-left: 3px solid #10b981;
        font-size: 12px;
        line-height: 1.48;
        color: #064e3b;
        margin-top: 6px;
      }
      [data-theme="dark"] .sr-lg-example {
        background: rgba(16, 185, 129, 0.12);
        color: #d1fae5;
      }

      .sr-lg-app-link {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px dashed rgba(148, 163, 184, 0.28);
        font-size: 11.5px;
        color: #475569;
        display: flex;
        align-items: flex-start;
        gap: 6px;
      }
      [data-theme="dark"] .sr-lg-app-link { color: #94a3b8; }

      .sr-lg-disclaimer {
        padding: 10px 16px calc(12px + env(safe-area-inset-bottom, 0px));
        border-top: 1px solid rgba(15, 23, 42, 0.07);
        font-size: 11px;
        line-height: 1.4;
        color: #64748b;
        background: rgba(15, 23, 42, 0.02);
        flex-shrink: 0;
      }
      [data-theme="dark"] .sr-lg-disclaimer {
        border-top-color: rgba(148, 163, 184, 0.12);
        background: rgba(255, 255, 255, 0.02);
        color: #94a3b8;
      }
    `;
    document.head.appendChild(style);
  }

  const CONTENT = {
    en: {
      title: 'Nigeria Tax & Work Rights (2026)',
      sub: 'Plain-English guide to NTA 2025, PenCom, Labour Act & NDPA 2023',
      tabs: [
        { id: 'tax', label: 'Tax & Relief' },
        { id: 'deductions', label: 'Deductions' },
        { id: 'work', label: 'Work & Overtime' },
        { id: 'privacy', label: 'Privacy & GPS' }
      ],
      execBannerTitle: 'Employer Remittance & Audit Deadlines (2026)',
      execBannerHtml: '<strong>PAYE:</strong> Remit to State IRS by the <strong>10th</strong> of the following month. &middot; <strong>PenCom (18% total):</strong> Remit within <strong>7 working days</strong> of payday. &middot; <strong>BHT Rule:</strong> Basic + Housing + Transport must be &ge;80% of gross. &middot; <strong>NSITF (1%) &amp; ITF (1%):</strong> Employer-only (ITF applies at &ge;5 staff or &ge;₦50M turnover).',
      snapEyebrow: 'Your Live ShiftRelay Pay Snapshot',
      snapGross: 'Monthly Gross',
      snapPaye: 'PAYE Tax',
      snapNet: 'Take-Home',
      snapTipTaxFree: 'Great news: at ₦800,000/yr or less (~₦66,667/mo), you are 100% exempt from PAYE tax under the Nigeria Tax Act 2025.',
      snapTipRent: 'Paying house rent? Under Nigeria Tax Act 2025, you can claim 20% of your annual rent (capped at ₦500,000/yr) to lower your monthly PAYE tax.',
      snapCta: 'Claim Rent Relief Now',
      disclaimer: 'Informational summary of Nigerian statutory rules implemented in ShiftRelay (Nigeria Tax Act 2025, PRA 2014, Labour Act & NDPA 2023). Not formal legal or tax advice.',
      sections: {
        tax: [
          {
            title: '₦800,000/Year Tax-Free Threshold',
            badge: 'NTA 2025 · 0% Tax',
            badgeTone: '',
            body: [
              'Under the Nigeria Tax Act 2025 (effective January 1, 2026), the first ₦800,000 of your annual taxable income is completely tax-free (0% PAYE).',
              'If your total yearly income is ₦800,000 or less (about ₦66,667/month), you pay ₦0 PAYE. Above ₦800,000/yr, progressive bands apply only to the extra portion (15%, 18%, 21%, 23%, up to 25% for high earners).'
            ],
            example: 'Example: Earning ₦150,000/month (₦1.8M/yr) does NOT mean you pay 15% on everything. Pension, NHF, Rent Relief, and the first ₦800,000 are removed before tax is calculated.',
            appNote: 'In ShiftRelay: Your Earnings tab automatically applies NTA 2025 bands every cycle so neither you nor HR overpays tax.'
          },
          {
            title: 'Rent Relief (Replaces Old CRA)',
            badge: 'Up to ₦500k/yr Free',
            badgeTone: 'is-amber',
            body: [
              'The old Consolidated Relief Allowance (CRA) was abolished under the Nigeria Tax Act 2025 and replaced with Rent Relief.',
              'If you pay rent for your home, you can deduct 20% of your verified annual rent (capped at ₦500,000/year) from your taxable income.'
            ],
            example: 'Example: If your annual rent is ₦1,200,000, 20% = ₦240,000/year (₦20,000/month) becomes tax-free — cutting your monthly PAYE by roughly ₦3,000 to ₦4,200 every month.',
            appNote: 'In ShiftRelay: Tap "Claim Rent Relief" in Earnings, enter your annual rent, and upload your rent receipt or tenancy agreement for HR verification.'
          }
        ],
        deductions: [
          {
            title: 'PenCom Pension (8% You + 10% Employer)',
            badge: 'PRA 2014 · Your Future',
            badgeTone: '',
            body: [
              'Under the Pension Reform Act 2014, 8% of your Basic + Housing + Transport (BHT) comes from your salary, and your employer MUST add an extra 10% on top — totalling 18% every month.',
              'This money is NOT kept by your company. It goes straight into your personal Retirement Savings Account (RSA) with your Pension Fund Administrator (PFA).'
            ],
            example: 'Example: On ₦200,000 BHT, ₦16,000 is deducted from your pay and your employer adds ₦20,000 of their own money = ₦36,000/month deposited in your name.',
            appNote: 'In ShiftRelay: Your Statutory Breakdown separates Pension from PAYE so you can confirm your monthly PFA credit.'
          },
          {
            title: 'National Housing Fund (NHF · 2.5% of Basic)',
            badge: '2.5% Basic',
            badgeTone: 'is-blue',
            body: [
              'NHF is 2.5% of your Basic salary paid toward the Federal Mortgage Bank of Nigeria (FMBN) housing scheme for low-interest home loans.',
              'Minimum-wage earners are exempt, and private-sector workers can confirm voluntary/statutory status with HR.'
            ],
            example: 'Example: On ₦100,000 Basic salary, NHF is ₦2,500/month — and it is deducted before tax, slightly lowering your PAYE too.',
            appNote: 'In ShiftRelay: NHF is pre-tax and clearly itemized on your monthly PDF payslip.'
          },
          {
            title: 'NSITF (1%) & ITF (1%) — ₦0 From Workers',
            badge: '100% Employer Paid',
            badgeTone: 'is-amber',
            body: [
              'NSITF (Employee Compensation Act — 1% for workplace injury cover) and ITF (Industrial Training Fund — 1% for staff training) are paid 100% by your employer.',
              'These must NEVER be deducted from a worker\'s salary.'
            ],
            example: 'On your ShiftRelay worker payslip, NSITF and ITF deductions are always ₦0.00. They appear only in the Employer Statutory Ledger.',
            appNote: 'In ShiftRelay: Executives see exact NSITF & ITF remittance totals in Payroll without touching worker take-home pay.'
          }
        ],
        work: [
          {
            title: 'Overtime & Nigerian Public Holiday Pay',
            badge: '1.5x / 2.0x Auto',
            badgeTone: '',
            body: [
              'Hours worked beyond your standard scheduled shift count as overtime (typically 1.5x base hourly rate).',
              'Work performed on official Nigerian Public Holidays attracts 2.0x (double time) pay under Nigerian statutory payroll standards.'
            ],
            example: 'Example: At ₦1,500/hr base pay, an 8-hour Nigerian Public Holiday shift pays ₦3,000/hr = ₦24,000.',
            appNote: 'In ShiftRelay: Every verified clock-in and clock-out automatically feeds your hours and holiday multipliers into Payroll.'
          },
          {
            title: 'Why Verified Clock-In & Handovers Protect You',
            badge: 'Audit Proof',
            badgeTone: 'is-blue',
            body: [
              'Disputes happen when attendance is written on paper sheets that get lost or altered.',
              'ShiftRelay creates a tamper-evident digital timestamp of when you arrived, when you finished, and what you handed over (including photos, PDFs, and voice notes).'
            ],
            example: 'If an equipment fault happened before your shift started, your timestamped Handover Chat photo/voice note proves it clearly.',
            appNote: 'In ShiftRelay: Use Clock-In + Handover Chat every shift to protect your pay record and reliability score.'
          },
          {
            title: 'Annual Leave, Sick Leave & Zero-Fee EWA',
            badge: 'Nigerian Labour Act',
            badgeTone: 'is-amber',
            body: [
              'Under the Nigerian Labour Act, confirmed staff earn at least 6 working days of paid annual leave after 12 months (many employers offer 15–20 days), plus sick leave and 12 weeks maternity protection.',
              'Earned Wage Access (EWA) in ShiftRelay lets you withdraw part of pay you have already worked for at 0% interest and ₦0 worker fee — it is NOT a loan.'
            ],
            example: 'Withdrawing ₦20,000 of accrued mid-month pay means ₦20,000 is simply reconciled at month-end — zero hidden interest or penalty.',
            appNote: 'In ShiftRelay: Request leave under Schedule → Time Away and track EWA inside Earnings.'
          }
        ],
        privacy: [
          {
            title: 'No Background or Off-Shift GPS Tracking',
            badge: 'Clock-In Only',
            badgeTone: '',
            body: [
              'ShiftRelay only checks your GPS location at the exact moment you tap Clock In or Clock Out (to confirm you are at the approved workplace muster point).',
              'Once you clock in or go home, ShiftRelay does NOT continuously track your movement in the background.'
            ],
            example: 'Your phone location is never logged on your off-days, commute, or private hours.',
            appNote: 'In ShiftRelay: Peer Staff ID QR Check-In also works cleanly when indoor GPS signals are weak.'
          },
          {
            title: 'NDPA 2023 Data Protection & Isolation',
            badge: 'NDPA 2023 Compliant',
            badgeTone: 'is-blue',
            body: [
              'Under the Nigeria Data Protection Act 2023, you have the right to know what workplace data is stored about you and to ensure it is never sold or leaked.',
              'Your rent receipt, bank account number, payslips, and shift handovers are strictly isolated inside your employer\'s encrypted ShiftRelay workspace.'
            ],
            example: 'Staff from another company can never view your handovers, photos, voice notes, or earnings.',
            appNote: 'In ShiftRelay: View your full DPA & security posture anytime at Compliance → Trust Center.'
          }
        ]
      }
    },
    pidgin: {
      title: 'Nigeria Tax & Work Rights (2026)',
      sub: 'Simple Pidgin breakdown of NTA 2025, PenCom, Labour Law & Privacy',
      tabs: [
        { id: 'tax', label: 'Tax & Relief' },
        { id: 'deductions', label: 'Wetin Dem Cut' },
        { id: 'work', label: 'Work & Overtime' },
        { id: 'privacy', label: 'GPS & Privacy' }
      ],
      execBannerTitle: 'Employer Remittance Deadlines (2026)',
      execBannerHtml: '<strong>PAYE:</strong> Pay to State IRS before <strong>10th</strong> of next month. &middot; <strong>PenCom (18% total):</strong> Remit within <strong>7 working days</strong> after payday. &middot; <strong>BHT Rule:</strong> Basic + Housing + Transport must be &ge;80%. &middot; <strong>NSITF (1%) &amp; ITF (1%):</strong> Na company dey pay am 100%, no touch worker salary.',
      snapEyebrow: 'Your Real ShiftRelay Pay Summary',
      snapGross: 'Monthly Gross',
      snapPaye: 'Tax (PAYE)',
      snapNet: 'Enter Hand',
      snapTipTaxFree: 'Good news: anybody wey earn ₦800,000 or less per year (~₦66,667/month) dey pay ₦0 PAYE tax under 2026 Nigeria Tax Act.',
      snapTipRent: 'You dey pay house rent? Under 2026 Nigeria Tax Act, government allow you remove 20% of your yearly rent (up to ₦500,000/yr) so your monthly tax go drop.',
      snapCta: 'Claim Rent Relief Now',
      disclaimer: 'Simple guide to explain Nigeria work & tax rules inside ShiftRelay (NTA 2025, PRA 2014, Labour Act & NDPA 2023). No be formal lawyer or tax court advice.',
      sections: {
        tax: [
          {
            title: '₦800,000 Per Year Na Tax-Free',
            badge: 'NTA 2025 · ₦0 Tax',
            badgeTone: '',
            body: [
              'Under di new Nigeria Tax Act 2025 (wey start Jan 1, 2026), di first ₦800,000 of your yearly taxable income carry ₦0 tax.',
              'If all your pay for one year no pass ₦800,000 (around ₦66,667/month), you no go pay any PAYE tax at all. Na only money wey pass ₦800,000 dem dey tax step by step (from 15% up).'
            ],
            example: 'Example: If you earn ₦150,000/month, dem NO go collect 15% on everything. Dem go first remove Pension, NHF, Rent Relief, and ₦800k free band before calculating tax.',
            appNote: 'Inside ShiftRelay: Earnings tab dey calculate dis new 2026 law automatically so nobody fit over-tax you.'
          },
          {
            title: 'Rent Relief (Don Replace Old CRA)',
            badge: 'Up to ₦500k Free',
            badgeTone: 'is-amber',
            body: [
              'Government don cancel old CRA and bring Rent Relief to help workers wey dey pay house rent.',
              '20% of di house rent wey you pay for one year (maximum ₦500,000/yr) go comot from your taxable income once you upload your rent receipt.'
            ],
            example: 'Example: If your house rent na ₦1,200,000/year, 20% na ₦240,000/year tax-free — dat one fit save you around ₦3,000 to ₦4,200 extra money inside your pocket every month!',
            appNote: 'Inside ShiftRelay: Just tap "Claim Rent Relief" inside Earnings, type your yearly rent, snap your rent receipt, and submit am to HR.'
          }
        ],
        deductions: [
          {
            title: 'PenCom Pension (8% You + 10% Company)',
            badge: 'Na Your Own Money',
            badgeTone: '',
            body: [
              'By law (PRA 2014), 8% of your Basic + Housing + Transport (BHT) dey go into your pension, and your company MUST add extra 10% from their own pocket = 18% total every month.',
              'Dis money NO dey enter company pocket — e dey go straight into your personal RSA pension account for your PFA.'
            ],
            example: 'Example: On ₦200,000 BHT, you put ₦16,000, your company add ₦20,000 extra = ₦36,000 dey land for your pension account every month.',
            appNote: 'Inside ShiftRelay: Statutory Breakdown dey show your Pension separate from Tax so you fit monitor am.'
          },
          {
            title: 'NHF Housing Fund (2.5% of Basic)',
            badge: '2.5% Basic',
            badgeTone: 'is-blue',
            body: [
              'NHF na 2.5% of only your Basic salary wey dey go Federal Mortgage Bank so workers fit access low-interest housing loan.',
              'Minimum-wage earners no need pay am, and e dey reduce your taxable income small too.'
            ],
            example: 'Example: If your Basic na ₦100,000, NHF na ₦2,500/month — e no touch your Housing or Transport allowance.',
            appNote: 'Inside ShiftRelay: Your monthly payslip dey show exact NHF amount clearly.'
          },
          {
            title: 'NSITF (1%) & ITF (1%) — Zero Cut For Worker',
            badge: 'Company Pay 100%',
            badgeTone: 'is-amber',
            body: [
              'NSITF (workplace injury insurance) and ITF (training fund) na 100% employer bill.',
              'By Nigerian law, NO company get right to remove NSITF or ITF from worker salary.'
            ],
            example: 'For your ShiftRelay payslip, NSITF and ITF deduction for worker na always ₦0.00.',
            appNote: 'Inside ShiftRelay: Company bosses dey see NSITF & ITF separately for Payroll without touching your salary.'
          }
        ],
        work: [
          {
            title: 'Overtime & Public Holiday Double Pay',
            badge: '1.5x / 2.0x Pay',
            badgeTone: '',
            body: [
              'Extra hours wey you work pass your normal shift na overtime (1.5x your normal hourly rate).',
              'If you work on official Nigeria Public Holiday, standard statutory rate na 2.0x (double pay!).'
            ],
            example: 'Example: If your normal rate na ₦1,500/hr, 8 hours on Nigeria Public Holiday = ₦3,000/hr = ₦24,000.',
            appNote: 'Inside ShiftRelay: Once you clock in and clock out properly, system dey record your hours and holiday pay automatically.'
          },
          {
            title: 'How Clock-In & Handover Chat Dey Protect You',
            badge: 'Clear Evidence',
            badgeTone: 'is-blue',
            body: [
              'Paper register fit tear, miss, or cause argument on payday.',
              'ShiftRelay dey stamp exact time wey you reach work, time wey you close, and every photo, file, or voice note wey you send for Handover Chat.'
            ],
            example: 'If generator or machine spoil before your shift start, snap am or drop voice note for Handover Chat — clear proof dey database forever.',
            appNote: 'Inside ShiftRelay: Always clock in and drop quick handover update so your work record clean 100%.'
          },
          {
            title: 'Annual Leave & Zero-Interest Early Pay (EWA)',
            badge: 'Labour Act Rights',
            badgeTone: 'is-amber',
            body: [
              'Under Nigerian Labour Act, confirmed worker get right to paid annual leave (minimum 6 working days after 12 months, many companies give 15–20 days), sick leave, and 12 weeks maternity leave.',
              'Early Pay (EWA) inside ShiftRelay carry 0% interest and ₦0 worker fee — na money wey you don already work for, no be loan shark.'
            ],
            example: 'If you collect ₦20,000 mid-month from salary wey you don earn, na exact ₦20,000 dem go minus at month-end — zero extra charge.',
            appNote: 'Inside ShiftRelay: Apply for leave under Schedule → Time Away, and check Early Pay inside Earnings.'
          }
        ],
        privacy: [
          {
            title: 'ShiftRelay No Dey Track You For House',
            badge: 'Clock-In Time Only',
            badgeTone: '',
            body: [
              'ShiftRelay only check GPS at di exact second wey you press Clock In or Clock Out to confirm say you dey workplace.',
              'Once you close shift or go house, di app NO dey follow you or record where you go.'
            ],
            example: 'Your private movement on off-days or after work no dey show anywhere for ShiftRelay.',
            appNote: 'Inside ShiftRelay: If indoor GPS weak, Peer Staff ID QR Check-In dey work sharp too.'
          },
          {
            title: 'NDPA 2023 — Your Personal Data Safe',
            badge: 'NDPA Protected',
            badgeTone: 'is-blue',
            body: [
              'Under Nigeria Data Protection Act 2023, your personal details, rent receipt, bank info, and shift records must stay private and secure.',
              'Your company workspace dey locked separately — no outsider or another company fit ever see your data.'
            ],
            example: 'Your voice notes, photos, and payslip belong strictly to your company workspace only.',
            appNote: 'Inside ShiftRelay: Every file and handover dey encrypted and tenant-locked.'
          }
        ]
      }
    }
  };

  let activeAc = null;

  function closeModal() {
    if (activeAc) {
      try { activeAc.abort(); } catch (_) {}
      activeAc = null;
    }
    document.getElementById(MODAL_ID)?.remove();
  }

  async function open({
    initialTab = 'tax',
    isExecutive = false,
    paySnapshot = null,
    onClaimRentRelief = null
  } = {}) {
    injectStyles();
    closeModal();

    activeAc = new AbortController();
    const signal = activeAc.signal;

    let lang = 'en';
    try {
      const saved = localStorage.getItem('sr_law_guide_lang');
      if (saved === 'pidgin' || saved === 'en') lang = saved;
    } catch (_) {}

    let activeTab = ['tax', 'deductions', 'work', 'privacy'].includes(initialTab) ? initialTab : 'tax';
    let liveSnap = paySnapshot && typeof paySnapshot === 'object' ? { ...paySnapshot } : null;

    // Fetch live personal pay snapshot seamlessly if not supplied directly
    if (!liveSnap) {
      try {
        const res = await fetch('/api/earnings', { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          const st = d?.statement || d?.earnings || d || {};
          const grossVal = Number(st.grossPay ?? st.gross ?? 0);
          const netVal = Number(st.netPay ?? st.net ?? 0);
          if (grossVal > 0 || netVal > 0) {
            liveSnap = {
              gross: grossVal,
              taxes: Number(st.taxes ?? st.paye ?? 0),
              preTax: Number(st.preTax ?? st.pension ?? 0),
              net: netVal
            };
          }
        }
      } catch (_) {}
    }

    const backdrop = document.createElement('div');
    backdrop.id = MODAL_ID;
    backdrop.className = 'sr-lg-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Nigeria Tax and Work Rights Guide');
    document.body.appendChild(backdrop);

    function render() {
      const copy = CONTENT[lang] || CONTENT.en;
      const cards = copy.sections[activeTab] || copy.sections.tax;

      const annualEst = liveSnap ? Number(liveSnap.gross || 0) * 12 : 0;
      const isTaxExemptBand = liveSnap && annualEst > 0 && annualEst <= 800000;

      const snapHtml = (liveSnap && activeTab === 'tax') ? `
        <div class="sr-lg-snapshot">
          <div class="sr-lg-snap-top">
            <span class="sr-lg-snap-eyebrow">${esc(copy.snapEyebrow)}</span>
            <span style="font-size:10.5px;color:#a7f3d0;font-weight:700;">NTA 2025 Active</span>
          </div>
          <div class="sr-lg-snap-grid">
            <div class="sr-lg-snap-stat">
              <small>${esc(copy.snapGross)}</small>
              <strong>${esc(fmtNgn(liveSnap.gross))}</strong>
            </div>
            <div class="sr-lg-snap-stat">
              <small>${esc(copy.snapPaye)}</small>
              <strong style="color:#fda4af;">${esc(fmtNgn(liveSnap.taxes))}</strong>
            </div>
            <div class="sr-lg-snap-stat">
              <small>${esc(copy.snapNet)}</small>
              <strong style="color:#6ee7b7;">${esc(fmtNgn(liveSnap.net))}</strong>
            </div>
          </div>
          <p class="sr-lg-snap-tip">${esc(isTaxExemptBand ? copy.snapTipTaxFree : copy.snapTipRent)}</p>
          ${!isTaxExemptBand ? `
            <button type="button" class="sr-lg-snap-cta" id="sr-lg-claim-rent-btn">
              <span>${esc(copy.snapCta)}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          ` : ''}
        </div>
      ` : '';

      const execHtml = isExecutive ? `
        <div class="sr-lg-exec-banner">
          <div class="sr-lg-exec-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            <span>${esc(copy.execBannerTitle)}</span>
          </div>
          <div>${copy.execBannerHtml}</div>
        </div>
      ` : '';

      const cardsHtml = cards.map((c) => `
        <article class="sr-lg-card">
          <div class="sr-lg-card-head">
            <h4 class="sr-lg-card-title">${esc(c.title)}</h4>
            <span class="sr-lg-pill ${esc(c.badgeTone || '')}">${esc(c.badge)}</span>
          </div>
          ${c.body.map((p) => `<p>${esc(p)}</p>`).join('')}
          ${c.example ? `<div class="sr-lg-example">${esc(c.example)}</div>` : ''}
          ${c.appNote ? `
            <div class="sr-lg-app-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              <span>${esc(c.appNote)}</span>
            </div>
          ` : ''}
        </article>
      `).join('');

      backdrop.innerHTML = `
        <div class="sr-lg-sheet" id="sr-lg-sheet">
          <div class="sr-lg-handle-wrap"><span class="sr-lg-handle"></span></div>
          <div class="sr-lg-head">
            <div class="sr-lg-head-row">
              <div class="sr-lg-head-left">
                <span class="sr-lg-emblem" aria-hidden="true">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                </span>
                <div style="min-width:0;">
                  <h3 class="sr-lg-title">${esc(copy.title)}</h3>
                  <p class="sr-lg-sub">${esc(copy.sub)}</p>
                </div>
              </div>
              <button type="button" class="sr-lg-close" id="sr-lg-close-btn" aria-label="Close guide">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="sr-lg-head-row">
              <span style="font-size:11px;font-weight:700;color:#64748b;">Language:</span>
              <div class="sr-lg-lang-switch" role="group" aria-label="Guide language">
                <button type="button" class="sr-lg-lang-btn ${lang === 'en' ? 'is-active' : ''}" data-lg-lang="en">Plain English</button>
                <button type="button" class="sr-lg-lang-btn ${lang === 'pidgin' ? 'is-active' : ''}" data-lg-lang="pidgin">Nigerian Pidgin</button>
              </div>
            </div>
          </div>

          <div class="sr-lg-tabs" role="tablist">
            ${copy.tabs.map((t) => `
              <button type="button" class="sr-lg-tab ${activeTab === t.id ? 'is-active' : ''}" data-lg-tab="${t.id}" role="tab" aria-selected="${activeTab === t.id ? 'true' : 'false'}">${esc(t.label)}</button>
            `).join('')}
          </div>

          <div class="sr-lg-body" id="sr-lg-body">
            ${execHtml}
            ${snapHtml}
            ${cardsHtml}
          </div>

          <div class="sr-lg-disclaimer">${esc(copy.disclaimer)}</div>
        </div>
      `;

      backdrop.querySelector('#sr-lg-close-btn')?.addEventListener('click', closeModal);
      backdrop.querySelectorAll('[data-lg-lang]').forEach((btn) => {
        btn.addEventListener('click', () => {
          lang = btn.dataset.lgLang === 'pidgin' ? 'pidgin' : 'en';
          try { localStorage.setItem('sr_law_guide_lang', lang); } catch (_) {}
          render();
        });
      });
      backdrop.querySelectorAll('[data-lg-tab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          activeTab = btn.dataset.lgTab || 'tax';
          render();
        });
      });
      backdrop.querySelector('#sr-lg-claim-rent-btn')?.addEventListener('click', () => {
        closeModal();
        if (typeof onClaimRentRelief === 'function') {
          onClaimRentRelief();
        } else {
          const existingBtn = document.getElementById('sr-btn-claim-rent-relief');
          if (existingBtn) existingBtn.click();
          else if (typeof window.Phase1Shell?.navigate === 'function') {
            window.Phase1Shell.navigate('earnings');
            setTimeout(() => document.getElementById('sr-btn-claim-rent-relief')?.click(), 650);
          }
        }
      });
    }

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    }, { signal });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    }, { signal });

    render();
  }

  window.ShiftRelayLawGuide = { open, close: closeModal };
})();
