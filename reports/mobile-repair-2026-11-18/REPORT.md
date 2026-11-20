# Render startup repair and Expo 1.1.1 verification

The supplied Render log fails on old commit `1f33fb3` because
`FIREBASE_PRIVATE_KEY` is undefined when `main.js` calls `.replace()`.
The current backend no longer imports or initializes Firebase Admin. Its
dependency and transitive packages have been removed from the production lockfile,
and obsolete Firebase variables have been removed from `.env.example`.

Mobile authentication uses email verification, passwords and the backend JWT.
The unused mobile Firebase-token login method has been removed. The legacy
backend token-exchange endpoint rejects requests unless an explicit verifier is
injected; browser Google OAuth remains available with its existing configuration.
Android notifications still require the Firebase Android client configuration
and FCM credentials stored in Expo. These are independent of Render's obsolete
Firebase Admin private key.

## Mobile changes

- Updated Expo to `~58.0.26` and Expo Router to `~58.0.32` using Expo's SDK installer.
- Shared favorites between the mini/full players, using the server's `liked`
  result, with concurrent toggle protection and cancellation of stale lookups.
- Full-player Save, Friend, Lyrics and EQ actions dismiss the player before
  opening the next dialog. Instant dismissal avoids overlapping presentations.
- Song sharing waits for server acknowledgement and displays a failure when
  the request is rejected or times out.
- Artist Follow reads the saved profile, survives reload, and uses an
  authenticated atomic removal endpoint to persist Unfollow.
- Added web implementations of native alert/confirmation callbacks, including
  signup/reset feedback, playlist deletion and logout.
- Invalid server-address input now shows an error instead of rejecting an
  uncaught promise. Added accessible labels to key actions.
- Release version is 1.1.1. Existing playback, push and OTA implementations are
  retained; this release requires a new APK because SDK dependencies changed.

## Verification

| Check | Result |
| --- | --- |
| Backend, web browser, email, mobile utility, security and push checks | 70 passed |
| Final Expo browser integration suite | 11 passed |
| Real `node main.js` startup with absent and invalid obsolete Firebase keys | Passed |
| Total automated tests | 82 passed |
| Backend and mobile lint | No errors; advisory warnings remain |
| Mobile JavaScript typecheck | Passed |
| Expo dependency compatibility | Up to date |
| Expo Doctor | 20/20 passed |
| Final Android/iOS/web JavaScript export | Passed |
| Production dependency/lockfile agreement and Firebase Admin removal | Passed |
| Production dependency security audit | 0 known vulnerabilities |
| Diff whitespace check | Passed |

The mobile integration suite covers login, cached-session recovery, verified
signup, password reset and revocation, artist/album navigation, persisted artist
follow/unfollow, search, five-track
automatic playback and media metadata, synchronized likes, playlist creation and
song saving, friend acceptance, acknowledged chat and two-account song sharing,
AI mix generation/saving and AI chat, and logout that stops playback and revokes
the token. It runs the actual app and backend against an isolated MongoDB; music,
email and AI providers use controlled fixtures. It sends no real verification
emails or user messages.

## Deployment and device acceptance

Source changes are in the local workspace. No Git commit/push or Render
production deployment was performed. The live `/health` endpoint returned HTTP
200 and `database: connected` on 2026-11-18; its older response format does not
confirm that these changes are deployed. Deploy the changed backend and lockfile to
the existing Render service from its connected branch, use `npm ci --omit=dev`
and `npm start`, then verify `/health` reports `database: connected`.
Remove obsolete `FIREBASE_*` values from Render; do not remove Expo's FCM client
configuration or push credentials. Preserve the existing database and JWT secret.

Browser tests and a signed APK do not certify physical Android lock-screen
controls, battery restrictions, FCM delivery or native OTA reload. Run the phone
acceptance checks in [mobile/DELIVERY.md](../../mobile/DELIVERY.md).
AI EQ currently provides suggested settings; native DSP is not implemented.

Signed build and APK verification details are recorded in the delivery guide and
the adjacent `apk-verification.json` once the cloud build completes.
