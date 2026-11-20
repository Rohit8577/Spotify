# Mobile delivery verification — 2026-11-14

## Implemented

- Expo SDK 58 native playlist; one media service across queue transitions;
  next/previous, seeking, elapsed/duration metadata and artwork.
- Native repeat, upcoming-track shuffle, recommendation prefetch and bounded
  stream-error skipping/retry. ExoPlayer CPU/Wi-Fi wake locks during playback.
- Artwork-derived full/mini-player colors and blurred player background.
- Fingerprint-protected EAS OTA on preview/production channels. Checks at launch,
  foreground and five-minute intervals; downloaded updates do not interrupt audio.
- Push registration, permission/settings UI, notification tap routing, chat/song/
  friend-request notifications, durable retry and receipt processing. Device
  ownership, session revocation, expiry and account switching are checked.
- GitHub mobile validation, Android build and OTA workflows. Publishing/building
  depends on validation; production publication is manual.

## Verification

| Check | Result |
| --- | --- |
| Backend, browser, email, mobile utilities, security and push suite | 69 passed |
| Mobile browser integration suite | 4 passed |
| Five-track automatic queue progression and media metadata | Passed in browser implementation of Expo playlist API |
| Mobile typecheck | Passed |
| Mobile + backend lint | No errors; existing/advisory warnings remain |
| SDK dependencies / Expo Doctor | Compatible; 20/20 checks passed |
| Android/iOS/web JS export | Passed |
| Generated Android manifest | mediaPlayback foreground service, POST_NOTIFICATIONS and WAKE_LOCK present; no RECORD_AUDIO |
| EAS upload archive | 166 files; no .firebase, service-account keys, .env or node_modules |
| Published OTA manifest | HTTP 200, expected update ID/runtime, pushConfigured=true |
| Cloud Android release build | Finished successfully, versionCode 5 |
| Downloaded APK | ZIP integrity passed; Firebase project resources present; no private credential filenames |
| Embedded native runtime | `assets/fingerprint` exactly matches the published OTA runtime |

The private `.firebase` files are gitignored and excluded by the repository-root
`.easignore`. The build receives only the Firebase Android client configuration
through EAS file variables. The service-account key is stored in Expo's FCM v1
credential service, not the APK or OTA assets.

## Expo configuration and delivery

- Firebase project: `sangeetx-5552b`.
- Android package: `com.rohit8577.sangeetx`.
- FCM v1 service-account credential assigned successfully on Expo.
- `GOOGLE_SERVICES_JSON` file variable created in preview and production.
- Preview OTA published: [update group 25cd16e5](https://expo.dev/accounts/rohit_8577/projects/sangeetx/updates/25cd16e5-a01d-4be0-a0a3-d2f8b79ce400).
- Android update ID: `01a1d7fe-701a-7d31-bc76-437330ea07b1`.
- Runtime: `4bf4e3b5d35f51a0b89f61ad338edd0bd784557c`.
- Final APK build: [e1c84fb2](https://expo.dev/accounts/rohit_8577/projects/sangeetx/builds/e1c84fb2-1821-43ba-9f21-8978d3c26536), app version 1.1.0, Android versionCode 5.
- [Download the signed APK](https://expo.dev/artifacts/eas/JuirtOASe3xwS4GwGbI1Bp4RbzLWxpbkQ_DKhnvdoG4.apk), 97,732,043 bytes.
- Local APK: `mobile/artifacts/SangeetX-preview-1.1.0.apk`.
- Hash and binary inspection: [apk-verification.json](apk-verification.json).

## Remaining rollout checks

- Add repository Actions secrets `EXPO_TOKEN` and `GOOGLE_SERVICES_JSON` (Android
  client file contents). EAS CLI does not download file variable contents into
  CI for computing local OTA fingerprints, so the second secret is required.
- Push the code and deploy/restart the backend before testing real push delivery.
  No source commit/push or production backend deployment was performed here.
- Install the new APK once; the old 1.0.0 APK does not contain the OTA client.
- On a physical Android phone, allow notifications, verify a locked-screen queue
  of ten tracks, seek/timers/artwork, headphone/call interruption, and OTA download
  during playback followed by a paused restart. Browser tests do not validate
  Android battery policy, lock-screen rendering, FCM delivery or native reload.

Full setup and test instructions: [mobile/DELIVERY.md](../../mobile/DELIVERY.md).
