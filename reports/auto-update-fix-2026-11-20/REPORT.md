Automatic update delivery is configured in the latest signed APK and a compatible update is now published. The APK's actual Android update headers received HTTP 200, and the downloaded 3,619,908-byte bundle matched both the manifest SHA-256 and the tested Android export. No additional APK is needed for this update.

The previous channel contained only an update for runtime `4bf4e3b5d35f51a0b89f61ad338edd0bd784557c`; the current APK uses `e56800ab3d44334ef043b0055f7fb818e4eeef27`. Before publication, a request using the current APK's headers returned HTTP 204 with `NO_UPDATE_AVAILABLE`. The published update now matches the installed runtime.

The fixes preserve downloaded OTA readiness before the native hook catches up, keep the Restart action current, validate the SDK fetch result, and share concurrent requests. Downloads can continue while music plays; applying an update checks current playback first. Lifecycle checks keep one timer and run at launch, foreground entry and five-minute intervals while active.

Native APK cache entries now include the Android build code and source URL. A completion marker is written only after a successful HTTP response, byte-count and file-signature checks. Partial files and an older build with the same version number cannot be treated as installable updates, and completed downloads are reused.

| Verification | Result | Evidence |
| --- | --- | --- |
| Update and utility tests | 24 passed, 0 failed | [Unit log](unit-tests.log) |
| Mobile browser regression suite | 25 passed, 0 failed | [Browser log](browser-tests.log) |
| Mobile lint | 0 errors, 53 existing warnings | [Lint log](mobile-lint.log) |
| Mobile typecheck | Passed | `npm --prefix mobile run typecheck` |
| Android, iOS and web export | Passed | [Export log](all-platform-export.log) |
| Installed APK update configuration | Enabled; preview channel; checks on launch | [APK configuration](apk-update-config.json) |
| Native compatibility | Generated fingerprint exactly matches the installed APK | [Fingerprint check](runtime-verification.json) |
| Published update and download integrity | HTTP 200; runtime and bundle SHA-256 match | [Live verification](ota-verification.json) |

[Published OTA group](https://expo.dev/accounts/rohit_8577/projects/sangeetx/updates/05618ea7-7b3b-401f-9370-ab8d6cc86cc0), update ID `01a1fa45-9575-7914-8a73-683ea649b424`. Open the installed versionCode 9 app to download the update, then use the update banner's Restart action after pausing music; a cold launch also loads a downloaded bundle automatically. Native library, SDK and permission changes require a new APK with current release metadata.

GitHub publication automation needs setup: `ENABLE_MOBILE_OTA`, `EXPO_TOKEN` and `GOOGLE_SERVICES_JSON` are absent. Local authenticated EAS publication works. The backend's native-release endpoint currently advertises version 1.1.0, build 5; native release metadata must be advanced when announcing a newer APK.

The checks used mocked native APIs, Chromium, the signed APK's configuration and live Expo delivery. No physical Android download/restart run was performed.
