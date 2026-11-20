# Expo app testing, 19–20 November 2026

The final automated suite passed **113/113 tests**, with zero failures, skipped tests or cancellations. Real catalog and YouTube audio also played through the exported Expo app. YouTube playback, pause, seek and resumed playback were verified with audio-only streams; no video element, YouTube iframe or external popup was created.

The requested target is an **Android APK / development build**. UI tests exercised the Expo SDK 58 app and its playlist API through Chromium at a 390 × 844 viewport. Android and iOS bundle exports passed, but no Android device, emulator or adb was available. Physical background playback, Bluetooth, lock-screen controls and APK installation remain device checks. These source changes have not been deployed or published as an APK/OTA update.

**Final verification**

| Check | Result | Evidence |
| --- | --- | --- |
| Complete automated suite | 113 passed, 0 failed | [TAP log](all-tests-final.log) |
| Android, iOS and web export | Passed | [Export log](final-export.log) |
| Expo Doctor | 20/20 checks passed | [Doctor log](expo-doctor-final.log) |
| Backend lint | 0 errors, 17 warnings | [Lint log](backend-lint-final.log) |
| Mobile lint | 0 errors, 54 warnings | [Lint log](mobile-lint-final.log) |
| Mobile typecheck | Passed | [Typecheck log](typecheck-final.log) |
| Real catalog and YouTube audio | Passed, including progress after seek/resume | [Playback evidence](live-youtube-playback.json), [screenshot](live-youtube-audio.png) |
| Real Gemini fallback | HTTP 200, nonempty answer, 1.9 seconds | [AI evidence](live-ai-fallback.json) |

Lint warnings include unused variables and React hook advisories. Passing exports establish that JavaScript/Hermes bundles can be generated; they do not establish that a signed APK was built or tested on a phone.

The initial repaired baseline passed 71 backend/browser/utility tests and 11 Expo browser tests. The final suite contains:

| Test file | Passed | Coverage |
| --- | ---: | --- |
| `backend.test.js` | 25 | Authentication, OTP/reset, profile, playlists, likes/history, friends/chat, recommendations, AI errors/fallback and provider timeouts |
| `browser.test.js` | 8 | Browser login/signup, search, playlists, audio, logout and artist/favorites |
| `email.test.js` | 2 | Email formatting and mocked provider acceptance/errors |
| `mobile-browser.test.js` | 23 | Expo login/session/logout, search, artist follow, library, friends/chat, AI mixes, lyrics, player controls, YouTube queues and request races |
| `mobile-utils.test.js` | 14 | Native audio patch/configuration, storage, song/queue utilities and app-version helpers |
| `push.test.js` | 7 | Device ownership, queued delivery, receipts, revocation and retries using a mocked push gateway |
| `security.test.js` | 21 | Origin/CSRF checks, token/OTP enforcement, ownership, private responses and revoked sockets |
| `startup.test.js` | 1 | Backend startup without obsolete Firebase credentials |
| `youtube.test.js` | 11 | Audio extraction, format/URL validation, cache/refresh, tickets, Range/HEAD, revocation and durable library references |
| `app-update.test.js` | 1 | Version metadata, download endpoint and unauthorized metadata-update rejection |

**Changes and regressions fixed**

- Added YouTube audio resolution and streaming in [the backend service](../../services/youtube.js) and [routes](../../routes/youtubeRoutes.js). The extractor verifies downloadable HTTPS audio formats, rejects video/manifests, caches descriptors and refreshes denied/expired CDN URLs once. Streams preserve HTTP byte ranges for seeking.
- Connected YouTube results and pasted links to the existing native `expo-audio` playlist in [PlayerContext](../../mobile/src/context/PlayerContext.js). Slow preparation cannot replace a newer selection, and resolution failures display an in-app error.
- Favorites, recent history and playlists store `youtube:<videoId>` references instead of expiring tickets. Replay prepares new links. Sharing uses the public YouTube page URL.
- Catalog results containing a webpage URL now fetch song details before playback. Unsupported URLs are filtered, and queues are deduplicated.
- Search clears stale results when the query/category changes, ignores older responses and provides a working retry after failure.
- Lyrics render when valid provider responses omit a `status` field. Closing/reopening the viewer invalidates earlier requests.
- Playlist rename updates the Expo Router title parameter. Reload, song removal and playlist deletion persist correctly.
- Volume is reapplied when queued tracks change, preserving the selected level across preloaded web media items.
- Ask AI now falls back to configured Gemini when Ollama fails or returns an empty answer. The initial deployed Ask AI probe returned HTTP 500; the fixed local backend returned HTTP 200 against real Gemini.
- Updated setup/deployment documentation and corrected claims about native Google login and DSP EQ. The native app uses email/password login. EQ controls provide suggestions to apply in a device equalizer.

**Real playback evidence**

The live check used the configured external providers and an isolated temporary backend/account:

- Catalog: “Tum Hi Ho” played from `aac.saavncdn.com`, with an approximately 262-second duration and advancing playback.
- YouTube: video `8tagabEHM3g`, a Hindi music mix, played as `audio/mp4`, with an approximately 3,920-second duration.
- Playback advanced past two seconds, was paused, sought to approximately 19 minutes, then continued advancing after resume with future audio data available.
- Both stream requests returned HTTP **206**. The second request used `bytes=18415616-`, establishing that seeking requested a later audio range.
- Video/YouTube iframe count: **0**. External popup count: **0**. Browser page errors: **0**.

An earlier live attempt encountered Googlevideo HTTP 403 despite successful metadata resolution. The extractor now checks format availability before returning playback sources. Later live extraction and playback passed. Availability still needs checking from the deployed backend's outbound IP; this run does not guarantee every restricted/private video can play.

**Test isolation and test corrections**

Automated application data stayed in temporary MongoDB instances with generated test accounts. Email and push delivery used test doubles. Live provider probes read configuration for music/YouTube/Gemini, not the production database. No real friend messages or OTP emails were sent.

Windows-created dependency launchers initially invoked missing `node.exe` on Linux; rebuilding launchers restored the test commands. Temporary Chromium/MongoDB caches were restored after the interrupted session restarted.

The catalog test audio server initially ignored byte-range requests, causing a false seek failure and a return to position zero. Tracing confirmed that the slider correctly requested 3,000 milliseconds. Correct Range responses and a real thumb-drag gesture made the original seek/volume/queue/repeat assertions pass. The earlier failure remains in [the pre-fix log](all-tests-before-slider-fix.log); it is not counted as a final pass. Temporary slider instrumentation was removed and the clean exports were regenerated.

APK-update files and version-helper tests appeared in the workspace during this task. The final run includes those tests; they establish API/helper behavior, not physical APK download/install correctness. Extensive existing workspace changes were preserved, and the two older screenshots overwritten by baseline tests were restored.

**Using the fixes and remaining device checks**

Deploy the backend with Python 3 and Node.js 22+ available, and run `npm run setup:youtube` during its build. The executable lives in ignored `.tools/`; deploying JavaScript alone will not install it. Configure `YOUTUBE_API_KEY` for search. Audio tickets last six hours and are scoped to the video/session; logout and password changes invalidate new requests.

The latest workspace includes new native application/filesystem/installer dependencies, so it requires a new native APK build. Follow [deployment setup](../../DEPLOYMENT.md) and [Android delivery](../../mobile/DELIVERY.md).

On that Android build, verify:

1. Catalog and YouTube playback, seeking, queue transitions and replay from Liked Songs/playlists.
2. Playback with the app backgrounded and screen locked, including multiple automatic track changes.
3. Notification/lock-screen controls, metadata/seekbar updates, Bluetooth controls and interruptions from calls/other audio.
4. Remote push permission/delivery and notification taps on a configured build.
5. APK update metadata matching the actual binary/build code, interrupted downloads, the system installer and playback guards; also verify the OTA update/restart flow.

Reproduce the automated checks from the repository root:

```bash
CI=1 npm --prefix mobile run build:all
MONGOMS_DOWNLOAD_DIR=/tmp/sangeetx-mongodb \
PLAYWRIGHT_BROWSERS_PATH=/tmp/sangeetx-playwright \
TEST_REPORT_DIR=reports/expo-testing-2026-11-19 \
node --test --test-concurrency=1 tests/*.test.js
npm run lint
CI=1 npm --prefix mobile run lint
npm --prefix mobile run typecheck
```

The separate live check is opt-in and uses provider configuration from `.env`: `node reports/expo-testing-2026-11-19/live-youtube-smoke.mjs`. It creates temporary application data and records sanitized playback evidence.
