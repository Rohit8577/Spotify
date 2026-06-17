// ============================================================
// Player Module
// Core playback: play/pause, seekbar, volume, forward/backward
// ============================================================

import state from "./state.js";
import { formatTime, highlight, logBehavior, popupAlert } from "./utils.js";
import { initEqualizer } from "./equalizer.js";
import { updateRecently, displayRecently } from "./recently.js";
import { emitNowPlaying } from "./ws.js";

const player = document.getElementById("player");
const seekBar1 = document.getElementById("seekBar1");
const fillBar = document.getElementById("fillBar");
const playBar = document.getElementById("playbar-cont");
const PlayFillBar = document.getElementById("playbar-fill");
const currentTimeSpan = document.getElementById("currentTime");
const durationSpan = document.getElementById("duration");
const playbarFill = document.getElementById("playbar-fill");

// --- Play a Song ---
export async function playsong(image, name, artist, id, url, duration, source = "search") {
  if (sess === true && state.globalSongId && state.globalArtist && player.duration && !isNaN(player.duration)) {
    const playedTime = player.currentTime;
    const totalTime = player.duration;
    const completionRate = playedTime / totalTime;
    let interactionType = "play";
    if (completionRate >= 0.8) interactionType = "complete";
    else if (completionRate < 0.2) interactionType = "skip";

    logBehavior({
      type: interactionType,
      source: source,
      song: { songName: state.globalSongName, songId: state.globalSongId, artist: state.globalArtist },
    });
  }

  initEqualizer();
  currentPlayingMusic(image, name, artist, id);
  player.src = url;
  player.pause();

  // Only save history for logged-in users
  if (sess === true) {
    await updateRecently(url, image, name, artist, duration, id);
    displayRecently();
  }

  playpause();
  state.globalSongName = name;
  state.globalSongId = id;
  state.globalArtist = artist;
  state.aiCurrentSong = name;
  state.aiCurrentArtist = artist;

  // Only emit to WebSocket for logged-in users
  if (sess === true) {
    emitNowPlaying({ songName: name, artist, image, songId: id });
  }
}

// --- Play / Pause Toggle ---
export function playpause() {
  const playSVG = document.getElementById("play-svg");
  const pauseSVG = document.getElementById("pause-svg");

  if (typeof state.ytPlayer !== "undefined" && state.ytPlayer && state.ytPlayer.getPlayerState) {
    const ytState = state.ytPlayer.getPlayerState();
    if (ytState === YT.PlayerState.PLAYING) {
      state.ytPlayer.pauseVideo();
      playSVG.style.display = "block";
      pauseSVG.style.display = "none";
    } else {
      state.ytPlayer.playVideo();
      playSVG.style.display = "none";
      pauseSVG.style.display = "block";
    }
  } else if (player) {
    if (player.paused) {
      player.play();
      playSVG.style.display = "none";
      pauseSVG.style.display = "block";
    } else {
      player.pause();
      playSVG.style.display = "block";
      pauseSVG.style.display = "none";
    }
  }
}

// --- Current Playing Music UI ---
export async function currentPlayingMusic(img, name, artist, id) {
  const currentImg = document.getElementById("currentPlayingSongImg");
  if(currentImg) {
    currentImg.src = img;
    currentImg.classList.remove("hidden");
  }
  let trimmedName = name.split(" ").slice(0, 4).join(" ");
  document.getElementById("currentPlayingName").innerHTML = `<span> <strong>${trimmedName}</strong></span> `;
  const plusEl = document.getElementById("Plus");
  if (plusEl) plusEl.style.display = "block";
  const shareBtn = document.getElementById("shareSongBtn");
  if (shareBtn) shareBtn.classList.remove("hidden");
  // Dynamically import to avoid circular deps
  if (sess === true) {
    const { currentPlayingSongDetails } = await import("./songDetails.js");
    currentPlayingSongDetails(id);
  }
  state.songStartTime = Date.now();
  state.isSkipped = true;
}

// --- Playback Control (Next/Prev/Shuffle/Repeat) ---
export async function playbackControl(PlaylistName, SongName, direction = "forward") {
  let result, highlightname;

  if (
    PlaylistName !== "Liked" &&
    PlaylistName !== "recently" &&
    PlaylistName !== "album" &&
    PlaylistName !== "artist" &&
    PlaylistName !== "OnlinePlaylist" &&
    PlaylistName !== "recently_1"
  ) {
    highlightname = "OnlineSongList";
    const res = await fetch("/librarySongs", {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pname: PlaylistName }),
    });
    result = await res.json();
  } else if (PlaylistName === "recently" || PlaylistName === "recently_1") {
    highlightname = PlaylistName;
    const res = await fetch("/updateRecently");
    result = await res.json();
  } else if (PlaylistName === "album") {
    highlightname = "album";
    const fetchResult = await fetch(`/search?type=albumID&query=${state.globalAlbumId}`);
    result = await fetchResult.json();
    result = {
      arr: result.data.songs.map((song) => ({
        songUrl: song.download_url?.[4]?.link || "",
        image: song.image?.[2]?.link || "",
        songName: song.name || "",
        artist: song.artists?.primary?.[0]?.name || "",
        len: Number(song.duration) || 0,
      })),
    };
  } else if (PlaylistName === "artist") {
    highlightname = "artist";
    const fetchResult = await fetch(`/search?type=artistID&query=${state.globalAlbumId}`);
    result = await fetchResult.json();
    result = {
      arr: result.data.topSongs.map((song) => ({
        songUrl: song.download_url?.[4]?.link || "",
        image: song.image?.[2]?.link || "",
        songName: song.name || "",
        artist: song.artists?.primary?.[0]?.name || "",
        len: Number(song.duration) || 0,
      })),
    };
  } else if (PlaylistName === "OnlinePlaylist") {
    highlightname = "playlist";
    const res = await fetch("/playlistData", {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId: state.globalAlbumId }),
    });
    result = await res.json();
    const ids = result.playlistSongs.map((item) => item.id);
    const songs = await fetchSongs(ids);
    result = { arr: songs };
  } else {
    highlightname = "Liked";
    const res = await fetch("/get-favorite");
    result = await res.json();
  }

  const playSongFromResult = async (index) => {
    player.src = result.arr[index].songUrl;
    if (highlightname !== "recently" && highlightname !== "recently_1") {
      await updateRecently(result.arr[index].songUrl, result.arr[index].image, result.arr[index].songName, result.arr[index].artist, result.arr[index].len, result.arr[index].songId);
      await displayRecently();
    }
    currentPlayingMusic(result.arr[index].image, result.arr[index].songName, result.arr[index].artist, result.arr[index].songId);
    playpause();
    state.globalSongName = result.arr[index].songName;
    state.globalSongId = result.arr[index].songId;
    state.globalArtist = result.arr[index].artist;
    highlight(result.arr[index].songName, highlightname);
  };

  if (state.RepeatFlag === 1) {
    let index = result.arr.findIndex((song) => song.songName === SongName);
    index = direction === "forward" ? index + 1 : index - 1;
    if (index >= result.arr.length) index = 0;
    if (index < 0) index = result.arr.length - 1;
    await playSongFromResult(index);
  }
  if (state.ShuffleFlag === 1) {
    let index;
    do {
      index = Math.floor(Math.random() * result.arr.length);
    } while (state.LastIndex === index);
    state.LastIndex = index;
    await playSongFromResult(index);
  }
  if (state.RepeatOneFlag === 1) {
    let index = result.arr.findIndex((song) => song.songName === SongName);
    await playSongFromResult(index);
  }
}

// --- Fetch Songs by IDs ---
export async function fetchSongs(ids) {
  try {
    const results = await Promise.all(
      ids.map(async (id) => {
        const res = await fetch(`https://saavn.dev/api/songs/${id}`);
        const json = await res.json();
        const song = json.data[0];
        return {
          songUrl: song.downloadUrl?.[4]?.url || "",
          image: song.image?.[2]?.url || "",
          songName: song.name || "",
          artist: song.artists?.primary?.map((a) => a.name).join(", ") || "",
          len: Number(song.duration) || 0,
          songId: song.id,
        };
      })
    );
    return results;
  } catch (err) {
    console.error("Error fetching songs:", err);
    return [];
  }
}

// --- Volume Seekbar ---
function updateSeekBar(clientX) {
  const rect = seekBar1.getBoundingClientRect();
  let x = clientX - rect.left;
  x = Math.max(0, Math.min(x, rect.width));
  const percent = (x / rect.width) * 100;
  fillBar.style.width = percent + "%";
  document.getElementById("percent").innerHTML = `${Math.round(percent)}%`;
  player.volume = percent / 100;
}

// --- Playback Seekbar ---
function updateplaytime(clientX) {
  const rect = playBar.getBoundingClientRect();
  let x = clientX - rect.left;
  x = Math.max(0, Math.min(x, rect.width));
  const percent = (x / rect.width) * 100;
  PlayFillBar.style.width = percent + "%";
  player.currentTime = (percent / 100) * player.duration;
}

// --- Initialize Player Events ---
export function initPlayerEvents() {
  // Volume seekbar
  seekBar1.addEventListener("click", (e) => updateSeekBar(e.clientX));
  seekBar1.addEventListener("mousedown", (e) => { state.isDragging = true; updateSeekBar(e.clientX); });
  document.addEventListener("mousemove", (e) => { if (state.isDragging) updateSeekBar(e.clientX); });
  document.addEventListener("mouseup", () => { state.isDragging = false; });

  // Touch support for volume
  seekBar1.addEventListener("touchstart", (e) => { state.isDragging = true; updateSeekBar(e.touches[0].clientX); }, { passive: true });
  document.addEventListener("touchmove", (e) => { if (state.isDragging) updateSeekBar(e.touches[0].clientX); }, { passive: true });
  document.addEventListener("touchend", () => { state.isDragging = false; });

  // Playback seekbar
  playBar.addEventListener("click", (e) => updateplaytime(e.clientX));
  playBar.addEventListener("mousedown", (e) => { state.Draging = true; updateplaytime(e.clientX); });
  document.addEventListener("mousemove", (e) => { if (state.Draging) updateplaytime(e.clientX); });
  document.addEventListener("mouseup", () => { state.Draging = false; });

  // Touch support for playbar
  playBar.addEventListener("touchstart", (e) => { state.Draging = true; updateplaytime(e.touches[0].clientX); }, { passive: true });
  document.addEventListener("touchmove", (e) => { if (state.Draging) updateplaytime(e.touches[0].clientX); }, { passive: true });
  document.addEventListener("touchend", () => { state.Draging = false; });

  // Time update
  player.addEventListener("loadedmetadata", () => { durationSpan.textContent = formatTime(player.duration); });
  player.addEventListener("timeupdate", () => {
    currentTimeSpan.textContent = formatTime(player.currentTime);
    const percent = (player.currentTime / player.duration) * 100;
    playbarFill.style.width = `${percent}%`;
  });

  // Song ended
  player.addEventListener("ended", () => {
    if (sess === true) {
      logBehavior({ type: "complete", song: { songName: state.globalSongName, songId: state.globalSongId, artist: state.globalArtist } });
      playbackControl(state.globalLibrary, state.globalSongName);
    }
  });

  // Play/Pause buttons
  document.getElementById("play-svg").addEventListener("click", () => playpause());
  document.getElementById("pause-svg").addEventListener("click", () => playpause());

  // Forward/Backward
  document.getElementById("Forward").addEventListener("click", () => {
    if (sess === true) {
      logSkipBehavior("forward");
      playbackControl(state.globalLibrary, state.globalSongName, "forward");
    }
  });

  document.getElementById("Backward").addEventListener("click", () => {
    if (sess === true) {
      logSkipBehavior("backward");
      playbackControl(state.globalLibrary, state.globalSongName, "backward");
    }
  });

  // Shuffle / Repeat
  document.getElementById("Repeat").addEventListener("click", () => {
    document.getElementById("ShuffleOff").classList.remove("hidden");
    document.getElementById("Repeat").classList.add("hidden");
    state.ShuffleFlag = 1;
    state.RepeatFlag = 0;
    state.RepeatOneFlag = 0;
    popupAlert("Shuffle On");
  });

  document.getElementById("ShuffleOff").addEventListener("click", () => {
    document.getElementById("ShuffleOff").classList.add("hidden");
    document.getElementById("RepeatOnce").classList.remove("hidden");
    popupAlert("Loop Song");
    state.ShuffleFlag = 0;
    state.RepeatFlag = 0;
    state.RepeatOneFlag = 1;
  });

  document.getElementById("RepeatOnce").addEventListener("click", () => {
    document.getElementById("RepeatOnce").classList.add("hidden");
    document.getElementById("Repeat").classList.remove("hidden");
    state.ShuffleFlag = 0;
    state.RepeatFlag = 1;
    state.RepeatOneFlag = 0;
    popupAlert("Loop List");
  });
}

function logSkipBehavior(direction) {
  const playedTime = player.currentTime;
  const totalTime = player.duration;
  if (!state.globalSongId || !totalTime || isNaN(totalTime)) return;
  const completionRate = playedTime / totalTime;
  let interactionType = "play";
  if (completionRate >= 0.8) interactionType = "complete";
  else if (completionRate < 0.2) interactionType = "skip";
  logBehavior({ type: interactionType, song: { songName: state.globalSongName, songId: state.globalSongId, artist: state.globalArtist } });
}

// --- Keyboard Shortcuts ---
export function initKeyboardShortcuts() {
  document.addEventListener("keydown", (event) => {
    const activeId = document.activeElement.id;
    const isInput = ["search", "new-playlist-name", "searchInput", "searchPageInput", "playlistSearch"].includes(activeId);

    if (event.key === "ArrowUp") {
      event.preventDefault();
      let w = parseInt(fillBar.style.width) + 1;
      if (w <= 100) { fillBar.style.width = w + "%"; document.getElementById("percent").innerHTML = `${w}%`; player.volume = w / 100; }
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      let w = parseInt(fillBar.style.width) - 1;
      if (w >= 0) { fillBar.style.width = w + "%"; document.getElementById("percent").innerHTML = `${w}%`; player.volume = w / 100; }
    }
    if (event.key === "ArrowRight" && !event.ctrlKey) { event.preventDefault(); player.currentTime += 5; }
    if (event.key === "ArrowLeft" && !event.ctrlKey) { event.preventDefault(); player.currentTime -= 5; }
    if (event.ctrlKey && event.key === "k") { event.preventDefault(); document.getElementById("searchPageInput").focus(); }
    if (event.code === "Space" && !isInput) { event.preventDefault(); playpause(); }
    if (event.ctrlKey && event.key === "ArrowRight") { event.preventDefault(); playbackControl(state.globalLibrary, state.globalSongName, "forward"); }
    if (event.ctrlKey && event.key === "ArrowLeft") { event.preventDefault(); playbackControl(state.globalLibrary, state.globalSongName, "backward"); }
    if (event.key === "l" && !isInput) {
      const { recentlyDisplay, displayRecently: dispRecently } = await_import_recently();
    }
  });
}

// Helper to avoid top-level await
function await_import_recently() {
  import("./recently.js").then(({ recentlyDisplay, displayRecently }) => {
    recentlyDisplay();
    displayRecently();
  });
}

export { player };
