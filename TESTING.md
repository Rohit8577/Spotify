# Running SangeetX checks

Use Node.js 22 or later. Install dependencies in both directories:

```sh
npm install
npm --prefix mobile install
npx playwright install chromium
```

```sh
npm test                         # Backend, web browser, email and mobile utility tests
npm run test:security            # Security regressions against an isolated local database
npm run test:all                 # Also builds and tests the Expo web application
npm run lint
npm --prefix mobile run lint
npm --prefix mobile run typecheck
npm --prefix mobile run build:all
cd mobile
npx expo-doctor
```

Tests start a temporary MongoDB instance and never load `.env`. The first run downloads a MongoDB binary. Browser tests mock music/AI providers and use a generated PCM audio clip. No real OTP emails are sent by the automated tests. Expo web tests exercise the mobile JavaScript/UI; device audio focus, notifications and background playback still need physical-device verification.

The first full testing report is in [reports/deep-testing-2026-11-13/REPORT.md](reports/deep-testing-2026-11-13/REPORT.md).
The dedicated security review is in [reports/security-testing-2026-11-13/REPORT.md](reports/security-testing-2026-11-13/REPORT.md).

## Resend OTP configuration

Set `RESEND_API_KEY` and `RESEND_FROM="SangeetX <no-reply@sangeetx.online>"` in `.env`. The domain must be verified in the Resend account that owns the key. A sending-only API key is sufficient for OTP delivery. Restart the backend after configuration changes.

To send one real test email through the same service used by signup/password reset:

```sh
npm run email:start -- recipient@example.com
```

An accepted email ID confirms Resend accepted the send. Inbox delivery must be checked by the recipient or through Resend delivery logs; sending-only keys cannot read those logs.

OTP clients must now:

1. `POST /send-otp` with `{ email, purpose: "signup" | "reset" }`.
2. `POST /verify-otp` with `{ email, otp, purpose }`.
3. Include the returned `verificationToken` in `/signup` or `/updtpass`.

The server never returns the OTP in its API response. Codes expire after five minutes, allow five attempts, and can be resent after one minute. Verified proofs are single-use and expire after ten minutes. Password resets revoke older JWT sessions. Existing plaintext-password accounts migrate to salted scrypt hashes after their next successful login.

For mobile devices set the backend URL in the login settings, or configure `EXPO_PUBLIC_API_URL`. Android emulator defaults to `http://10.0.2.2:5000`; a physical phone needs a reachable LAN or HTTPS server address. Switching servers clears the old session.

## Browser origins and sessions

Same-origin web requests and native bearer-token clients work by default. For a separately hosted Expo web frontend, add its exact origin to `TRUSTED_ORIGINS`, for example `http://localhost:8081,https://app.sangeetx.online`. Do not include paths, wildcards or trailing slashes. This allowlist also applies to Socket.IO upgrades. Restart after changing environment settings. When using an HTTPS reverse proxy, configure `TRUST_PROXY` to the actual trusted hop count and prevent direct access that bypasses those proxies.

Logout uses `POST /logout`; GET no longer changes a session. Online logout revokes the presented JWT, while other independently issued logins remain valid. Password changes revoke all prior tokens. Revocation digests are stored in MongoDB until token expiry; private socket delivery rechecks recipients so revoked sessions cannot keep listening. Dynamic responses use `Cache-Control: no-store`.

Android/iOS store tokens using Expo SecureStore and migrate the old AsyncStorage token on first read. Web keeps its existing browser storage. The SecureStore config plugin configures Android backup exclusions. Rebuild the native application to include the new native module; export success alone does not install it on a device. If logout is performed offline, it clears the local credentials but cannot guarantee server-side revocation.
