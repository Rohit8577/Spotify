# Android playback, push notifications and OTA

## Install once, then send code updates

[Download SangeetX 1.1.1 APK with the icon fix](https://expo.dev/artifacts/eas/mWStJC053vLnkMJDDanYwtx3tZHbNu4vfvsm-4GuFes.apk)
(Android versionCode 9, approximately 98 MB). A local copy is available at
`mobile/artifacts/SangeetX-preview-1.1.1-icons-fixed.apk` from the repository root.
This build embeds the `ionicons` font so icons are available at startup. Its
native font bytes and signing certificate were verified; install it over the
previous APK to receive the native font setup.

The old 1.0.0 APK has no OTA client. Install a new **preview** APK once:

```sh
cd mobile
npm ci
npm run build:preview
```

Use the existing Expo Android signing key to update the installed app. The
preview profile creates an APK on the `preview` update channel. Production
creates a Play Store AAB on `production`. EAS manages Android version codes.

Publish JavaScript/assets for the installed preview APK:

```sh
npm run update:preview -- --message "Describe the change"
```

The 20 November update fixes OTA restart readiness and APK download caching. It
is published for versionCode 9's native runtime and was downloaded and checked
against the tested Android bundle. This code update requires no new APK; open
the app to download it, then restart after the update is ready. The existing
APK applies a downloaded OTA automatically on its next cold launch.

The app checks at launch, when returning to the foreground, and every five
minutes while open. Profile → **Check for updates** checks immediately. Updates
download while music plays. The banner lets you restart after pausing; downloads
never force a restart mid-song. A cold launch also loads a previously downloaded
update. This is a JS runtime restart, not a replacement of executing code in
memory. Metro Fast Refresh during development remains available with `npm start`.

`runtimeVersion: { policy: "fingerprint" }` prevents incompatible native updates.
Adding native libraries, changing Firebase configuration, permissions, SDK or
the native audio patch requires a new APK. Backend changes require server
deployment and are not included in mobile OTA. Preview and production must use
the same API URL and Firebase configuration for their builds and updates.

## GitHub Actions

Repository: https://github.com/Rohit8577/Spotify

1. Create an Expo access token at https://expo.dev/settings/access-tokens and
   save it as the repository Actions secret **EXPO_TOKEN**. Never use an Expo
   password in a workflow.
2. Save the contents of `mobile/.firebase/google-services.json` as Actions secret
   **GOOGLE_SERVICES_JSON**. CI needs this local client file when computing the
   same native fingerprint as the APK. EAS file variables are available to the
   cloud builder, but the current CLI does not download their contents for OTA.
   The same client file is already configured on Expo in preview and production.
3. Push the changed files to `master` or `main`.

Workflows:

| Workflow | Trigger | Result |
| --- | --- | --- |
| Mobile checks | PR/push | Backend tests, lint, typecheck, SDK compatibility and all-platform JS export |
| Publish mobile OTA | Mobile changes pushed to master/main with `ENABLE_MOBILE_OTA=true` | Validates mobile code, publishes to preview |
| Publish mobile OTA | Run workflow manually | Publishes to the selected preview/production channel |
| Build Android app | Run workflow manually | Creates a signed preview APK or production AAB |

The new native APK is ready. GitHub automatic OTA publication is currently
unconfigured: the `ENABLE_MOBILE_OTA` repository variable and the `EXPO_TOKEN`
and `GOOGLE_SERVICES_JSON` secrets were absent when checked on 20 November.
Configure those secrets, then set `ENABLE_MOBILE_OTA=true` to publish on push.
Authenticated local `npm run update:preview` already publishes to the installed
app. APK builds remain manual.

The GitHub `preview`/`production` environments can hold their own secrets and
optional production protection rules. Existing Expo credentials must be set up
before a non-interactive build. Build output links appear in the Actions log and
at https://expo.dev/accounts/rohit_8577/projects/sangeetx/builds.

To roll back a faulty OTA, use the EAS dashboard to republish the last good
update for the same runtime/channel. Expo's normal launch error recovery remains
enabled. Test a preview update before manually publishing production.

## Firebase and push delivery

1. In Firebase, register an Android app with package
   **com.rohit8577.sangeetx**. Download its **google-services.json** to
   `mobile/.firebase/google-services.json` (gitignored). This is the Android client config;
   the root `firebase-admin.json` is a server private key and cannot replace it.
2. Upload an FCM v1 service-account key through `npx eas-cli@latest credentials
   --platform android` → Push Notifications / FCM v1 for this Expo project.
   Keep this private key out of the repository and mobile bundle.
3. Store the client file in the Expo environments used for builds and updates:

   ```sh
   npx eas-cli@latest env:set preview --name GOOGLE_SERVICES_JSON --type file --value ./.firebase/google-services.json --visibility sensitive --non-interactive
   npx eas-cli@latest env:set production --name GOOGLE_SERVICES_JSON --type file --value ./.firebase/google-services.json --visibility sensitive --non-interactive
   ```

   Both are already configured for `sangeetx-5552b`. FCM v1 credentials are also
   assigned to `com.rohit8577.sangeetx` on Expo. The repository-root `.easignore`
   excludes all `.firebase` files from uploads; EAS supplies the client file via
   its file environment variable. Service-account private keys never enter the APK.
4. Rebuild/install the APK after adding the client configuration.
5. Deploy the backend changes and restart it. The push worker runs in `main.js`;
   it does not require a separate process. For timely notifications the backend
   must stay running; a sleeping free hosting instance delays queued delivery.
6. On the phone, sign in and open Profile → **Enable / retry notifications**.
   Allow Android notifications. Test with a friend account sending a chat,
   song share or friend request while the recipient app is backgrounded.

Optionally enable Expo enhanced push security and set **EXPO_ACCESS_TOKEN** on
the backend. Never expose it as an EXPO_PUBLIC variable. iOS additionally needs
an Apple bundle identifier, APNs credentials and a signed iOS build; those are
not configured by this Android delivery setup.

Devices are authenticated, tied to the login session, and expire with it. Online
logout unregisters the device; revoked sessions and password changes are checked
before sending. Offline logout cannot immediately notify the server, so an
already registered device can still receive remote alerts until its server
session is revoked/expired or the device registers under the next account.
Notification taps check the recipient account before opening chat or a song.
Expo tickets and receipts are processed with persistent jobs and bounded retry.
Invalid device tokens are removed. Delivery is best effort; a ticket is not proof
that the phone displayed an alert. Messages already handed to FCM cannot be
retracted by later logout. Android force-stop blocks pushes until the next launch.

## Music notification and background playback

One Expo native playlist owns the whole playable queue. Media3 advances songs
without a JS `didJustFinish` callback creating a new player/service. Repeat is
native; shuffle reorders upcoming tracks without replacing the playing item.
Recommendations are fetched ahead when four or fewer queued tracks remain.
If the network/catalog supplies no additional songs, the finite queue ends.

The Android media playback foreground service supplies play/pause, next/previous,
artwork, duration and seek position. Modern Android uses that metadata for its
system seekbar/timers and artwork colors. Layout, expanded/collapsed appearance,
and wallpaper/art treatment depend on Android version and the phone manufacturer.
The full and mini players independently extract colors from artwork, with a
bounded cache and a fallback palette if the image cannot be loaded.

SDK 58's audio player has no public wakeMode setting. The idempotent
`withAudioWakeLock.cjs` patch checks the expected native builder source before
enabling ExoPlayer `WAKE_MODE_NETWORK`,
which holds CPU/Wi-Fi locks while playback requires them. Postinstall applies it
before EAS calculates fingerprints, and the CNG plugin verifies it on prebuild.
If an SDK upgrade changes the source, installation fails with a review message.
Native Android/iOS projects remain generated and are not committed. EAS reads
ignore rules from the repository-root `.easignore`, not `mobile/.easignore`.

No app can promise playback after force-stop or every OEM battery restriction.
If needed, allow background activity in Android's app battery settings. The app
provides a shortcut to its settings; it does not request a blanket battery bypass.

## Physical Android acceptance check

- Install the new APK over the previous release; login and playlists still work.
- Play a queue of at least 10 tracks with the screen locked for 30 minutes.
- Scrub the expanded media notification, check elapsed/total time and artwork,
  and test pause/resume, previous/next, headphones and Bluetooth controls.
- Check interruption/resume around a phone call and unplugging headphones.
- Change Wi-Fi/mobile data and recover after a temporary connection loss.
- Try repeat-one, repeat-all and shuffle across several background transitions.
- Send social pushes to a locked phone; tapping opens the intended destination.
- Log out/switch accounts; notifications must not navigate into the old account.
- Publish a compatible preview OTA during playback: it downloads, music continues,
  then pause and restart to load it. Verify a native dependency change targets a
  different runtime and does not load into an incompatible APK.
- Test on Android 13+ notification permissions and the latest available Android.

Browser and bundle tests do not certify these Android OS behaviors; a physical
device run is required before a production release.
