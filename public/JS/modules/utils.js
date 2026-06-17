// ============================================================
// Utility Functions
// Reusable helpers used across multiple modules.
// ============================================================

import state from "./state.js";

let timer;

export function debounce(func, delay) {
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

export function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function popupAlert(message) {
  const el = document.getElementById("popupmessage");
  el.classList.remove("hidden");
  el.innerHTML = message;
  setTimeout(() => {
    el.classList.add("hidden");
  }, 2500);
}

export function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
  );
}

export function highlight(name, source) {
  const selectors = {
    OnlineSongList: { container: "#LibrarySongList li", nameSelector: ".song-title-text", prop: "textContent" },
    Liked: { container: ".likedSongList li", nameSelector: ".song-title-text", prop: "textContent" },
    recently: { container: ".recentlyPlayed li", nameSelector: ".song-name", prop: "textContent" },
    recently_1: { container: ".recentlyPlayedForMobile li", nameSelector: ".song-name", prop: "textContent" },
    album: { container: ".song-list-item .song-info .song-name", nameSelector: null, prop: "textContent" },
    artist: { container: ".song-list-item.artistTopSongs .song-info .song-title", nameSelector: null, prop: "textContent" },
    playlist: { container: ".playlist-song-title", nameSelector: null, prop: "textContent" },
  };

  const config = selectors[source];
  if (!config) return;

  const list = document.querySelectorAll(config.container);
  list.forEach((item) => {
    item.classList.remove("playing");
    let songName;
    if (config.nameSelector) {
      songName = item.querySelector(config.nameSelector)?.[config.prop]?.trim();
    } else {
      songName = item?.[config.prop]?.trim();
    }
    if (songName === name?.trim()) {
      item.classList.add("playing");
    }
  });
}

export async function downloadSong(songUrl, filename) {
  try {
    const response = await fetch(songUrl, { mode: "cors" });
    const blob = await response.blob();

    if (window.Android && window.Android.processBlobData) {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = function () {
        const base64data = reader.result;
        window.Android.processBlobData(base64data, filename, blob.type);
      };
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "download.mp3";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    console.error("Download failed", err);
  }
}

export async function logBehavior({ type, source = "unknown", song = {} }) {
  const payload = { type, song };
  try {
    await fetch("/log-interaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.log("Tracking Error (Ignored)");
  }
}

export function handleSongClick(song, libraryType) {
  // Imported dynamically to avoid circular deps
  import("./player.js").then(({ playsong }) => {
    highlight(song.songName, libraryType);
    state.globalLibrary = libraryType;
    state.currentSong = song.songId;
    playsong(song.image, song.songName, song.artist, song.songId, song.songUrl, song.len);
  });
}
