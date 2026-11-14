# SangeetX security review — 13 November 2026

Completed a local source review, adversarial HTTP/Socket.IO tests, Chromium web regressions, Expo web regressions, native bundle exports and dependency checks. Final result: **61 tests passed, 0 failed**, including **21 dedicated security tests**. Changes are in the workspace; they have not been deployed.

Tests used a temporary MongoDB database, synthetic accounts, mocked email/music/AI providers and local servers. No production user data was changed, no additional real OTP email was sent, and no attack traffic was sent to a deployed application.

## Findings and fixes

Severity describes the demonstrated behavior and its prerequisites, not a formal CVSS assessment.

| Finding | Risk / evidence | Fix |
| --- | --- | --- |
| Missing HTTP and WebSocket browser-origin checks | Medium. A profile POST and WebSocket upgrade from an untrusted Origin were accepted when supplied a valid cookie. Cookie eligibility is a prerequisite: modern SameSite=Lax blocks many ordinary cross-site POST scenarios; same-site untrusted origins still matter. These tests do not demonstrate a SameSite bypass. | Exact same-origin/allowlist checks for HTTP and socket handshakes; fetch-metadata/Referer checks for unsafe requests; originless cookie/form writes restricted. Native bearer clients remain supported. |
| Revoked sockets continued receiving private events | High when an old/stolen session remains connected. After changing the recipient's password, its existing socket stayed in the private room. Authentication was checked only on inbound events. | Revalidate every recipient before chat, song-share and listening-activity delivery; disconnect revoked/expired sessions before emitting. |
| Logout left a reusable JWT | Medium. Baseline GET logout returned 302, then replaying that same JWT returned 200 from `/userprofile`. | POST-only logout stores a token digest with expiry in MongoDB. Fresh logins have unique JWT IDs. The revoked token returns 401; separate logins remain valid. Web and mobile call the new logout endpoint. |
| Browser Google account linking ignored email verification | Conditional account-linking risk found in source. Existing accounts were selected by the returned email without checking its verification flag. | Require an explicitly verified email before lookup/upsert. Regression tests reject unverified profiles and invalid token verification, and allow a verified profile for the correct account. Live Google OAuth was not exercised. |
| Native tokens used unencrypted AsyncStorage | Medium under local-storage/backup access. Confirmed in source; no physical-device extraction was attempted. | Expo SecureStore for Android/iOS, migration that removes the old plaintext copy after a successful encrypted write, logout cleanup, and Android backup plugin. Failure tests prohibit plaintext fallback for new tokens. |
| Password-change guessing and concurrent updates | Medium hardening. The profile route had no dedicated current-password attempt budget and updated after checking a potentially stale password. | Ten password-change attempts per account/minute; validate lengths before hashing; atomically match the current password and token version before update. Simultaneous changes cannot overwrite one another. |
| Provider configuration exposed by `/url` | Low. The endpoint published the configured provider URL, potentially including credentials if an operator embedded them there. No real secret leak was demonstrated. | Remove the endpoint; route remaining artist/favorite lookups through the backend. Browser regression tests cover both flows. |
| Missing response protections | Low hardening. Private/token responses lacked explicit no-store and framing policies. | Dynamic responses use no-store; add nosniff, frame denial, restricted form/base/object CSP directives and referrer policy. Production HTTPS adds HSTS and Secure cookies. |

Also fixed a functional bug uncovered by the new Google-login test: Firebase Admin 14 no longer exposes the old `admin.apps` namespace used here. The endpoint returned 500; it now uses modular `getApps()`/`getAuth()`, and startup uses modular `initializeApp()`/`cert()`.

Additional improvements: invalid OTP proofs are rejected before password hashing; rate-limit maps are separated per Express app, capped in size and cleaned periodically instead of scanned on every request; `.env.*` is ignored while `.env.example` remains reviewable.

## Verification

| Check | Result |
| --- | --- |
| Dedicated security tests | 21 passed |
| Backend regressions | 22 passed |
| Chromium web tests | 8 passed |
| Expo web tests | 3 passed |
| Mobile utility/storage tests | 5 passed |
| Email service tests | 2 passed |
| Root / mobile dependency audit | 0 known vulnerabilities in each |
| Root / mobile lint | 0 errors; 17 / 57 existing advisory warnings |
| Mobile TypeScript check | Passed |
| Expo Doctor | 20/20 passed |
| Android, iOS and Web JS exports | Passed; not native installation/device verification |
| Current source secret-pattern scan | 122 text files checked; no pattern matches or tracked sensitive filenames in either repository |

Security cases cover JWT expiry/signature/algorithm tampering, cookie/bearer precedence, login CSRF, origin allowlists and preflights, proxy/HTTPS behavior, logout replay, OTP resend/guess/verify/reset concurrency, proof expiry/email/purpose binding, account mass assignment, playlist/chat IDOR, query/prototype injection, oversized requests, provider URL confinement, config-file/traversal probes and private socket delivery. Existing browser tests also cover script injection in remote song metadata and stored playlist names.

Evidence:

- [Initial failing reproductions](baseline.log) and [GET logout replay](logout-baseline.log).
- [Final complete test run](all-tests-final.log).
- [Root audit](audit.json), [mobile audit](mobile-audit.json) and [redacted secret scan](secret-scan.json).
- [Mobile exports](mobile-build.log), [Expo Doctor](expo-doctor.log), [typecheck](mobile-typecheck.log), [root lint](lint.log) and [mobile lint](mobile-lint.log).
- `focused-tests.log` preserves the intermediate Google-login failure that prompted the Firebase compatibility repair; use `all-tests-final.log` for final status.

## Deployment and remaining limits

Set `TRUSTED_ORIGINS` only for separately hosted browser frontends, using exact scheme/host/port values without trailing slashes. Same-origin web and native clients need no extra entry. Set `TRUST_PROXY` to the actual trusted proxy hop count and restrict paths that bypass that proxy. Restart the backend to load changes. Rebuild/install native apps to include SecureStore; the completed exports do not install a new native module on existing devices.

The review does not establish that the application is free of all vulnerabilities. Specifically:

- No production infrastructure, TLS/DNS configuration, physical devices, real Google OAuth/Firebase login, distributed load or penetration test of deployed hosts was exercised.
- Rate limits remain process-local. Multiple backend instances need shared enforcement or an edge limit; distributed OTP/password guessing and email abuse need deployment-level monitoring and limits. OTP remains four digits with five attempts and a one-minute resend cooldown.
- Offline mobile logout clears local credentials but cannot guarantee server revocation. Expo web retains browser storage; native SecureStore migration is covered with mocked storage plus bundle/type checks, not physical-device keychain testing.
- The CSP deliberately covers framing/base/object/forms; it is not a strict script-source CSP. Existing inline scripts and third-party assets need a separate nonce/source-policy migration.
- Legacy plaintext password records from older releases migrate on successful login. Production records were not bulk-rewritten in this test pass.
- The secret scan covers current nonignored source and tracked sensitive filenames, not Git history, ignored local credentials, deployed bundles or every possible secret format.

Run `npm run test:security` for the dedicated suite, or `npm run test:all` for the full build-and-test workflow. See [TESTING.md](../../TESTING.md) for configuration and session behavior.
