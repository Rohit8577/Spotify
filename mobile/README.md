# 🎵 SangeetX Mobile App (Expo & React Native)

A full-featured, modern Spotify-style music streaming mobile application built with **React Native** and **Expo SDK 58**.

---

## 📱 Features

- **🔐 Authentication & Security**:
  - JWT-based authentication with session restoration; native tokens use SecureStore.
  - Sign up with Email verification & OTP support (`/send-otp` via Resend / Nodemailer).
  - Forgot password & reset password flow (`/forgetpass` & `/updtpass`).
  - Email/password login in the app; Google OAuth is available on the browser backend.

- **🎶 Music Discovery & Streaming**:
  - **Home Hub**: Trending Songs, Top Charts, Featured Artists, New Releases, and Hot Albums.
  - **Dynamic Greetings & Filter Chips**: Good morning / afternoon / evening with quick vibe tags.
  - **Universal Search**: Search songs, artists, albums, playlists, and YouTube audio.
  - Paste a YouTube watch/short/share link in the YouTube search tab and play its audio inside the app.
  - **Browse All Genres**: Bollywood, Punjabi, Hip-Hop, Pop, Lo-Fi, Workout, Romantic, Indie.

- **🎧 Audio Player (Persistent Mini Player + Full Player)**:
  - **Persistent Mini Player**: Stays docked above bottom navigation tabs.
  - **Full-Screen Modal Player**:
    - High-res album art with dark gradient theme.
    - Scrubber with seek slider (`@react-native-community/slider`).
    - Repeat (Off / All / One) and Shuffle playback modes.
    - Volume control slider.
    - Native `expo-audio` playlists with media notification seekbar, timers, artwork and background playback.
    - YouTube uses audio streams through the same player. Saved songs receive fresh playback links when replayed.

- **🎛️ Equalizer Suggestions**:
  - Six suggested bands: 60Hz, 170Hz, 350Hz, 1kHz, 3kHz, 10kHz (-12dB to +12dB).
  - Presets: Flat, Bass Boost, Vocal, Rock, Electronic.
  - **AI EQ Suggestions**: Gemini suggests a profile using the song title and artist. Apply it in your device equalizer; these sliders do not process playback audio.

- **🤖 AI Features**:
  - **AI DJ / Smart Playlist Generator**: Prompt any mood or vibe (e.g. *"Late night drive Hindi & English lo-fi"*, *"Gym phonk hype"*) to generate 15–30 curated songs using Google Gemini.
  - **Personalized Recommendations ("Made For You")**: Decay-weighted recommendation engine calculated from user playback history (play, complete, skip, like).
  - **Ask AI Music Chatbot**: Music questions use Ollama, with a configured Gemini fallback when the local model is unavailable.

- **📜 Full Lyrics Viewer**:
  - Instant lyrics fetching for currently playing song with full-screen reader.

- **📂 User Library & Playlists**:
  - Pinned **Liked Songs** playlist.
  - Custom user playlists (Create, Rename, Delete, Add Song, Remove Song).
  - Recently Played listening history.
  - Followed artists.

- **👥 Real-Time Social & Friends (Socket.IO)**:
  - Live friend activity: See in real-time what songs your friends are listening to.
  - Real-time 1-on-1 chat with message history (`/chat/history/:friendId`).
  - **Share Songs**: Instantly send a song to a friend; receives a live in-app notification banner to play immediately.
  - Search and add friends.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 22 or newer.
- The default backend is already online at `https://sangeetx.online` (Render).
  Running a backend on your computer is not required.

### 2. Run the Expo App
Navigate into the `mobile` directory:
```bash
cd mobile
npx expo start
```

### 3. Open on your device
- **Android APK / development build**:
  Use the APK linked in [Android delivery setup](DELIVERY.md). An installed APK
  includes its JavaScript bundle. For a development build already installed on
  your phone, start Metro with `npx expo start --dev-client` and open its project link.
  Use this target to verify background playback, media controls, Bluetooth and push notifications.

- **Expo Go (UI preview)**:
  1. Install the **Expo Go** app from Google Play Store or Apple App Store.
  2. Ensure your phone and computer are on the same Wi-Fi network.
  3. Scan the QR code displayed in your terminal.
  4. The app connects to `https://sangeetx.online`. If an older server address
     was saved, change it using the login screen's settings button.
  Custom native modules and remote push require an APK or development build.

- **Android Emulator**:
  Press `a` in terminal. The same online backend is used.

- **Web Browser Preview**:
  Press `w` in terminal to run in web mode.

### YouTube audio backend setup

Run `npm run setup:youtube` from the repository root on the backend host, with
Python 3 and Node.js 22+ installed. Set `YOUTUBE_API_KEY` for search. The backend
verifies audio-only HTTPS formats and relays them with seeking support through
authenticated playback links. Keep `YT_DLP_PATH` server-side if supplying your own extractor.

The source changes need a backend deployment and a matching mobile update before
existing installed APKs can use this feature. See [deployment instructions](../DEPLOYMENT.md).
Provider restrictions or a missing extractor produce an in-app playback error.

### Verification

From the repository root:

```bash
npm run test:all
npm run lint
npm --prefix mobile run lint
npm --prefix mobile run typecheck
```

The suite uses temporary databases and mocked external services. The separate
[testing report](../reports/expo-testing-2026-11-19/REPORT.md) includes real YouTube
and catalog playback evidence and the physical Android checks still required.

### Metro cannot resolve `expo-router/build/utils/splash`

If this appears after installing or upgrading dependencies, stop the running Expo server with `Ctrl+C` and restart it with a fresh Metro cache:

```bash
# From the mobile directory
npm run start:clear
```

From the repository root, the equivalent command is `npm run mobile:clear`. Reload the app after the new server starts. Stop Expo before future dependency upgrades: an already-running Metro process can retain an outdated file map even when `node_modules/expo-router/build/utils/splash.js` exists on disk.

## Installable Android preview

For the new **1.1.0 OTA-enabled app**, GitHub Actions, Firebase push setup and
background playback verification, follow [Android delivery setup](DELIVERY.md).
The 1.0.0 APK below predates OTA and must be replaced once with the new build.

**Latest:** [Download SangeetX 1.1.0 APK](https://expo.dev/artifacts/eas/JuirtOASe3xwS4GwGbI1Bp4RbzLWxpbkQ_DKhnvdoG4.apk)
([build details](https://expo.dev/accounts/rohit_8577/projects/sangeetx/builds/e1c84fb2-1821-43ba-9f21-8978d3c26536)).
Its embedded native fingerprint matches the published preview OTA, and its
Firebase resources were verified in the signed APK. Install over the old app.

The completed [SangeetX 1.0.0 APK](https://expo.dev/artifacts/eas/80DEBqF7-PARiG7T_C6S3MzYXSh-WO6TebXDjgmlPDo.apk)
is available from the [Expo build page](https://expo.dev/accounts/rohit_8577/projects/sangeetx/builds/20c6acd9-722b-4cd1-9097-eec2840d2f37).
A local copy is saved as `artifacts/SangeetX-preview-1.0.0.apk`.

From the repository root, run `npm run mobile:apk`. The `preview` profile in
`eas.json` produces a signed APK with the JavaScript bundle included. Expo Go,
Metro, a local backend, and a shared Wi-Fi network are not required to use it.
The APK uses `https://sangeetx.online` through `EXPO_PUBLIC_API_URL`.

After the Expo build completes, open its install link on your Android phone,
download the APK, and allow your browser to install it when Android asks.
Keep the Expo-managed signing key so future APKs can update the installed app.
Do not commit signing keys or backend secrets. `.easignore` excludes local
environment files, generated output, and credentials from cloud builds.

The first backend request may take longer after the Render service has been
idle. Wait for `https://sangeetx.online/health` to report a connected database,
then retry login if needed. See [backend setup](../DEPLOYMENT.md) for Render
settings and deployment steps.
