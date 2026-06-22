// ============================================================
// Script.js — Main Orchestrator (ES Module Entry Point)
// Imports all modules and wires up initialization
// ============================================================

import state from "./modules/state.js";
import { initPlayerEvents, initKeyboardShortcuts } from "./modules/player.js";
import { initEqualizer, initEqualizerEvents } from "./modules/equalizer.js";
import { initPlusButton, initPlaylistSearch, initPlaylistForm } from "./modules/playlist.js";
import { initInlineSearch, initSearchPageEvents, initVoiceSearch, initSearchHistory } from "./modules/search.js";
import { initializeHomePage } from "./modules/home.js";
import { initNavigation } from "./modules/navigation.js";
import { initSocialEvents } from "./modules/social.js";
import { initLyricsToggle } from "./modules/songDetails.js";
import { displayRecently } from "./modules/recently.js";
import { initSocket, initShareEvents } from "./modules/ws.js";
import { initMultiPlaylistEvents } from "./modules/multiPlaylist.js";

// ============================================================
// DOMContentLoaded — Main Init
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  if (sess === true) {
    // Fetch SAAVN base URL
    try {
      const urlRes = await fetch("/url");
      const urlData = await urlRes.json();
      state.SAAVN_BASE_URL = urlData.url;
    } catch (e) { console.warn("Could not fetch SAAVN URL"); }

    // Init navigation (sidebar, buttons, session UI)
    initNavigation();

    // Init home page content
    initializeHomePage();

    // Player setup
    const currentPlayingEl = document.querySelector(".currentPlayingMusic");
    if (currentPlayingEl) currentPlayingEl.style.display = "flex";
    const player = document.getElementById("player");
    const percentEl = document.getElementById("percent");
    if (percentEl && player) percentEl.innerHTML = `${Math.round(player.volume * 100)}%`;
    const fillBarEl = document.getElementById("fillBar");
    if (fillBarEl) fillBarEl.style.width = `100%`;

    initPlayerEvents();
    initKeyboardShortcuts();

    // Playlist features
    initPlusButton();
    initPlaylistSearch();
    initPlaylistForm();

    // Search features
    initInlineSearch();
    initSearchPageEvents();
    initVoiceSearch();
    initSearchHistory();

    // Equalizer
    initEqualizerEvents();

    // Song details (lyrics toggle)
    initLyricsToggle();

    // Social features
    initSocialEvents();

    // Multi-Playlist Mix
    initMultiPlaylistEvents();

    // WebSocket
    initSocket();
    initShareEvents();

    // Recently played
    displayRecently();

    // Voice search check
    if (!("webkitSpeechRecognition" in window)) {
      console.warn("Browser does not support voice search");
    }
  } else {
    // Guest mode — can browse and play, but no auth features
    try {
      const urlRes = await fetch("/url");
      const urlData = await urlRes.json();
      state.SAAVN_BASE_URL = urlData.url;
    } catch (e) { console.warn("Could not fetch SAAVN URL"); }

    // Init navigation
    initNavigation();

    // Init home page content (skips "For You" inside home.js)
    initializeHomePage();

    // Show current playing section
    const currentPlayingEl = document.querySelector(".currentPlayingMusic");
    if (currentPlayingEl) currentPlayingEl.style.display = "flex";

    // Player setup
    const player = document.getElementById("player");
    const percentEl = document.getElementById("percent");
    if (percentEl && player) percentEl.innerHTML = `${Math.round(player.volume * 100)}%`;
    const fillBarEl = document.getElementById("fillBar");
    if (fillBarEl) fillBarEl.style.width = `100%`;

    initPlayerEvents();
    initKeyboardShortcuts();

    // Search (inline navbar search)
    initInlineSearch();
    initSearchPageEvents();
  }
});