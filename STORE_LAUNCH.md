# ShiftRelay OS Store Launch

## What is ready in this repository

- Production domains standardized on `https://shiftrelayos.com` (Website), `https://app.shiftrelayos.com` (Mobile App & API), and `https://admin.shiftrelayos.com` (Executive / Tenant Admin Console), with Bundle/Package ID `com.shiftrelayos.app`.
- Installable web application with manifest and service worker.
- Responsive workforce portal, account sign-in with employer provisioning guidance, and role permissions.
- Organisation onboarding with configurable Attendance & Grace Policy, worker approval, shift handovers, automated clock-in reminders, attendance exceptions, schedule, and payroll sync.
- Server-side AI and transcription integration; browser clients never receive the API key.
- Language preference for English, Hausa, Yoruba, Igbo, French, Spanish, Portuguese, Dutch, German, Chinese, Japanese, and Arabic.
- Capacitor configuration for Android and iOS packaging (`com.shiftrelayos.app` / `ShiftRelay OS`).

## Before creating store binaries

1. Verify `https://shiftrelayos.com`, `https://app.shiftrelayos.com`, and `https://admin.shiftrelayos.com` HTTPS DNS + SSL are live; do not package `localhost`.
2. Verify public links: `https://shiftrelayos.com/privacy.html`, `https://shiftrelayos.com/terms.html`, `https://shiftrelayos.com/support-security.html`, and `https://shiftrelayos.com/delete-account.html`, plus support inbox `support@shiftrelayos.com`.
3. Implement completed account deletion and a retention policy before public store submission.
4. Provide closed B2B demo reviewer credentials (see [`STORE_LISTING.md`](file:///c:/Users/DATA%20ENG.%20OLA/Documents/openAI%20build week/STORE_LISTING.md)) so reviewers do not hit a dead end at employer-provisioned sign-in.
5. Prepare 1024x1024 app icon, Android adaptive icon, screenshots, store description, support email, and privacy-policy URL.

## Capacitor commands

After Capacitor dependencies are installed:

```bash
npm run cap:sync
npx cap open android
npx cap open ios
```

Build Android in Android Studio and upload an Android App Bundle (`.aab`) to Play Console. Build iOS in Xcode on a Mac, archive it, then upload through Xcode or Transporter to App Store Connect.

## Store compliance

- Apple requires apps that create accounts to let users initiate account deletion in the app. [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app)
- Google Play requires an in-app deletion path and a public web deletion-request link, plus Data Safety disclosures. [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en-EN)
- Complete Google Play's Data Safety form accurately for accounts, profile photo, work email, shift data, voice recordings/transcripts, and any AI processing. [Google Data Safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)

## Suggested release order

1. Private Android internal test.
2. Closed beta with two real organisations.
3. Fix onboarding, notification, and handover issues.
4. iOS TestFlight beta.
5. Public Play Store and App Store launch only after privacy, support, deletion, and payments are live.
