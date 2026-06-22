// ============================================================
// Player Module
// Core playback: play/pause, seekbar, volume, forward/backward
// ============================================================

import state from "./state.js";
import { formatTime, highlight, logBehavior, popupAlert } from "./utils.js";
import { initEqualizer } from "./equalizer.js";
import { updateRecently, displayRecently } from "./recently.js";
import { emitNowPlaying } from "./ws.js";
import { multiPlaybackControl } from "./multiPlaylist.js";

const player = document.getElementById("player");
const seekBar1 = document.getElementById("seekBar1");
const fillBar = document.getElementById("fillBar");
const playBar = document.getElementById("playbar-cont");
const PlayFillBar = document.getElementById("playbar-fill");
const currentTimeSpan = document.getElementById("currentTime");
const durationSpan = document.getElementById("duration");
const playbarFill = document.getElementById("playbar-fill");

// --- Media Session API ---
function setupMediaSession(title, artist, artworkUrl) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || 'Unknown Title',
      artist: artist || 'Unknown Artist',
      artwork: [
        { src: artworkUrl || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41', sizes: '512x512', type: 'image/jpeg' }
      ]
    });

    navigator.mediaSession.setActionHandler('play', () => { playpause(); });
    navigator.mediaSession.setActionHandler('pause', () => { playpause(); });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      const btn = document.getElementById("Backward");
      if (btn) btn.click();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      const btn = document.getElementById("Forward");
      if (btn) btn.click();
    });
  }
}

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

  // Turn on radio automatically for these sources
  if (["search", "home", "album", "artist", "song"].includes(source)) {
    state.autoPlayRecommendations = true;
    const autoPlayRecBtn = document.getElementById("AutoPlayRecBtn");
    if (autoPlayRecBtn) {
      autoPlayRecBtn.style.color = "#1db954";
      autoPlayRecBtn.title = "Autoplay Recommended (On)";
    }
  }

  initEqualizer();
  currentPlayingMusic(image, name, artist, id);
  // Update state immediately so playpause knows which player to toggle
  state.globalSongName = name;
  state.globalSongId = id;
  state.globalArtist = artist;
  state.aiCurrentSong = name;
  state.aiCurrentArtist = artist;

  const isYouTube = id.startsWith("youtube_") || source === "youtube";
  if (isYouTube) {
    // Play a silent audio track to keep the browser active in the background
    // This prevents mobile browsers from killing the YouTube iframe when the screen turns off.
    player.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    player.loop = true;
    player.play().catch(e => console.warn("Background audio play failed:", e));

    const videoId = id.replace("youtube_", "");
    
    // Initialize YouTube Player if not already done
    if (!state.ytPlayer && window.YT && window.YT.Player) {
      state.ytPlayer = new window.YT.Player('ytplayer', {
        height: '0',
        width: '0',
        videoId: videoId,
        events: {
          'onReady': (event) => {
            event.target.playVideo();
            playpause(true); // force UI update
          },
          'onStateChange': (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              event.target.stopVideo();
              handleSongEnded();
            }
          }
        }
      });
    } else if (state.ytPlayer && state.ytPlayer.loadVideoById) {
      state.ytPlayer.loadVideoById(videoId);
      state.ytPlayer.playVideo();
    }
  } else {
    // Normal HTML5 Audio
    if (state.ytPlayer && state.ytPlayer.stopVideo) {
      state.ytPlayer.stopVideo();
    }
    player.loop = false;
    player.src = url;
    player.play(); // Direct play instead of toggle
    playpause(true); // force UI to playing state
  }

  // Only save history for logged-in users
  if (sess === true) {
    await updateRecently(url, image, name, artist, duration, id);
    displayRecently();
  }

  // Only emit to WebSocket for logged-in users
  if (sess === true) {
    emitNowPlaying({ songName: name, artist, image, songId: id });
  }

  setupMediaSession(name, artist, image);
}

// --- Play / Pause Toggle ---
export function playpause(forceUIUpdate) {
  const playSVG = document.getElementById("play-svg");
  const pauseSVG = document.getElementById("pause-svg");

  const isYouTube = state.globalSongId && state.globalSongId.toString().startsWith("youtube_");

  if (isYouTube && typeof state.ytPlayer !== "undefined" && state.ytPlayer && state.ytPlayer.getPlayerState) {
    if (forceUIUpdate) {
        playSVG.style.display = "none";
        pauseSVG.style.display = "block";
        return;
    }
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
    if (forceUIUpdate) {
        playSVG.style.display = "none";
        pauseSVG.style.display = "block";
        return;
    }
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

  if (PlaylistName === "recommended" || PlaylistName === "search" || !PlaylistName) {
    highlightname = "recommended";
    try {
      const res = await fetch(`/search?type=recomended&query=${state.globalSongId}`);
      const recoJson = await res.json();
      const songs = recoJson.data?.data || recoJson.data || [];
      result = {
        arr: songs.map((song) => ({
          songUrl: song.download_url?.[4]?.link || song.downloadUrl?.[4]?.url || "",
          image: song.image?.[2]?.link || song.image?.[2]?.url || "",
          songName: song.name || "",
          artist: song.artist_map?.artists?.[0]?.name || song.artists?.primary?.[0]?.name || "",
          len: Number(song.duration) || 0,
          songId: song.id,
        }))
      };
    } catch (err) {
      console.error(err);
      result = { arr: [] };
    }
  } else if (
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

  if (!result || !result.arr || result.arr.length === 0) {
    console.warn("No songs found for playback control", PlaylistName);
    return;
  }

  const playSongFromResult = async (index) => {
    const song = result.arr[index];
    playsong(song.image, song.songName, song.artist, song.songId, song.songUrl, song.len, PlaylistName);
    highlight(song.songName, highlightname);
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
  
  const isYouTube = state.globalSongId && state.globalSongId.toString().startsWith("youtube_");
  if (isYouTube && state.ytPlayer && state.ytPlayer.seekTo) {
    const duration = state.ytPlayer.getDuration();
    if (duration) {
      state.ytPlayer.seekTo((percent / 100) * duration, true);
    }
  } else if (player.duration) {
    player.currentTime = (percent / 100) * player.duration;
  }
}

// Ensure YT time updates on UI
setInterval(() => {
  const isYouTube = state.globalSongId && state.globalSongId.toString().startsWith("youtube_");
  if (isYouTube && state.ytPlayer && state.ytPlayer.getCurrentTime) {
    const currentTime = state.ytPlayer.getCurrentTime() || 0;
    const duration = state.ytPlayer.getDuration() || 0;
    
    if (duration > 0) {
      currentTimeSpan.textContent = formatTime(currentTime);
      durationSpan.textContent = formatTime(duration);
      const percent = (currentTime / duration) * 100;
      playbarFill.style.width = `${percent}%`;
    }
  }
}, 500);

async function handleSongEnded() {
  if (sess === true) {
    logBehavior({ type: "complete", song: { songName: state.globalSongName, songId: state.globalSongId, artist: state.globalArtist } });
    if (state.multiPlaylistMode) {
      multiPlaybackControl("forward");
    } else if (state.autoPlayRecommendations) {
      await playNextRecommended();
    } else {
      playbackControl(state.globalLibrary, state.globalSongName);
    }
  }
}

// --- AutoPlay Recommended ---
export async function playNextRecommended() {
  if (!state.globalSongId) return;
  const isYouTube = state.globalSongId.toString().startsWith("youtube_");
  
  try {
    let url = `/search?type=recomended&query=${state.globalSongId}`;
    if (isYouTube) {
        const videoId = state.globalSongId.replace("youtube_", "");
        url = `/search?type=youtube_related&query=${videoId}`;
    }
    const res = await fetch(url);
    const result = await res.json();
    
    if (isYouTube) {
      const items = result.data.items;
      if (items && items.length > 0) {
        // filter out current
        const availableSongs = items.filter(s => s.id.videoId !== state.globalSongId.replace("youtube_", ""));
        const nextSong = availableSongs.length > 0 ? availableSongs[Math.floor(Math.random() * availableSongs.length)] : items[0];
        
        const songId = `youtube_${nextSong.id.videoId}`;
        const title = nextSong.snippet.title.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
        const channelTitle = nextSong.snippet.channelTitle;
        const image = nextSong.snippet.thumbnails.default.url;
        
        playsong(image, title, channelTitle, songId, songId, 0, "recommended");
      } else {
        popupAlert("No recommendations found.");
      }
      return;
    }

    const songs = result.data.data;
    if (songs && songs.length > 0) {
      const availableSongs = songs.filter(s => s.id !== state.globalSongId);
      const nextSong = availableSongs.length > 0 ? availableSongs[Math.floor(Math.random() * availableSongs.length)] : songs[0];
      const songUrl = nextSong.downloadUrl?.[4]?.url || nextSong.download_url?.[4]?.link || "";
      const image = nextSong.image?.[2]?.url || nextSong.image?.[2]?.link || "";
      const songName = nextSong.name || "";
      const artist = nextSong.artists?.primary?.map(a => a.name).join(", ") || nextSong.artist_map?.artists?.[0]?.name || "";
      const len = Number(nextSong.duration) || 0;
      const songId = nextSong.id;
      
      playsong(image, songName, artist, songId, songUrl, len, "recommended");
    } else {
      popupAlert("No recommendations found.");
      playbackControl(state.globalLibrary, state.globalSongName, "forward");
    }
  } catch (err) {
    console.error("Error fetching recommended:", err);
    if (!isYouTube) playbackControl(state.globalLibrary, state.globalSongName, "forward");
  }
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
  player.addEventListener("loadedmetadata", () => { 
    const isYouTube = state.globalSongId && state.globalSongId.toString().startsWith("youtube_");
    if (isYouTube) return;
    durationSpan.textContent = formatTime(player.duration); 
  });
  player.addEventListener("timeupdate", () => {
    const isYouTube = state.globalSongId && state.globalSongId.toString().startsWith("youtube_");
    if (isYouTube) return;
    currentTimeSpan.textContent = formatTime(player.currentTime);
    const percent = (player.currentTime / player.duration) * 100;
    playbarFill.style.width = `${percent}%`;
  });

  // Song ended
  player.addEventListener("ended", handleSongEnded);

  // Play/Pause buttons
  document.getElementById("play-svg").addEventListener("click", () => playpause());
  document.getElementById("pause-svg").addEventListener("click", () => playpause());

  // Forward/Backward
  document.getElementById("Forward").addEventListener("click", async () => {
    if (sess === true) {
      logSkipBehavior("forward");
      if (state.multiPlaylistMode) {
        multiPlaybackControl("forward");
      } else if (state.autoPlayRecommendations) {
        await playNextRecommended();
      } else {
        playbackControl(state.globalLibrary, state.globalSongName, "forward");
      }
    }
  });

  document.getElementById("Backward").addEventListener("click", () => {
    if (sess === true) {
      logSkipBehavior("backward");
      if (state.multiPlaylistMode) {
        multiPlaybackControl("backward");
      } else {
        playbackControl(state.globalLibrary, state.globalSongName, "backward");
      }
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

  // AutoPlay Recommended Toggle
  const autoPlayRecBtn = document.getElementById("AutoPlayRecBtn");
  if (autoPlayRecBtn) {
    autoPlayRecBtn.addEventListener("click", () => {
      state.autoPlayRecommendations = !state.autoPlayRecommendations;
      if (state.autoPlayRecommendations) {
        autoPlayRecBtn.style.color = "#1db954";
        autoPlayRecBtn.title = "Autoplay Recommended (On)";
        popupAlert("Autoplay Recommended: ON");
      } else {
        autoPlayRecBtn.style.color = "#b3b3b3";
        autoPlayRecBtn.title = "Autoplay Recommended (Off)";
        popupAlert("Autoplay Recommended: OFF");
      }
    });
  }
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

    if (event.key === "ArrowUp" && !isInput) {
      event.preventDefault();
      let w = parseInt(fillBar.style.width) + 1;
      if (w <= 100) { fillBar.style.width = w + "%"; document.getElementById("percent").innerHTML = `${w}%`; player.volume = w / 100; }
    }
    if (event.key === "ArrowDown" && !isInput) {
      event.preventDefault();
      let w = parseInt(fillBar.style.width) - 1;
      if (w >= 0) { fillBar.style.width = w + "%"; document.getElementById("percent").innerHTML = `${w}%`; player.volume = w / 100; }
    }
    if (event.key === "ArrowRight" && !event.ctrlKey && !isInput) { 
      event.preventDefault(); 
      const isYouTube = state.globalSongId && state.globalSongId.toString().startsWith("youtube_");
      if (isYouTube && state.ytPlayer && state.ytPlayer.getCurrentTime) {
        state.ytPlayer.seekTo(state.ytPlayer.getCurrentTime() + 5, true);
      } else {
        player.currentTime += 5; 
      }
    }
    if (event.key === "ArrowLeft" && !event.ctrlKey && !isInput) { 
      event.preventDefault(); 
      const isYouTube = state.globalSongId && state.globalSongId.toString().startsWith("youtube_");
      if (isYouTube && state.ytPlayer && state.ytPlayer.getCurrentTime) {
        state.ytPlayer.seekTo(state.ytPlayer.getCurrentTime() - 5, true);
      } else {
        player.currentTime -= 5; 
      }
    }
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
