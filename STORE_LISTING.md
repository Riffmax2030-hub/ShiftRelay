# ShiftRelay Official App Store & Google Play Launch Kit (2026 Edition)

---

## 1. App Identifiers & Metadata

- **App ID (Bundle ID / Package Name):** `com.shiftrelay.app`
- **App Name (Google Play):** `ShiftRelay — Shift Handover & WFM`
- **App Name (App Store):** `ShiftRelay: Shift Handover` (30 char limit)
- **Subtitle (iOS):** `Accountable Workforce Handovers` (30 char limit)
- **Primary Category:** Business
- **Secondary Category:** Productivity
- **Content Rating:** Everyone / 4+ (no age-restricted content)
- **Default Language:** English (with built-in localization for Hausa, Yoruba, Igbo, French, Spanish, Arabic, Portuguese, German, Chinese, Japanese)

### Short Description (Google Play — 80 chars max)
```text
Biometric clock-in, accountable shift handovers & WFM for frontline teams.
```

### Full Description (Both Stores — formatted for enterprise buyers)
```text
ShiftRelay is an accountable workforce management and shift handover platform built for frontline enterprise teams across logistics, manufacturing, healthcare, security, and retail operations.

EVERY SHIFT. ACCOUNTED FOR.
Eliminate lost context, verbal miscommunications, and phantom shifts. ShiftRelay gives frontline workers and operations supervisors end-to-end accountability across every turnaround.

KEY FEATURES:
• Biometric & Gate QR Muster: High-reliability attendance verification with one-touch biometric authentication, Gate QR code scanning, and burst GPS geofence validation.
• Accountable Shift Handovers: Guided transition workflows that turn shift updates, voice dispatches, and equipment photos into structured, actionable briefs with clear priorities and deadlines.
• Supervisor Sign-Off & Overrides: Real-time supervisor oversight with cryptographically signed exceptions and automated compliance audits.
• Schedule & Leave Management: Automated shift rostering, time-off requests, leave balance tracking, and peer-to-peer coworker shift trades with manager sign-off.
• Pay Transparency & Merit Rewards: Accrued earnings statements, statutory PenCom and PAYE tax breakdown visibility, and performance star incentives.
• Offline-First Reliability: Built for intermittent network conditions. Clock-ins and checklist items queue safely on device and synchronize automatically when connectivity resumes.
• Enterprise Compliance: Engineered to support NDPA 2023, NITDA biometric standards, and international data protection standards with zero raw biometric storage.

Built for frontline leaders who need reliability, transparency, and zero context loss.
```

---

## 2. Reviewer Test Credentials (CRITICAL for App Store & Google Play Review)

> [!IMPORTANT]
> Because ShiftRelay requires a corporate Company ID to sign in, you **MUST** provide these demo credentials in the **"App Review Information"** section of App Store Connect and Google Play Console so reviewers can test the app immediately without being blocked.

| Role | Company ID | Email / Username | Password / Action |
|---|---|---|---|
| **Worker / Specialist** | `246701` | `worker@shiftrelay.io` | Tap **"Enterprise Sign In"** or demo login card |
| **Supervisor / Lead** | `246701` | `supervisor@shiftrelay.io` | Reviewer can inspect gate overrides & shifts |
| **HR / Executive** | `246701` | `admin@shiftrelay.io` | Access analytics & workforce roster |

**Reviewer Notes to paste into Store submission:**
```text
ShiftRelay is an enterprise workforce management application. To test the full workflow:
1. Launch the app and tap "Sign In" on the welcome screen.
2. Enter Company ID: 246701
3. Enter Email: worker@shiftrelay.io
4. The test profile will authenticate into the frontline dashboard where you can test the Biometric Clock-In button, schedule roster, shift handover creation, and profile certifications.
5. All financial and bank payouts in demo mode operate in Sandbox Escrow with simulated vouchers.
```

---

## 3. Google Play Data Safety & Apple Privacy Disclosure Matrix

### Google Play Data Safety Form:
- **Location:** Approximate & Precise location collected for App Functionality (Shift clock-in geofence verification). Encrypted in transit.
- **Personal Info:** Name, work email address, and Employee ID for Account Management and Enterprise authentication.
- **Photos & Videos:** Photos collected only when user voluntarily attaches equipment or shift evidence photos to a handover.
- **Audio:** Audio recordings collected only when user chooses to record a voice handover dispatch note.
- **Data Encryption:** Yes, all data is encrypted in transit using standard HTTPS/TLS.
- **Account Deletion:** Supported both in-app (Settings > Account Deletion) and publicly at `https://YOUR_DOMAIN/delete-account.html`.

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

- **Privacy Policy URL:** `https://YOUR_DOMAIN/privacy.html`
- **Terms of Service URL:** `https://YOUR_DOMAIN/terms.html`
- **Account Deletion URL:** `https://YOUR_DOMAIN/delete-account.html`
- **Support Contact Email:** `support@YOUR_DOMAIN`

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
