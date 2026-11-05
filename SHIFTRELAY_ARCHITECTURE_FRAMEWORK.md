# ShiftRelay SaaS Architecture & Engineering Framework (Nigeria Market)
**Version:** 2026.1  
**Category:** Enterprise Workforce Management, Statutory Payroll & Frontline Mobile SaaS  
**Standard:** Dayforce-grade architecture tailored for the Nigerian Enterprise Operating Environment  

---

## 1. Master Prompt Framework for SaaS Development
When prompting for any feature, avoid one-sentence casual prompts that burn context and tokens. Always invoke the **Principal Engineer Micro-Module Pattern**:

```text
Role: You are a Principal Software Engineer and expert in Nigerian Labor Law, FinTech infrastructure, and high-frequency workforce scheduling.
Task: Write clean, production-ready, modular [Language/Framework] code for [Specific Feature Name, e.g., Net-to-Gross Reverse Resolver].
Context: This is for Shift Relay (Dayforce for Nigeria) — frontline mobile timekeeping, supervisor handovers, and statutory payroll.
Constraints:
- Adhere strictly to the Finance Act (PAYE progressive brackets & Consolidated Relief Allowance).
- Adhere to the Pension Reform Act (PenCom 8% employee / 10% employer), NHF (2.5% of basic), NSITF (1%), and ITF (1%).
- Ensure zero UI regressions: maintain the Web3 FinTech visual tokens (.web3-glass, neon glows, high-contrast dark theme).
- Output only compact, modular code, unit tests, and minimal conversational filler.
```

---

## 2. Nigerian Enterprise Regulatory Micro-Modules

### Module A: PIT / PAYE Tax Calculator
- **Statute:** Nigeria Personal Income Tax Act (PITA) amended by the Finance Act.
- **Consolidated Relief Allowance (CRA):**
  $$\text{CRA} = \max(1\% \times \text{Gross}, ₦200,000/\text{year}) + 20\% \times \text{Gross}$$
- **Taxable / Chargeable Income:**
  $$\text{Taxable Income} = \text{Gross} - \text{CRA} - \text{Employee Pension} - \text{NHF} - \text{Tax-Exempt Deductions}$$
- **Progressive Tax Bands (Annual):**
  - First ₦300,000 @ 7%
  - Next ₦300,000 @ 11%
  - Next ₦500,000 @ 15%
  - Next ₦500,000 @ 19%
  - Next ₦1,600,000 @ 21%
  - Above ₦3,200,000 @ 24%
- **Minimum Tax Guard:** 1% of gross income if calculated tax falls below minimum tax threshold.

### Module B: Statutory Deductions Matrix
- **PenCom (PRA 2014):** 8% Employee, 10% Employer.
- **National Housing Fund (NHF):** 2.5% of Basic Salary (where Basic is typically 50% of Gross).
- **NSITF (Employees' Compensation Act):** 1.0% of Gross (Employer cost).
- **ITF (Industrial Training Fund):** 1.0% of total payroll (Employer liability for entities with $\ge 5$ staff or $>₦50M$ turnover).

### Module C: Net-to-Gross Reverse Calculator
- In Nigeria, skilled frontline leads and supervisors negotiate **net take-home salary**.
- The reverse resolver iteratively derives the required gross salary backward from target net via high-precision binary convergence ($< ₦0.01$ tolerance).

### Module D: Casual Labor & Daily Pay Accumulator
- Accommodates manufacturing, retail, security, and hospitality casual workers.
- Daily or weekly accumulator that aggregates verified clock-in punches and computes instant disbursement payloads for Mono/Paystack disbursement.

### Module E: Public Holiday & Rest Day Overtime Matrix
- **Standard Workday Overtime ($>8$ hrs):** 1.5x regular hourly rate.
- **Sunday Rest Day & Federal Nigerian Public Holidays:** 2.0x double pay (e.g., Workers' Day, Democracy Day, Independence Day, Christmas, Easter).

---

## 3. Frontline Mobile App Design Standards (Anti-2002 Guidelines)

1. **Orbital Liquid Timer & Biometric Push Button:**
   - Circular biometric thumbprint reactive push button with animated liquid waves (`#sr-btn-water-clock`).
   - Clock-in state: Emerald green neon (`#00f5a0`).
   - Clock-out state: Rose red neon (`#f43f5e`).
   - SVG orbital gauge displaying live elapsed working time (`#sr-orbital-timer-wrap`).
   - Immediate feedback: direct clock in/out with zero modals, warnings, or lecture text.

2. **One-Line Reward Strip:**
   - Single clean strip above action cards: `+25 ★ earned · On-Time Clock-In Recorded`.
   - Clicking immediately navigates to Rewards / Earnings ledger without extra popups.

3. **Attendance Separation:**
   - Attendance hours (This Week, This Month, actual punch records) live exclusively on the dedicated **Attendance Tab**.
   - The **Schedule Tab** strictly holds upcoming shifts and leave requests.

4. **Supervisor Personal Shift Clock:**
   - Shift supervisors have their own embedded clock-in card (`#sr-sup-clock-card`), recognizing they are frontline operators running shifts alongside their teams.

5. **Closed Team Shift Swaps:**
   - Shift marketplace is restricted to coworkers in the same department/unit. Cross-company or external swapping is strictly blocked.

6. **Web3 / Modern FinTech Design Tokens:**
   - Glassmorphism: `.web3-glass` (`background: rgba(15, 23, 42, 0.75)`, backdrop blur 16px).
   - Accents: Neon Purple (`#818cf8`), Neon Cyan (`#06b6d4`), Neon Emerald (`#00f5a0`).
   - No harsh gray borders, no unstyled HTML `<table>`, and no 2002-era admin tables.

---

## 4. Token-Saving Guidelines for AI Engineering Sessions

1. **Micro-Module Isolation:** Work on one bounded context per turn (e.g., Attendance Punch, PIT Calculator, Shift Swap Ledger).
2. **Compact Diff Editing:** Prefer pinpoint edits over full-file rewrites.
3. **Types & Interfaces First:** Lock data structures (`Shift`, `Employee`, `TaxBreakdown`) before generating implementation logic.
4. **Never Regress UI:** Always verify that mobile app cards, website landing pages (`website.html`), and sovereign admin portals (`admin.html`) remain intact.
