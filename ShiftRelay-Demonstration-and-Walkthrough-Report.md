# ShiftRelay Demonstration & Walkthrough Evaluation Report
## Task: Create and Test a ShiftRelay Demonstration

---

### Demonstration Overview
* **System Under Test:** ShiftRelay Enterprise HCM (Build v93)
* **Target Enterprise Pilot:** Flour Mills of Nigeria Plc (Tenant ID: `FLO-NG-6093`)
* **Operating Hub:** Apapa Industrial Hub, Lagos State
* **Date Conducted:** October 30, 2026

---

## 1. Walkthrough Test Scenario with Fictional Records

We conducted structured, clickable walkthroughs testing the seven required end-to-end user journeys:

| Test Journey | Persona / Actor | Test Record Used | Tested Features | Outcome |
|---|---|---|---|---|
| **1. Company Setup** | Internal Concierge Admin | Tenant ID: `FLO-NG-6093` (Flour Mills of Nigeria) | Tenant creation, geofence radius configuration (500m), and Gate QR Vector Poster generator | **PASS** |
| **2. Worker Profile & Onboarding** | Frontline Worker | `Emeka Okafor` (Senior Mill Operator, Grain Milling) | Tri-Factor login, WebAuthn device biometrics enrollment, Profile & CV view | **PASS** |
| **3. Rotational Shift Schedules** | Shift Supervisor & Worker | Morning Shift (06:00 – 14:00 WAT) | 24/7 roster visualization, shift handover relay draft, open shift claiming | **PASS** |
| **4. Barcode / QR Gate Clock-In & Out** | Frontline Worker | Station Gate 01 (`SHIFTRELAY:GATE:FLO-NG-6093:Apapa`) | Camera reticle scan, 500ms token verification, and 1.5s GPS fallback | **PASS** |
| **5. Worker Performance Scores** | Frontline Worker & Supervisor | Reliability Index (99.4%), 16-Day Streak | Check-in streak tracking, punctuality rate (94.5%), endorsements score | **PASS** |
| **6. Monthly Payslips** | Frontline Worker | October 2026 Pay Period | Digital payslip viewer, itemized gross wages, overtime hours breakdown | **PASS** |
| **7. Statutory Tax Deductions** | Plant Owner / Finance Desk | Gross Payroll: ₦13.92M | Finance Act CRA, PenCom 18% split, NSITF 1%, NHF 2.5%, GAPS bank CSV export | **PASS** |

---

## 2. Design Tool Strategy (Canva, Fiverr, DesignGuru)

To deliver a high-impact presentation for HelpBnk reviewers, enterprise pilot clients, and frontline workers, we mapped out the graphic design deliverables across the recommended tools:

### A. Canva (Self-Serve Quick Assets)
1. **Physical Gate Muster Poster:** High-resolution A4/A3 laminated poster containing the vector Gate QR, anti-glare border, high-contrast instructions (*"Point camera at code. Keep phone at chest height"*), and the emergency manual clock-in PIN.
2. **Clickable Demo Slide Deck:** 10-slide enterprise presentation showcasing side-by-side screenshots of the Worker Mobile PWA and the Owner Executive Analytics Dashboard.
3. **Worker Quick-Start Pocket Guide:** 2-sided laminated card in plain English and Pidgin explaining 1-touch biometric login and offline clocking.

### B. Fiverr (Targeted Freelance Polish)
* **3D Isometric Product Mockup:** Engaging a specialized 3D artist to render ShiftRelay running on budget Android smartphones (Tecno, Infinix) mounted on factory plant turnstiles and warehouse tablets.

### C. DesignGuru (Dedicated Agency Retainer)
* **Brand Identity & Vector Icon System:** Production-grade SVG icons for factory safety alerts, muster stations, and payroll ledger badges.

---

## 3. Observation Log: Errors, Barcode Misuse Risks & Remediation

During user and supervisor walkthrough simulations, three specific operational risks and barcode misuse scenarios were observed and resolved:

### Risk 1: Photo-Sharing / Remote Barcode Clock-In (Proxy Punching)
* **Observed Risk:** A worker takes a photo of the physical Gate QR poster with their phone and sends it to a colleague stuck in Lagos traffic via WhatsApp. The colleague attempts to scan the photo on their computer screen at home.
* **Remediation Implemented:**
  1. **Dual-Factor Cross Check:** When a Gate QR code is scanned, the device automatically evaluates the ambient cellular/network tower location against the Apapa site coordinates. If the distance exceeds the site perimeter, the punch is immediately flagged as `outside_geofence_flagged` and blocked.
  2. **Dynamic Rotating Tokens:** For high-security gates, the poster is displayed on an inexpensive low-power tablet screen that regenerates a cryptographically signed HMAC token every 60 seconds, rendering static photos invalid.

### Risk 2: Low-Light & Rainy Shift Changeovers (06:00 AM WAT)
* **Observed Risk:** During rainy early-morning shift changes, camera lenses experience glare or insufficient light to detect standard low-resolution QR codes quickly.
* **Remediation Implemented:**
  - Upgraded to high-contrast pure vector SVG rendering (`qr-svg-generator.js`) with 35% error correction margin (Level H).
  - Added a 1-tap "Flashlight Reticle" toggle in the scanner UI and an instant fallback: **"Confirm Gate 01 Arrival (1.5s GPS Burst)"**.

### Risk 3: Disputed Missing Punches from Gate Queues
* **Observed Risk:** At shift changeover (e.g. 14:00), 40 workers arriving simultaneously at Gate 01 create a 3-minute bottleneck. The last worker clocks in at 14:02 and is marked as late.
* **Remediation Implemented:**
  - Added a **5-Minute Shift Grace Window** in the scheduling engine.
  - Implemented the self-service **Missed Punch Correction** request workflow where supervisors can retroactively approve arrival without penalizing punctuality scores.

---

## 4. Required Platform Adjustments Identified
1. **Sound & Haptic Feedback:** Added an audible high-frequency "Chime" and a double vibration pulse when a Gate QR or Biometric scan succeeds, so workers don't need to look at the screen in noisy plant environments.
2. **Offline Visual Badge:** Ensured an amber badge clearly displays `[ ⏳ 1 Punch Queued Offline ]` on the home screen until internet connectivity is restored.

---
*ShiftRelay Technologies Limited — Clickable Demonstration and Walkthrough Log.*
