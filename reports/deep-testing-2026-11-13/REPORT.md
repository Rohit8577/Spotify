# SangeetX deep testing — 13 November 2026

## Result

**35 automated tests passed, 0 failed.** Backend, EJS web UI and Expo mobile web were exercised using temporary MongoDB databases, real HTTP/Socket.IO connections, Chromium and generated audio. Production accounts/playlists were not modified by testing.

| Check | Result |
| --- | --- |
| Backend/auth/library/social/provider regressions | 22 passed |
| Desktop/mobile web browser flows, XSS and audio playback | 6 passed |
| Resend email service regressions | 2 passed |
| Expo mobile web login, playback, navigation and expired session | 3 passed |
| Mobile normalization/queue regressions | 2 passed |
| Backend dependency audit | 0 vulnerabilities; initially 38 |
| Mobile dependency audit | 0 vulnerabilities |
| Expo Doctor | 20/20 checks passed |
| Expo Android, iOS and web exports | Successful |
| Mobile JavaScript type-check | Passed with `checkJs: true` |
| Backend/web lint | 0 errors, 17 warnings |
| Mobile lint | 0 errors, 57 warnings |
| Configured live music provider | Search and home both HTTP 200 |

## Fixed bugs

- Password reset previously accepted any email/new password without proof of ownership. Signup verification could also be bypassed, and `/send-otp` returned the code in JSON. Added server-side OTP verification, expiry, attempt limits, resend cooldown and single-use proofs. Updated both web and mobile clients.
- Passwords were stored in plain text. New passwords use salted scrypt; successful legacy logins migrate existing passwords. Reset/change increments a token version, invalidating previous sessions. OAuth-only accounts reject omitted passwords.
- Auth input validation blocks object/query injection. Bearer tokens take precedence over stale cookies. Query-string authentication was removed. Sessions now use 30-day JWTs and SameSite cookies.
- Express 4 async handler failures could escape normal error handling. Added centralized async/error handling, body limits, startup validation, configurable port, optional Google/Firebase setup and truthful database health status.
- Playlist create/add/rename/delete and favorites had duplicate or lost-update races. Replaced document-wide writes with atomic database updates, validated payloads and bounded imports. Missing playlists now return useful errors.
- Online playlist import and playback depended on a missing `/playlistData` route. Added the route and an atomic import endpoint; removed hardcoded alternate-provider song requests.
- Playlist creation depended on an external Unsplash request and a client-side key. It now uses a local default cover and works when external image services are unavailable.
- Recently played could mishandle dollar-prefixed metadata and concurrent updates. It now stores literal values, deduplicates atomically and retains 20 songs. Interaction history uses the correct index and retains the newest 50 records.
- Search query parameters were not consistently encoded and provider errors could appear as success or hang indefinitely. Added validation, encoding, status handling and timeouts.
- Song/playlist metadata could execute scripts through `innerHTML`. Dynamic markup now passes through DOMPurify, search suggestions use text nodes, and alerts render plain text. Browser tests reproduced and then verified fixes for these injection cases.
- Corrupt local storage could prevent the whole web app from starting. Saved arrays now parse defensively. Independent debounced handlers no longer share one timer; inline search aborts stale requests.
- Chat trusted client-supplied identities and mixed MongoDB IDs with emails. Sockets now authenticate with JWTs, authorize friend operations, validate/rate-limit payloads and use canonical email delivery rooms. Activity broadcasts are restricted to friends.
- Friend requests did not reach recipients, web friendship routes were missing, and there was no usable acceptance flow. Added reciprocal request/accept/reject APIs and client controls. Chat history is bounded to 100 messages and supports a cursor.
- Mobile chat inserted optimistic messages and then inserted server echoes again. It now displays the server-confirmed message once and preserves failed message input.
- Profile edits were simulated and not saved. They now persist through an authenticated endpoint; password changes require the current password.
- Mobile used obsolete `expo-av` with SDK 58. Migrated to supported `expo-audio`, disposed old players/listeners, ignored obsolete loads, kept playback callbacks synchronized with queue/repeat state, and fixed queue selection/shuffle behavior.
- Mobile normalization could send a catalog webpage to the audio decoder, pass image arrays as image URIs and lose AI artwork. Normalized fields now select actual audio/image links. YouTube results open the video instead of passing its webpage to the audio player.
- Mobile navigation stored screen names without their parameters. Migrated to Expo Router so back navigation preserves artist/album parameters and expired sessions return to login.
- Mobile auth could remain signed in with an expired token or send the old token to a newly selected server. Invalid sessions now clear, server switches log out, and request authentication uses an in-memory token instead of reading AsyncStorage on every request.
- Expo config used the removed `splash` field and lacked native peers. Added the supported splash plugin, explicit audio/font/assets dependencies and background playback configuration.

## Performance changes

- Replaced sequential recommendation searches and per-track sleeps with a worker pool capped at four requests. Deduplicate keywords/results and exclude skipped songs from fallback results too.
- Coalesce concurrent recommendation requests per user and cache results for one minute, with a bounded cache size. Regression tests verify repeat refreshes avoid extra provider calls.
- Query friend activity in batches instead of one interaction query per friend.
- Bound recent listening history, interaction retention, chat responses and playlist imports.
- Abort obsolete inline searches, debounce typing and reject stale mobile search responses.
- Show mobile home content as soon as catalog data is ready, without waiting for AI recommendations.

## Resend verification

- Sender: **SangeetX <no-reply@sangeetx.online>**.
- Existing `.env` already contained the requested sender and a Resend sending key; neither secret was printed or changed.
- Signup/reset and `npm run email:start -- <recipient>` share `services/email.js` and the same branded HTML/plain-text template.
- Sent exactly one real test OTP to **bindrohit98@gmail.com**.
- Resend accepted email ID **01a1d2d6-0c51-7d01-9283-dd453e3141b9**.
- **The user confirmed it arrived in the inbox.**
- The configured sending-only key cannot list domains or retrieve delivery events. Inbox receipt was confirmed directly by the user.

## Scope and remaining limits

- Android/iOS JavaScript bundles were built, but no physical device or native emulator run was performed. Verify lock-screen controls, background audio, interruption handling and device navigation on hardware before release.
- The mobile equalizer previously changed only UI state; there was no audio DSP implementation. The UI now explicitly labels it as equalizer suggestions to apply in the device equalizer. Native DSP remains unimplemented.
- External music search/home and one real Resend send were checked live. Google sign-in, YouTube playback and live AI generations were not end-to-end verified against real accounts/services; automated provider tests cover controlled success/failure cases.
- Lint warnings remain, including legacy unused declarations and React dependency/compiler advisories. Compiler diagnostics for synchronous loading state and handler timestamps are warnings; hook ordering and JavaScript correctness rules remain errors.
- OTP records are shared in MongoDB, but request rate limits and OAuth temporary sessions are process-local. A multi-instance production deployment needs shared session/rate-limit storage.
- Tests cover the scenarios above; they do not establish that every possible defect is eliminated. Changes are local and have not been deployed.

## Evidence and rerunning

- [Complete test output](all-tests-final.log)
- [Backend dependency audit](audit-final.json)
- [Mobile dependency audit](mobile-audit-final.json)
- [Expo Doctor output](expo-doctor.txt)
- [Expo platform export output](mobile-build.log)
- [Desktop web screenshot](web-1365.png), [mobile web screenshot](web-390.png), [Expo mobile UI screenshot](expo-mobile-home.png)
- [Commands and OTP integration contract](../../TESTING.md)

Run `npm run test:all` after installing root/mobile dependencies and the Playwright Chromium browser. Automated tests do not send real emails.
