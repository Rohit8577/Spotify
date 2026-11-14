# 🎵 SangeetX Mobile App (Expo & React Native)

A full-featured, modern Spotify-style music streaming mobile application built with **React Native** and **Expo SDK 58**.

---

## 📱 Features

- **🔐 Authentication & Security**:
  - JWT-based authentication with auto-login via AsyncStorage.
  - Sign up with Email verification & OTP support (`/send-otp` via Resend / Nodemailer).
  - Forgot password & reset password flow (`/forgetpass` & `/updtpass`).
  - Google login support.

- **🎶 Music Discovery & Streaming**:
  - **Home Hub**: Trending Songs, Top Charts, Featured Artists, New Releases, and Hot Albums.
  - **Dynamic Greetings & Filter Chips**: Good morning / afternoon / evening with quick vibe tags.
  - **Universal Search**: Search songs, artists, albums, playlists, and YouTube audio.
  - **Browse All Genres**: Bollywood, Punjabi, Hip-Hop, Pop, Lo-Fi, Workout, Romantic, Indie.

- **🎧 Audio Player (Persistent Mini Player + Full Player)**:
  - **Persistent Mini Player**: Stays docked above bottom navigation tabs.
  - **Full-Screen Modal Player**:
    - High-res album art with dark gradient theme.
    - Scrubber with seek slider (`@react-native-community/slider`).
    - Repeat (Off / All / One) and Shuffle playback modes.
    - Volume control slider.
    - Background audio playback enabled (`expo-av`).

- **🎛️ Equalizer & AI Auto-Tune**:
  - 6-Band Equalizer: 60Hz, 170Hz, 350Hz, 1kHz, 3kHz, 10kHz (-12dB to +12dB).
  - Presets: Flat, Bass Boost, Vocal, Rock, Electronic.
  - **AI Auto-Tune EQ**: Automatically queries Google Gemini to analyze current playing song and tune the EQ profile in real-time.

- **🤖 AI Features**:
  - **AI DJ / Smart Playlist Generator**: Prompt any mood or vibe (e.g. *"Late night drive Hindi & English lo-fi"*, *"Gym phonk hype"*) to generate 15–30 curated songs using Google Gemini.
  - **Personalized Recommendations ("Made For You")**: Decay-weighted recommendation engine calculated from user playback history (play, complete, skip, like).
  - **Ask AI Music Chatbot**: Dedicated music assistant to ask about song trivia, lyrics meanings, and artist discographies.

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
- **Expo Go (Physical Device)**:
  1. Install the **Expo Go** app from Google Play Store or Apple App Store.
  2. Ensure your phone and computer are on the same Wi-Fi network.
  3. Scan the QR code displayed in your terminal.
  4. The app connects to `https://sangeetx.online`. If an older server address
     was saved, change it using the login screen's settings button.

- **Android Emulator**:
  Press `a` in terminal. The same online backend is used.

- **Web Browser Preview**:
  Press `w` in terminal to run in web mode.

### Metro cannot resolve `expo-router/build/utils/splash`

If this appears after installing or upgrading dependencies, stop the running Expo server with `Ctrl+C` and restart it with a fresh Metro cache:

```bash
# From the mobile directory
npm run start:clear
```

From the repository root, the equivalent command is `npm run mobile:clear`. Reload the app after the new server starts. Stop Expo before future dependency upgrades: an already-running Metro process can retain an outdated file map even when `node_modules/expo-router/build/utils/splash.js` exists on disk.

## Installable Android preview

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
