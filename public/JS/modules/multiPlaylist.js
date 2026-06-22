// ============================================================
// Multi-Playlist Mix Module
// Lets users select multiple playlists and merge them into
// a single playback queue with shuffle/repeat support.
// ============================================================

import state from "./state.js";
import { popupAlert, highlight } from "./utils.js";
import { playsong } from "./player.js";

// --- Open the Multi-Playlist Selector Modal ---
export async function openMultiPlaylistSelector() {
  const modal = document.getElementById("multiPlaylistModal");
  const listContainer = document.getElementById("multiPlaylistList");
  if (!modal || !listContainer) return;

  // Reset selection state
  state.selectedPlaylists = [];
  listContainer.innerHTML = `<div class="mpm-loading"><div class="mpm-spinner"></div><span>Loading playlists...</span></div>`;
  modal.classList.remove("hidden");
  modal.classList.add("visible");
  updateStartButton();

  try {
    const res = await fetch("/fetchplaylist");
    const result = await res.json();
    const playlists = result.array || [];

    if (playlists.length < 2) {
      listContainer.innerHTML = `<div class="mpm-empty"><i class='bx bx-music'></i><p>You need at least <strong>2 playlists</strong> to use Multi-Mix</p></div>`;
      return;
    }

    listContainer.innerHTML = "";
    playlists.forEach((pl) => {
      const item = document.createElement("label");
      item.className = "mpm-playlist-item";
      item.innerHTML = `
        <div class="mpm-checkbox-wrapper">
          <input type="checkbox" class="mpm-checkbox" data-name="${pl.name}" />
          <span class="mpm-checkmark"></span>
        </div>
        <img src="${pl.image}" alt="${pl.name}" class="mpm-playlist-img" />
        <div class="mpm-playlist-info">
          <span class="mpm-playlist-name">${pl.name}</span>
        </div>`;

      const checkbox = item.querySelector(".mpm-checkbox");
      checkbox.addEventListener("change", () => {
        togglePlaylistSelection(pl.name, checkbox.checked);
        item.classList.toggle("selected", checkbox.checked);
      });

      listContainer.appendChild(item);
    });
  } catch (err) {
    console.error("Error fetching playlists for multi-mix:", err);
    listContainer.innerHTML = `<div class="mpm-empty"><p>Failed to load playlists</p></div>`;
  }
}

// --- Toggle Playlist Selection ---
function togglePlaylistSelection(name, isSelected) {
  if (isSelected) {
    if (!state.selectedPlaylists.includes(name)) {
      state.selectedPlaylists.push(name);
    }
  } else {
    state.selectedPlaylists = state.selectedPlaylists.filter((n) => n !== name);
  }
  updateStartButton();
}

// --- Update Start Button State ---
function updateStartButton() {
  const btn = document.getElementById("mpmStartBtn");
  const count = document.getElementById("mpmSelectedCount");
  if (!btn) return;
  const n = state.selectedPlaylists.length;
  if (count) count.textContent = n > 0 ? `${n} selected` : "";
  btn.disabled = n < 2;
  btn.classList.toggle("active", n >= 2);
}

// --- Start Multi-Playlist Mix ---
export async function startMultiPlaylistMix() {
  if (state.selectedPlaylists.length < 2) {
    popupAlert("Select at least 2 playlists to mix!");
    return;
  }

  const modal = document.getElementById("multiPlaylistModal");
  const listContainer = document.getElementById("multiPlaylistList");
  if (listContainer) listContainer.innerHTML = `<div class="mpm-loading"><div class="mpm-spinner"></div><span>Merging songs...</span></div>`;

  try {
    // Fetch songs from all selected playlists in parallel
    const fetchPromises = state.selectedPlaylists.map(async (pname) => {
      const res = await fetch("/librarySongs", {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pname }),
      });
      const result = await res.json();
      return result.arr || [];
    });

    const allSongsArrays = await Promise.all(fetchPromises);
    let allSongs = allSongsArrays.flat();

    // Remove duplicates by songId
    const seen = new Set();
    allSongs = allSongs.filter((song) => {
      if (seen.has(song.songId)) return false;
      seen.add(song.songId);
      return true;
    });

    if (allSongs.length === 0) {
      popupAlert("Selected playlists are empty!");
      closeMultiPlaylistModal();
      return;
    }

    // Shuffle if shuffle flag is on
    if (state.ShuffleFlag === 1) {
      allSongs = shuffleArray(allSongs);
    }

    // Set merged queue state
    state.mergedQueue = allSongs;
    state.mergedQueueIndex = 0;
    state.multiPlaylistMode = true;

    // Turn off autoPlay recommendations since we have our own queue
    state.autoPlayRecommendations = false;
    const autoPlayRecBtn = document.getElementById("AutoPlayRecBtn");
    if (autoPlayRecBtn) {
      autoPlayRecBtn.style.color = "#b3b3b3";
      autoPlayRecBtn.title = "Autoplay Recommended (Off)";
    }

    // Close modal
    closeMultiPlaylistModal();

    // Show active badge
    showMixBadge();

    // Play first song
    const song = state.mergedQueue[0];
    state.globalLibrary = "__multi_mix__";
    playsong(song.image, song.songName, song.artist, song.songId, song.songUrl, song.len, "__multi_mix__");

    popupAlert(`🔀 Multi-Mix started! ${allSongs.length} songs from ${state.selectedPlaylists.length} playlists`);
  } catch (err) {
    console.error("Error starting multi-playlist mix:", err);
    popupAlert("Failed to start mix. Try again!");
    closeMultiPlaylistModal();
  }
}

// --- Multi-Playlist Playback Control ---
export function multiPlaybackControl(direction = "forward") {
  if (!state.multiPlaylistMode || state.mergedQueue.length === 0) return;

  let index = state.mergedQueueIndex;

  if (state.RepeatOneFlag === 1) {
    // Repeat One: replay same song
    // index stays the same
  } else if (state.ShuffleFlag === 1) {
    // Shuffle: random index (avoid same song)
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * state.mergedQueue.length);
    } while (newIndex === index && state.mergedQueue.length > 1);
    index = newIndex;
  } else {
    // Repeat List / Normal: sequential
    if (direction === "forward") {
      index = index + 1;
      if (index >= state.mergedQueue.length) index = 0;
    } else {
      index = index - 1;
      if (index < 0) index = state.mergedQueue.length - 1;
    }
  }

  state.mergedQueueIndex = index;
  const song = state.mergedQueue[index];
  playsong(song.image, song.songName, song.artist, song.songId, song.songUrl, song.len, "__multi_mix__");
}

// --- Exit Multi-Playlist Mode ---
export function exitMultiPlaylistMode() {
  state.multiPlaylistMode = false;
  state.selectedPlaylists = [];
  state.mergedQueue = [];
  state.mergedQueueIndex = -1;
  state.globalLibrary = "";
  hideMixBadge();
  popupAlert("Multi-Mix mode ended");
}

// --- Close Modal ---
export function closeMultiPlaylistModal() {
  const modal = document.getElementById("multiPlaylistModal");
  if (modal) {
    modal.classList.remove("visible");
    setTimeout(() => modal.classList.add("hidden"), 300);
  }
}

// --- Badge Controls ---
function showMixBadge() {
  const badge = document.getElementById("multiMixBadge");
  if (badge) {
    badge.classList.remove("hidden");
    badge.classList.add("visible");
  }
}

function hideMixBadge() {
  const badge = document.getElementById("multiMixBadge");
  if (badge) {
    badge.classList.remove("visible");
    badge.classList.add("hidden");
  }
}

// --- Shuffle Helper ---
function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// --- Init Multi-Playlist Events ---
export function initMultiPlaylistEvents() {
  // Start button
  document.getElementById("mpmStartBtn")?.addEventListener("click", startMultiPlaylistMix);

  // Cancel/Close button
  document.getElementById("mpmCloseBtn")?.addEventListener("click", closeMultiPlaylistModal);
  document.getElementById("mpmCancelBtn")?.addEventListener("click", closeMultiPlaylistModal);

  // Backdrop click to close
  document.getElementById("multiPlaylistModal")?.addEventListener("click", (e) => {
    if (e.target.id === "multiPlaylistModal") closeMultiPlaylistModal();
  });

  // Exit badge click
  document.getElementById("multiMixBadge")?.addEventListener("click", exitMultiPlaylistMode);
}
