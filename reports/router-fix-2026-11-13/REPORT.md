# Expo Router Android resolution repair

The running Metro process started before the installed Expo Router files were updated. `node_modules/expo-router/build/utils/splash.js` existed and Node resolved it, but the old Metro file map reported it missing.

Reproduced the exact error by requesting the Android development bundle from the existing server on port 8081: HTTP 500. Stopped that project's stale Expo process and restarted it with `expo start --clear --port 8081 --lan`.

The same Android development bundle request then returned **HTTP 200**, included the splash module, and Metro reported **Android Bundled — 1473 modules**. No dependency version changes or edits to package internals were required.

Also requested the exact Android launch URL returned by Expo's manifest, including Hermes and lazy-bundling parameters: **HTTP 200**, 1473 modules. See [android-launch.json](android-launch.json). The restarted server remains available on port 8081.

Mobile typecheck passed. Mobile lint passed with 0 errors and the existing 57 advisory warnings. This verifies bundling; a physical-device launch was not performed.

Evidence: [before.json](before.json), [after.json](after.json), [Metro output](metro.log), [lint](lint.log), [typecheck](typecheck.log).

For future dependency updates, stop Expo first, then restart using `npm run start:clear` from `mobile`, or `npm run mobile:clear` from the repository root. The troubleshooting instructions were also added to `mobile/README.md`.
