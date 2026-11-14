# Android preview verification

The signed SangeetX 1.0.0 Android APK was built successfully using Expo Build.
It embeds `https://sangeetx.online`, the user's existing Render backend.

- [Download APK](https://expo.dev/artifacts/eas/80DEBqF7-PARiG7T_C6S3MzYXSh-WO6TebXDjgmlPDo.apk)
- [Build details](https://expo.dev/accounts/rohit_8577/projects/sangeetx/builds/20c6acd9-722b-4cd1-9097-eec2840d2f37)
- Local APK: `mobile/artifacts/SangeetX-preview-1.0.0.apk`
- Android package: `com.rohit8577.sangeetx`; version code: `1`.
- Size: 96,402,057 bytes.
- SHA-256: `ae3d7dbe6647056f4fbd4d10bb4080808eaf09c2ed1f3f953941daf93e3db78d`.

The APK contains its Android manifest, bundled Hermes application, online
backend URL, APK signing block, and native libraries for arm64-v8a,
armeabi-v7a, x86, and x86_64. It does not need Expo Go or Metro to run.

Verification completed:

- Android release bundle export and cloud native APK build passed.
- Mobile lint passed with no errors; existing warnings remain.
- Mobile typecheck passed.
- All five existing mobile utility tests passed.
- The cloud-build archive excluded local environment files, credentials,
  dependencies, and generated output.
- Live HTTPS `/health` reported `database: connected` after the Render cold start.
- Live song search returned `Success` with ten results.
- The unauthenticated profile endpoint rejected access as expected.

The existing Render deployment was verified and used; a new backend deployment
was not triggered. Physical-device installation and authenticated login were
not performed remotely. Expo's build metadata lists expiry on November 27,
2026; the downloaded local APK is retained separately.

See [deployment and installation guide](../../DEPLOYMENT.md).
