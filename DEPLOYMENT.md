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

| Variable | Purpose |
| --- | --- |
| `NODE_ENV=production` | Production behavior and secure cookies |
| `NODE_VERSION=24.21.0` | Compatible Node runtime |
| `DATABASE_URL` | MongoDB Atlas connection string for the existing database |
| `JWT_SECRET` | Existing strong signing secret; preserve it to avoid invalidating sessions |
| `SAVAN_URL` | Existing music provider API base URL |
| `RESEND_API_KEY`, `RESEND_FROM` | Signup and password-reset email; sender must be verified |
| `googleApi` | Optional Gemini features; the key name is case-sensitive |
| `YOUTUBE_API_KEY` | Optional YouTube search |
| `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional Google browser login |
| `CALLBACK_URL=https://sangeetx.online/auth/google/callback` | Google OAuth callback; also register it in Google Cloud |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Optional Firebase mobile login |
| `TRUST_PROXY=1` | Trust Render's application-facing reverse proxy |

Render supplies `PORT`; the application binds to `0.0.0.0` and reads that value.
Native Android clients do not need a browser CORS origin. If you host a separate
web frontend, add its exact HTTPS origin to `TRUSTED_ORIGINS`.
Ollama features require a separately reachable Ollama server; localhost on
Render is not your computer.

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

Current preview: [Download SangeetX 1.0.0 APK](https://expo.dev/artifacts/eas/80DEBqF7-PARiG7T_C6S3MzYXSh-WO6TebXDjgmlPDo.apk).
Build details: [Expo build](https://expo.dev/accounts/rohit_8577/projects/sangeetx/builds/20c6acd9-722b-4cd1-9097-eec2840d2f37).
The APK is also saved locally at `mobile/artifacts/SangeetX-preview-1.0.0.apk`.

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

Backend-only updates do not require a new APK when the API stays compatible.
Mobile code or embedded URL changes require a new APK build.
