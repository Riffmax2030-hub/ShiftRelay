# ShiftRelay Official App Store & Google Play Launch Kit (2026 Edition)

---

## 1. App Identifiers & Metadata

- **App ID (Bundle ID / Package Name):** `com.shiftrelayos.app`
- **App Name (Google Play):** `ShiftRelay — Attendance & WFM`
- **App Name (App Store):** `ShiftRelay: Work & Payroll` (30 char limit)
- **Subtitle (iOS):** `Attendance, Handovers & Payroll` (30 char limit)
- **Primary Category:** Business
- **Secondary Category:** Productivity
- **Content Rating:** Everyone / 4+ (no age-restricted content)
- **Default Language:** English (with built-in localization for Hausa, Yoruba, Igbo, French, Spanish, Arabic, Portuguese, German, Chinese, Japanese)

### Short Description (Google Play — 80 chars max)
```text
Verified clock-in, AI shift handovers & statutory payroll for frontline teams.
```

### Full Description (Both Stores — formatted for enterprise buyers)
```text
ShiftRelay by Riffmax Technology Limited is an accountable workforce management, verified attendance, shift handover, and statutory payroll platform built for frontline teams across hospitals, factories, logistics, hospitality, security, and offices.

EVERY SHIFT. ACCOUNTED FOR.
Eliminate lost context, verbal miscommunications, and payroll errors. ShiftRelay gives frontline workers and operations supervisors end-to-end transparency across every turnaround.

KEY FEATURES:
• Verified Clock-In, Peer ID Scan & Reminders: Digital Staff ID cards, colleague peer scanning (eliminating hardware kiosks), automated pre-shift reminders, and burst GPS geofence validation.
• Transparent Attendance Exceptions: Clear employer grace periods, worker exception explanations, and audited supervisor pardon/adjustment workflows.
• Accountable Shift Handovers: Guided transition workflows that turn shift updates, voice dispatches, and equipment photos into structured, actionable briefs with clear priorities and deadlines.
• Schedule & Leave Management: Automated shift rostering, time-off requests, leave balance tracking, and peer-to-peer coworker shift trades with manager sign-off.
• Pay Transparency & Nigerian Statutory Payroll: Accrued earnings statements, Finance Act PAYE, PenCom, NHF, and NSITF statutory breakdown visibility with single-source attendance sync.
• Offline-First Reliability: Built for intermittent network conditions. Clock-ins and checklist items queue safely on device and synchronize automatically when connectivity resumes.
• Enterprise Compliance: Engineered to support NDPA 2023, NITDA biometric standards, and international data protection standards.

Built by Riffmax Technology Limited (https://shiftrelayos.com) for frontline teams who need reliability and fairness.
```

---

## 2. Reviewer Test Credentials (CRITICAL for App Store & Google Play Review)

> [!IMPORTANT]
> Because ShiftRelay requires a corporate Company ID to sign in (self-registration is disabled for tenant security), you **MUST** provide these demo credentials in the **"App Review Information"** section of App Store Connect and Google Play Console so reviewers can test the app immediately without being blocked.

| Role | Company ID | Email / Username | Password / Action |
|---|---|---|---|
| **Worker / Specialist** | `246701` | `babatunde@riffmax.tech` *(or provisioned reviewer account)* | Tap **"Continue"** -> sign in with provisioned reviewer password (`SHIFTRELAY_DEMO_MEMBER_PASS` in staging) |
| **Supervisor / Lead** | `246701` | `olaide@riffmax.tech` | Reviewer can inspect attendance exceptions & shift sign-offs |
| **HR / Executive** | `246701` | `sherif@riffmax.tech` | Access analytics, payroll sync & workforce roster |

> [!CAUTION]
> Before submitting to Google Play or App Store Connect, provision a dedicated Store Review sandbox tenant on `https://admin.shiftrelayos.com` (or verify Company `246701` credentials match your live `SHIFTRELAY_DEMO_MEMBER_PASS` / reviewer account) and supply the active password only inside App Store Connect / Play Console's private **App Review Information** field — never commit production passwords to Git.

**Reviewer Notes to paste into Store submission:**
```text
ShiftRelay is an enterprise B2B workforce operating system provisioned by employers. To test the full workflow:
1. Launch the app and enter Company ID: 246701
2. Enter Email: babatunde@riffmax.tech (and password supplied separately in reviewer credentials).
3. Accept the active Employer Attendance & Grace Period policy banner, test Clock-In, Digital Staff ID / Peer Scan, Handover relay, and view Attendance Exceptions & Pay Breakdown.
4. No public self-signup exists; new employers request onboarding via https://shiftrelayos.com.
```

---

## 3. Google Play Data Safety & Apple Privacy Disclosure Matrix

### Google Play Data Safety Form:
- **Location:** Approximate & Precise location collected for App Functionality (Shift clock-in geofence verification). Encrypted in transit.
- **Personal Info:** Name, work email address, and Employee ID for Account Management and Enterprise authentication.
- **Photos & Videos:** Photos collected only when user voluntarily attaches equipment or shift evidence photos to a handover or verification capture.
- **Audio:** Audio recordings collected only when user chooses to record a voice handover dispatch note.
- **Data Encryption:** Yes, all data is encrypted in transit using standard HTTPS/TLS.
- **Account Deletion:** Supported both in-app (Settings > Account Deletion) and publicly at `https://shiftrelayos.com/delete-account.html`.

### Apple App Store Privacy Labels:
- **Data Used to Track You:** None (0 tracking).
- **Data Linked to You:**
  - Contact Info (Name, Email)
  - Location (Precise / Coarse Location)
  - User Content (Photos, Audio, Handover notes)
  - Identifiers (User ID, Device ID)
- **Data Not Linked to You:** Diagnostics (Crash data).

---

## 4. Public Legal & Support URLs (Must be live HTTPS before submission)

- **Marketing / Support Website:** `https://shiftrelayos.com/`
- **App / API Origin:** `https://app.shiftrelayos.com/`
- **Privacy Policy URL:** `https://shiftrelayos.com/privacy.html`
- **Terms of Service URL:** `https://shiftrelayos.com/terms.html`
- **Account Deletion URL:** `https://shiftrelayos.com/delete-account.html`
- **Support Contact Email:** `support@shiftrelayos.com`
- **Data Protection Officer Email:** `dpo@shiftrelayos.com`

---

## 5. Commands to Generate Store Release Binaries

### Android (Google Play AAB):
1. Package mobile assets and sync:
   ```powershell
   npm run build:mobile
   npx cap sync android
   ```
2. Build Android App Bundle in Android Studio:
   ```powershell
   npx cap open android
   ```
   In Android Studio: **Build > Generate Signed Bundle / APK > Android App Bundle (`.aab`)**.
   Upload the resulting `app-release.aab` directly to Google Play Console under **Production** (or **Closed Testing**).

### iOS (Apple App Store IPA):
1. Package mobile assets and sync:
   ```powershell
   npm run build:mobile
   npx cap sync ios
   ```
2. Open project in Xcode on macOS:
   ```bash
   npx cap open ios
   ```
3. In Xcode: Select target **App**, select your Apple Developer Team under **Signing & Capabilities**, set destination to **Any iOS Device (arm64)**, and choose **Product > Archive**.
4. In the Organizer window, click **Distribute App > App Store Connect > Upload**.
