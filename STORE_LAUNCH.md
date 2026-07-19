# ShiftRelay Store Launch

## What is ready in this repository

- Installable web application with manifest and service worker.
- Responsive workforce portal, account sign-in, and role permissions.
- Organisation onboarding, worker approval, shift handovers, schedule, attendance, and notifications.
- Server-side AI and transcription integration; browser clients never receive the API key.
- Language preference for English, French, Spanish, Portuguese, Dutch, German, Chinese, Japanese, and Arabic.
- Capacitor configuration for Android and iOS packaging.

## Before creating store binaries

1. Deploy the app to a stable HTTPS domain; do not package `localhost`.
2. Create public `Privacy Policy`, `Terms of Service`, support, and account-deletion pages on that domain.
3. Implement completed account deletion and a retention policy before public store submission.
4. Replace demo roles/data with production accounts and test the real sign-in journey.
5. Prepare 1024×1024 app icon, Android adaptive icon, screenshots, store description, support email, and privacy-policy URL.

## Capacitor commands

After Capacitor dependencies are installed:

```bash
npx cap add android
npx cap add ios
npx cap sync
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
