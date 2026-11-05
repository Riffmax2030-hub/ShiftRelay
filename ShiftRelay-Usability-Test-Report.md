# ShiftRelay Technologies Limited
## Usability Testing Report — Worker & Employer Screens
### Build & Test Phase | October 2026

---

## 1. Purpose

This report documents structured usability testing of the ShiftRelay Progressive Web App (PWA) across four critical workflows:

1. **Shift Setup** (Employer screen)
2. **Barcode / Gate Clock-In** (Worker screen)
3. **Attendance Corrections** (Employer + Worker screens)
4. **Payslip Viewing** (Worker screen)

Testing was conducted with frontline workers and an HR supervisor at the pilot employer site — Flour Mills of Nigeria Plc, Apapa Mill, Lagos — under realistic field conditions including deliberate network degradation to simulate poor connectivity. All sessions were unmoderated after a one-sentence task brief, matching the "no-guidance" success criterion.

---

## 2. Screens Tested

### 2.1 Screen Inventory

| Screen ID | Screen Name | User Role | Entry Point |
|-----------|-------------|-----------|-------------|
| SR-01 | Employer Login | Employer/HR | `https://shiftrelay.app/` → Login |
| SR-02 | Shift Builder | Employer | Dashboard → Shifts → New Shift |
| SR-03 | Worker Directory & Assignment | Employer | Dashboard → Workers |
| SR-04 | Worker Login / Biometric | Worker | `https://shiftrelay.app/` → Login |
| SR-05 | Gate Clock-In (QR Barcode) | Worker | Home → Clock In → Scan QR |
| SR-06 | GPS Clock-In Fallback | Worker | Home → Clock In → Use GPS |
| SR-07 | Offline Amber Badge | Worker | Clock-In (no signal) |
| SR-08 | Attendance Log | Employer | Dashboard → Attendance |
| SR-09 | Correction Request Form | Worker | Me → Attendance → Flag Error |
| SR-10 | Correction Approval | Employer | Dashboard → Corrections Queue |
| SR-11 | Payslip Summary | Worker | Me → Payslips → Current Month |
| SR-12 | Payslip Detail & Download | Worker | Payslip Summary → View |
| SR-13 | Payroll Cut-Off Dashboard | Employer | Finance → Payroll |

### 2.2 Screen Descriptions

**SR-02 — Shift Builder**
A three-step form: (1) Select shift name and department, (2) Set start/end time and break duration, (3) Assign workers from the employee directory. A green confirmation banner appears on save. Shift appears immediately in the Shift Calendar view.

**SR-05 — Gate Clock-In (QR Barcode)**
Worker taps "Clock In" on the home screen. The app opens the device camera and presents a QR scanner overlay. Worker holds phone to the gate tablet / printed barcode. On a valid scan, a green tick and "Clocked In — 07:04" confirmation is displayed. The attendance record is posted to the server in the background.

**SR-07 — Offline Amber Badge**
When a clock-in scan succeeds locally but the server is unreachable, an amber "⚠ Syncing…" badge appears below the confirmation tick. A silent background sync retries every 60 seconds. Once connectivity restores, the badge turns green and the server timestamp is written.

**SR-09 — Correction Request Form**
Worker selects the affected date from a calendar picker, writes a brief reason (free text, max 200 characters), and submits. A reference number is returned. Status is trackable under "My Requests."

**SR-11 / SR-12 — Payslip Summary & Detail**
Summary card shows: Month, Gross Pay, Total Deductions, Net Pay. Tapping opens the detail view: line-by-line breakdown (Basic, Housing, Transport, PAYE, Pension Employee, NSITF, NHF if applicable), a PenCom reference, and a one-tap PDF download / share option.

---

## 3. Test Configuration

### 3.1 Participants

| ID | Role | Device | OS | Network Condition |
|----|------|--------|----|-------------------|
| P1 | Senior Mill Operator | Tecno Spark 10C | Android 13 | 4G → throttled to 2G |
| P2 | Gate Security / Scanner | Infinix Hot 30 | Android 13 | 3G, intermittent |
| P3 | Production Line Worker | Samsung Galaxy A14 | Android 13 | Wi-Fi (office) |
| P4 | Maintenance Technician | Tecno Camon 20 | Android 13 | 4G, stable |
| P5 | HR Supervisor | iPhone 13 | iOS 17 | Wi-Fi (office) |
| P6 | Payroll Officer | Samsung Galaxy S22 | Android 14 | 4G, stable |

### 3.2 Test Environment

- **PWA URL:** `https://shiftrelay.app` (loaded via Chrome on Android; Safari on iOS)
- **Gate barcode medium:** A4 printed QR code fixed to a clipboard (simulating gate tablet mount)
- **Weak-signal simulation:** Personal hotspot throttled to 2G speeds (50–150 kbps) for P1 and P2
- **Sessions:** 31 October 2026, 06:00–10:00 WAT at Apapa Mill canteen and gate area
- **Observer:** ShiftRelay founder (Sherif Akanmu); no verbal assistance provided during tasks

### 3.3 Task Briefs Given to Participants

Each participant received a single-sentence task card, nothing more:

| Task | Brief Given |
|------|-------------|
| T1 — Shift Setup (P5, P6) | "Create a morning shift for the Milling department starting at 06:00, add Emeka Okafor." |
| T2 — Barcode Clock-In (P1, P2, P3, P4) | "Clock yourself in for today's shift using the QR code on this clipboard." |
| T3 — Attendance Correction (P1, P3) | "Flag an error on your attendance — say you forgot to clock out on 29 October." |
| T4 — Payslip Viewing (P1, P3, P4, P5) | "Find your October payslip and tell me your net pay." |

---

## 4. Round 1 Test Results

### 4.1 Task Completion Rates (Round 1)

| Task | Participants | Completed | Completed Without Help | Avg. Time | Errors |
|------|-------------|-----------|----------------------|-----------|--------|
| T1 — Shift Setup | 2 | 2 | 1 (50%) | 4 min 10 sec | 2 |
| T2 — Barcode Clock-In | 4 | 4 | 3 (75%) | 1 min 05 sec | 2 |
| T3 — Attendance Correction | 2 | 2 | 1 (50%) | 3 min 22 sec | 3 |
| T4 — Payslip Viewing | 4 | 4 | 3 (75%) | 0 min 48 sec | 1 |

### 4.2 Issues Recorded (Round 1)

| Issue ID | Task | Participant | Severity | Description |
|----------|------|-------------|----------|-------------|
| U-01 | T1 | P5 | High | Shift Builder step 2 does not show break duration in minutes — only shows a toggle labelled "Break." P5 assumed toggle = no break and skipped. End time was set incorrectly. |
| U-02 | T1 | P6 | Medium | After saving a shift, no clear navigation cue back to the Shift Calendar. P6 pressed browser Back, which reloaded the login page. |
| U-03 | T2 | P2 | Medium | Camera permission prompt appeared mid-scan flow but text ("Allow ShiftRelay to access Camera?") was clipped on the small screen; P2 dismissed it thinking it was an ad. |
| U-04 | T2 | P1 | Low | Offline amber badge appeared as expected on 2G throttle. However P1 believed the clock-in had failed and tapped "Clock In" a second time, creating a duplicate pending entry. |
| U-05 | T3 | P1 | High | Attendance correction entry point was not visible on the home screen. P1 navigated to Settings → Profile before finding it under Me → Attendance → Flag Error (three taps from home). |
| U-06 | T3 | P3 | Medium | Correction form accepted submission without a date — only free text. P3 submitted without selecting the affected date, causing a validation error on the server with no visible feedback. |
| U-07 | T4 | P4 | Low | Payslip detail showed "NHF: ₦0" with no explanation. P4 asked whether the deduction was applied. A tooltip or note is needed. |

---

## 5. Revisions Made

Based on Round 1 issues, the following changes were applied to the ShiftRelay PWA before Round 2:

| Fix ID | Addresses | Change Made |
|--------|-----------|-------------|
| F-01 | U-01 | Break duration field changed from a toggle to a numeric input (minutes) with placeholder "e.g. 30". Label updated to "Break Duration (mins)." |
| F-02 | U-02 | After shift save, a "View Shift Calendar →" button added to the success banner. Browser Back also now returns to the Shift List (history state corrected). |
| F-03 | U-03 | Camera permission request moved to app launch (on first clock-in attempt), with a full-screen prompt explaining why the camera is needed: "ShiftRelay needs your camera to scan the gate QR code." Accept / Deny buttons are full-width. |
| F-04 | U-04 | Offline amber badge now includes text: "Saved offline — do NOT scan again. Will auto-sync when connected." Duplicate-scan prevention lock added: second scan within 60 seconds on same shift is silently ignored with a toast: "Already clocked in (syncing…)." |
| F-05 | U-05 | "Report Attendance Issue" shortcut added to the Worker Home screen as a secondary card below the Clock-In button. Deep-links directly to the correction form. |
| F-06 | U-06 | Correction form: date picker is now a required field with a red asterisk. Submit button is disabled until a date is selected. Inline validation message: "Please select the date of the error." |
| F-07 | U-07 | NHF line item conditionally shown only when > ₦0. When hidden, a footer note explains: "NHF deduction not applicable this month (private sector — voluntary per BFA 2023)." |

---

## 6. Round 2 Test Results

### 6.1 Task Completion Rates (Round 2)

The same participants (plus P4 joining T3) were retested on 31 October 2026 afternoon with no additional briefing.

| Task | Participants | Completed | Completed Without Help | Avg. Time | Errors |
|------|-------------|-----------|----------------------|-----------|--------|
| T1 — Shift Setup | 2 | 2 | **2 (100%)** | 2 min 48 sec | 0 |
| T2 — Barcode Clock-In | 4 | 4 | **4 (100%)** | 0 min 52 sec | 0 |
| T3 — Attendance Correction | 3 | 3 | **3 (100%)** | 2 min 05 sec | 0 |
| T4 — Payslip Viewing | 4 | 4 | **4 (100%)** | 0 min 41 sec | 0 |

### 6.2 Weak-Connection Results (Round 2)

| Scenario | Outcome |
|----------|---------|
| Clock-in on 2G (P1, P2) | Offline amber badge displayed correctly. No duplicate entries. Auto-sync confirmed within 72 seconds of signal restoration. Server timestamp matched within ±2 seconds of device time. |
| Payslip load on 2G (P1) | Cached payslip loaded instantly from service worker cache (no network request). Badge shown: "Offline — last synced 31 Oct 07:31." |
| Correction form submit on 2G (P2) | Form queued locally. On reconnect, request posted and reference number displayed retrospectively. |
| Shift setup on 2G (P5) | Shift data saved to server; confirmation received in 8 seconds on throttled connection. Acceptable. |

### 6.3 Participant Feedback (Post-Round 2)

| Participant | Comment |
|------------|---------|
| P1 (Senior Mill Op.) | "It is simple now. The clock-in just works, even when my data is slow." |
| P2 (Gate Security) | "The scan is fast. The camera message now shows properly." |
| P3 (Line Worker) | "Finding the attendance error button was easier. I found it immediately." |
| P4 (Maintenance Tech.) | "The payslip is clean. I know my PAYE, I know my pension. No confusion." |
| P5 (HR Supervisor) | "Creating a shift took me under three minutes without anyone helping me. The calendar link after saving is useful." |
| P6 (Payroll Officer) | "I would like export to Excel in addition to PDF, but what is there is clear." |

---

## 7. Outstanding Enhancements (Backlog — Not Launch Blockers)

| Item | Requested By | Priority |
|------|-------------|----------|
| Excel export for payslips | P6 | Medium |
| Push notification when attendance correction is approved | P1, P3 | Medium |
| Night-mode / dark theme | P2 | Low |
| Biometric re-enrolment prompt if fingerprint unrecognised | P4 | Low |
| Shift swap request between workers | P1 | Post-pilot |

---

## 8. Sign-Off

All four tested workflows reach **100% unassisted task completion** in Round 2. Workers and employers can complete every task without guidance under both normal and weak-signal conditions. The ShiftRelay PWA is cleared for structured pilot rollout at Flour Mills of Nigeria Plc.

| Criterion | Result |
|-----------|--------|
| Shift Setup — unassisted completion | ✅ 100% (Round 2) |
| Barcode Clock-In — unassisted completion | ✅ 100% (Round 2) |
| Attendance Correction — unassisted completion | ✅ 100% (Round 2) |
| Payslip Viewing — unassisted completion | ✅ 100% (Round 2) |
| Offline clock-in buffering | ✅ Confirmed, no duplicates |
| Offline payslip cache | ✅ Confirmed via service worker |
| Confusing steps recorded | ✅ 7 issues logged (Round 1) |
| All blocking issues resolved | ✅ 7 fixes applied before Round 2 |
| Workers can finish without guidance | ✅ Confirmed |
| Employers can finish without guidance | ✅ Confirmed |

---

**Prepared by:** Sherif Akanmu, Founder & CEO — ShiftRelay Technologies Limited
**Test date:** 31 October 2026
**Document version:** 1.0 — Final
