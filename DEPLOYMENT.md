# SangeetX backend and Android preview

The Android preview uses the existing Render backend at
**https://sangeetx.online**. A local server is not required.

## Existing Render service

In the Render dashboard, open the web service that owns `sangeetx.online`.
Keep its existing custom-domain configuration. When deploying this repository's
current backend, use these settings:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Root directory | Repository root, not `mobile` |
| Node version | `24.21.0` (or another supported Node 22+ version) |
| Build command | `npm ci --omit=dev` |
| Start command | `npm start` |
| Health check path | `/health` |

Set environment variables in Render's **Environment** page. Keep secret values
in Render; never put them in Git or in an `EXPO_PUBLIC_*` variable.

For the reported `FIREBASE_PRIVATE_KEY.replace` crash, deploy the updated source
and lockfile together. The failing log references old commit `1f33fb3`; restarting
that commit will reproduce the crash. Use **Deploy latest commit** after the
changes reach the service's connected `master` branch. Select **Clear build cache
& deploy** if the service still restores dependencies from the old deployment.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV=production` | Production behavior and secure cookies |
| `NODE_VERSION=24.21.0` | Compatible Node runtime |
| `DATABASE_URL` | MongoDB Atlas connection string for the existing database |
| `JWT_SECRET` | Existing strong signing secret; preserve it to avoid invalidating sessions |
| `SAVAN_URL` | Existing music provider API base URL |
| `RESEND_API_KEY`, `RESEND_FROM` | Signup and password-reset email; sender must be verified |
| `googleApi` | Optional Gemini features; the key name is case-sensitive |
| `YOUTUBE_API_KEY` | YouTube search and pasted-link metadata |
| `YT_DLP_PATH` | Optional existing extractor path; otherwise setup installs `.tools/yt-dlp` |
| `YOUTUBE_AUDIO_ENABLED` | Set `false` to disable YouTube audio |
| `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional Google browser login |
| `CALLBACK_URL=https://sangeetx.online/auth/google/callback` | Google OAuth callback; also register it in Google Cloud |
| `TRUST_PROXY=1` | Explicit proxy override; Render automatically defaults to its one ingress hop |

Render supplies `PORT`; the application binds to `0.0.0.0` and reads that value.
The backend no longer initializes Firebase Admin or reads `FIREBASE_PRIVATE_KEY`.
After deploying the updated source, remove obsolete `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
`FIREBASE_PRIVATE_KEY` and `FIREBASE_TOKEN` variables from Render. Email/JWT login
and Expo push delivery do not require them. Android push credentials belong in
Expo's FCM credential service and the mobile build, not in Render.
Native Android clients do not need a browser CORS origin. If you host a separate
web frontend, add its exact HTTPS origin to `TRUSTED_ORIGINS`.
Ollama requires a separately reachable server; localhost on Render is not your
computer. Ask AI falls back to Gemini when `googleApi` is configured and Ollama
fails or returns an empty answer.

## YouTube audio

The backend host needs **Python 3 and Node.js 22+**. `npm run setup:youtube`
installs the checksum-verified yt-dlp 2026.10.26 release in the ignored `.tools`
directory. It must run during deployment because the executable is not committed.
The root postinstall hook detects Render and performs the setup and executable
verification automatically, including when the existing build command is only
`npm ci`. Local installs skip that hook; use `npm run setup:youtube` locally.
The extractor also uses Node.js and the upstream JavaScript components for
YouTube signatures, so the host needs outbound access to YouTube, Googlevideo
and GitHub. To install a newer release explicitly, set `YT_DLP_VERSION` when
running setup.

`POST /youtube/resolve` requires a logged-in session. Audio is served through
six-hour signed URLs at `/youtube/audio/:videoId`, with HTTP Range support.
The backend verifies that the selected format is an audio-only HTTPS stream;
it rejects video formats and manifests. Saved library entries store durable
YouTube references and receive new tickets when replayed. Password changes and
logout invalidate new audio requests for the affected session.

After deploying, point a matching mobile build/update at this backend and check
YouTube search, playback, pause, seek and replay from Liked Songs. Test from the
deployed host as well: an audio URL accepted on a development computer can be
restricted on a different outbound IP. Unavailable formats produce a playback
error, and expired or denied CDN descriptors are refreshed once.

Ensure MongoDB Atlas Network Access permits your Render service's outbound
addresses and the database user has access to the intended database. A health
response with `database: disconnected` is not ready for login, even if it
returns HTTP 200 on an older backend version.

To update the service:

1. Commit and push the intended backend changes to the branch connected in Render.
2. In that service, select **Manual Deploy > Deploy latest commit**, or use its
   existing automatic deployment setting.
3. Check the deploy logs, then open `https://sangeetx.online/health` and confirm
   `database` is `connected`.
4. Verify login and song search. On a free service, allow time for a cold start
   after inactivity.

The repository's AWS workflow is separate from Render. Render deployment is
controlled by the Render service's connected repository and branch.

## Android APK

The current signed preview APK and its build details are linked in
[Android delivery setup](mobile/DELIVERY.md). The current release is **1.1.1**,
with the Firebase startup fix in the backend and validated mobile flows.

From the repository root:

```bash
npm run mobile:apk
```

The Expo project is `@rohit_8577/sangeetx`; the Android package is
`com.rohit8577.sangeetx`. The `mobile/eas.json` preview profile builds an APK and
embeds `EXPO_PUBLIC_API_URL=https://sangeetx.online`. That public URL contains no
credentials. Expo signs the APK using its managed Android signing key.

Open the completed build's installation link on Android, download the APK,
allow installation from your browser when prompted, and install it. Expo Go
and a computer running Metro are not required. If an earlier installation
saved a local server URL, use the login screen's settings button to change it
to `https://sangeetx.online`.

Backend-only updates require a Render deployment. Compatible mobile JavaScript
and asset updates can use `npm --prefix mobile run update:preview`; changes to
the native SDK, native libraries or Firebase client config require a new APK.
Install 1.1.1 once because this release includes Expo SDK patch updates.

The public APK version endpoint describes the published **1.1.0 / versionCode 5**
artifact until a newer native build is available. New source code does not change
the advertised binary version. After building the APK, set `LATEST_APP_VERSION`,
`LATEST_APP_VERSION_CODE` and `LATEST_APP_APK_URL` to that verified artifact.
Metadata edits through `POST /api/app/version` require a separate `ADMIN_SECRET`;
login tokens and the JWT signing secret are not accepted as release credentials.
An unpublished version is marked unavailable instead of serving an older APK
under a newer filename. Native APK update/download checks run on Android.

The EC2 workflow installs the extractor and verifies it before restarting only
the `sangeetx` PM2 process. It requires Node.js 22+ on the existing EC2 host.
