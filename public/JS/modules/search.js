// ============================================================
// Search Module
// ============================================================
import state from "./state.js";
import { debounce, formatTime } from "./utils.js";
import { playsong } from "./player.js";
import { favorite } from "./favorites.js";
import { updateInitialPlaylist } from "./playlist.js";

export function initInlineSearch() {
  const searchInput = document.getElementById("search");
  const resultsList = document.getElementById("results");
  searchInput?.addEventListener("input", async () => {
    const query = searchInput.value.trim();
    resultsList.innerHTML = "";
    document.querySelector(".inpSongList").style.display = "block";
    if (!query.length) return;
    try {
      const res = await fetch(`/search?type=song&query=${encodeURIComponent(query)}`);
      const data = await res.json();
      const songs = data.data.data.results;
      if (songs) {
        songs.slice(0, 7).forEach(song => {
          const li = document.createElement("li");
          li.innerHTML = `<img src="${song.image[2].link}" alt="${song.name}" style="width:50px;height:50px;border-radius:4px;margin-right:10px;"><span><b>${song.name}</b> - <strong>${song.artist_map.artists[0].name}</strong></span>`;
          li.style.cssText = "display:flex;align-items:center;gap:10px";
          li.addEventListener("click", () => { updateInitialPlaylist(song.id); document.querySelector(".inpSongList").style.display = "none"; addToRecentActivity({ type: "song", id: song.id, name: song.name, image: song.image[2].link, artist: song.artist_map.artists[0].name, url: song.download_url[4].link, duration: song.duration }); playsong(song.image[2].link, song.name, song.artist_map.artists[0].name, song.id, song.download_url[4].link, song.duration, "search"); });
          resultsList.appendChild(li);
        });

      } else { resultsList.innerHTML = "<li>No results found</li>"; }
    } catch (err) { resultsList.innerHTML = "<li>API Error</li>"; }
  });
}

export async function Search(query) {
  document.getElementById("SearchContainer")?.classList.remove("hidden");
  document.getElementById("AiSearch")?.classList.add("hidden");
  const r = await fetch(`/search?type=song&query=${encodeURIComponent(query)}`);
  const data = await r.json();
  const ul = document.getElementById("searchResultSong");
  if (ul) ul.innerHTML = "";
  data.data.data.results.forEach((song, index) => {
    const li = document.createElement("li");
    li.className = "Search-song-item";
    const time = `${Math.floor(song.duration/60)}:${Math.floor(song.duration%60).toString().padStart(2,"0")}`;
    const uniqueId = `search-${song.id}-${index}`;
    li.innerHTML = `<img src="${song.image[2].link}" alt=""><span class="song-title"><b>${song.name}</b> - <strong>${song.artist_map.artists[0].name}</strong></span><span class="song-length font-bold">${time}</span><i class="bx bxs-heart text-gray hearts-icon" title="Add to Like"></i><div class="relative" id="albumPlusIcon-${uniqueId}"><button class="play-button" title="Add to Playlist"> + </button></div>`;
    li.addEventListener("click", () => { state.currentSong = song.id; addToRecentActivity({ type: "song", id: song.id, name: song.name, image: song.image[2].link, artist: song.artist_map.artists[0].name, url: song.download_url[4].link, duration: song.duration }); playsong(song.image[2].link, song.name, song.artist_map.artists[0].name, song.id, song.download_url[4].link, song.duration, "search"); });
    li.querySelector(".hearts-icon").addEventListener("click", e => { e.stopPropagation(); favorite(song.download_url[4].link, song.image[2].link, song.name, song.artist_map.artists[0].name, song.duration, song.id); });
    li.querySelector(".play-button").addEventListener("click", async e => {
      e.stopPropagation();
      if (sess !== true) {
        import("./utils.js").then(({ popupAlert }) => popupAlert("Please Sign Up to create playlists"));
        return;
      }
      const { toggleDropdown } = await import("./playlist.js");
      toggleDropdown(e, uniqueId, song.download_url[4].link, song.name, song.image[2].link, song.duration, song.artist_map.artists[0].name, song.id);
    });
    ul?.appendChild(li);
  });


}

export async function SearchYouTube(query) {
  document.getElementById("SearchContainer")?.classList.remove("hidden");
  document.getElementById("AiSearch")?.classList.add("hidden");
  const ul = document.getElementById("searchResultSong");
  if (ul) ul.innerHTML = `<div class="flex justify-center p-4 text-red-500"><i class="fa-solid fa-spinner fa-spin text-2xl"></i></div>`;
  
  try {
    const r = await fetch(`/search?type=youtube&query=${encodeURIComponent(query)}`);
    const data = await r.json();
    
    if (ul) ul.innerHTML = "";
    
    if (!data.data || !data.data.items || data.data.items.length === 0) {
       if (ul) ul.innerHTML = "<li class='p-4 text-center'>No results found on YouTube.</li>";
       return;
    }

    data.data.items.forEach((item, index) => {
      if (item.id.kind !== "youtube#video") return;
      const songId = `youtube_${item.id.videoId}`;
      const title = item.snippet.title.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
      const channelTitle = item.snippet.channelTitle;
      const image = item.snippet.thumbnails.default.url;
      const duration = 0; // YouTube Data API snippet doesn't return duration. We'll rely on player.js

      const li = document.createElement("li");
      li.className = "Search-song-item";
      const uniqueId = `search-yt-${songId}-${index}`;
      li.innerHTML = `<img src="${image}" alt=""><span class="song-title"><b>${title}</b> - <strong>${channelTitle}</strong></span><span class="song-length font-bold"><i class="fa-brands fa-youtube text-red-500"></i></span><i class="bx bxs-heart text-gray hearts-icon" title="Add to Like"></i><div class="relative" id="albumPlusIcon-${uniqueId}"><button class="play-button" title="Add to Playlist"> + </button></div>`;
      
      li.addEventListener("click", () => { 
        state.currentSong = songId; 
        addToRecentActivity({ type: "song", id: songId, name: title, image: image, artist: channelTitle, url: songId, duration: duration }); 
        playsong(image, title, channelTitle, songId, songId, duration, "youtube"); 
      });
      
      li.querySelector(".hearts-icon").addEventListener("click", e => { 
        e.stopPropagation(); 
        favorite(songId, image, title, channelTitle, duration, songId); 
      });
      
      li.querySelector(".play-button").addEventListener("click", async e => {
        e.stopPropagation();
        if (sess !== true) {
          import("./utils.js").then(({ popupAlert }) => popupAlert("Please Sign Up to create playlists"));
          return;
        }
        const { toggleDropdown } = await import("./playlist.js");
        toggleDropdown(e, uniqueId, songId, title, image, duration, channelTitle, songId);
      });
      ul?.appendChild(li);
    });
  } catch (error) {
    if (ul) ul.innerHTML = "<li class='p-4 text-center text-red-500'>Error fetching YouTube results. Ensure API key is set.</li>";
  }
}

export async function OnlineSearch(query, source) {
  if (source === "SongContainer") { Search(query); return; }
  const typeMap = { AlbumContainer: "album", ArtistContainer: "artist", PlaylistContainer: "playlist" };
  const res = await fetch(`/search?type=${typeMap[source]}&query=${encodeURIComponent(query)}`);
  const response = await res.json();
  fetchAndDisplayArtist(response.data.data.results, source);
}

function fetchAndDisplayArtist(items, source) {
  const grid = document.getElementById(source);
  if (grid) grid.innerHTML = "";
  items.forEach(artist => {
    const card = document.createElement("div");
    card.className = "item-card";
    const imgSrc = Array.isArray(artist.image) ? artist.image[2]?.link : artist.image || "https://cdn-icons-png.flaticon.com/512/847/847969.png";
    
    let subtitleText = "Artist";
    if (source === "AlbumContainer") subtitleText = "Album";
    else if (source === "PlaylistContainer") subtitleText = "Playlist";
    else if (artist.role) subtitleText = artist.role;
    
    card.innerHTML = `<img src="${imgSrc}" alt="${artist.name}" class="item-card-image ${source==="ArtistContainer"?"artist-image":""}"><div class="item-card-title">${artist.name}</div><div class="item-card-subtitle">${subtitleText}</div>`;
    card.addEventListener("click", async () => {
      document.getElementById("Search-History")?.classList.add("hidden");
      const typeMap = { ArtistContainer: "artist", AlbumContainer: "album", PlaylistContainer: "playlist" };
      addToRecentActivity({ type: typeMap[source] || "artist", id: artist.id, name: artist.name, image: imgSrc });
      const { getArtistDetails, getAlbumDetails, getPlayListDetails } = await import("./home.js");
      if (source === "ArtistContainer") getArtistDetails(artist.id);
      else if (source === "AlbumContainer") getAlbumDetails(artist.id);
      else if (source === "PlaylistContainer") getPlayListDetails(artist.id, artist.name, artist.image);
    });
    grid?.appendChild(card);
  });
}

export async function performSmartSearch(userVibe) {
  const resultList = document.getElementById("AiSearch");
  document.getElementById("SearchContainer")?.classList.add("hidden");
  resultList?.classList.remove("hidden");
  if (resultList) resultList.innerHTML = `<div class="flex flex-col items-center justify-center p-8 text-gray-400 gap-4"><i class="fa-solid text-white fa-compact-disc fa-spin text-4xl text-purple-500"></i><span class="text-lg text-white animate-pulse">AI is curating for "${userVibe}"...</span></div>`;
  try {
    const response = await fetch(`/smart-playlist?vibe=${encodeURIComponent(userVibe)}`);
    const data = await response.json();
    if (data.success && data.songs.length > 0) {
      if (resultList) resultList.innerHTML = "";
      const header = document.createElement("li");
      header.className = "text-purple-400 text-xl font-bold px-2 mb-2 text-sm ul-none uppercase tracking-wider";
      header.innerText = `✨ AI Curated: ${data.vibe}`;
      resultList?.appendChild(header);
      data.songs.forEach((song, i) => setTimeout(() => renderSongCard(song, resultList, i), i * 100));
    } else { if (resultList) resultList.innerHTML = `<p class="p-4 text-danger font-bold text-center">😕 No results. Try "Party songs".</p>`; }
  } catch (e) { if (resultList) resultList.innerHTML = `<p class="p-4 text-danger font-bold text-center">Server Error.</p>`; }
}

function renderSongCard(song, container, index) {
  const li = document.createElement("li");
  li.className = "Search-song-item";
  const uniqueId = `search-${song.id}-${index}`;
  li.innerHTML = `<img src="${song.image_url}" alt=""><span><span class="song-title"><b>${song.title}</b></span><div class="text-sm text-gray"><strong>${song.artist}</strong></div></span><span class="song-length font-bold">${formatTime(song.duration)}</span><i class="bx bxs-heart text-gray hearts-icon" title="Add to Liked"></i><div class="relative" id="albumPlusIcon-${uniqueId}"><button class="play-button" title="Add to Playlist"> + </button></div>`;
  li.addEventListener("click", () => { state.currentSong = song.id; addToRecentActivity({ type: "song", id: song.id, name: song.title, image: song.image_url, artist: song.artist, url: song.audio_url, duration: song.duration }); playsong(song.image_url, song.title, song.artist, song.id, song.audio_url, song.duration, "search"); });
  li.querySelector(".hearts-icon").addEventListener("click", e => { e.stopPropagation(); favorite(song.audio_url, song.image_url, song.title, song.artist, song.duration, song.id); });
  li.querySelector(".play-button").addEventListener("click", async e => {
    e.stopPropagation();
    if (sess !== true) {
      import("./utils.js").then(({ popupAlert }) => popupAlert("Please Sign Up to create playlists"));
      return;
    }
    const { toggleDropdown } = await import("./playlist.js");
    toggleDropdown(e, uniqueId, song.audio_url, song.title, song.image_url, song.duration, song.artist, song.id);
  });
  container?.appendChild(li);
}

export function initVoiceSearch() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  const recognition = new SR();
  recognition.continuous = false; recognition.lang = "en-IN"; recognition.interimResults = false;
  document.getElementById("micBtn")?.addEventListener("click", () => { recognition.start(); });
  recognition.onresult = e => { const t = e.results[0][0].transcript; const inp = document.getElementById("searchPageInput"); if (inp) inp.value = t; Search(t); };
  recognition.onerror = e => console.error("Voice error:", e.error);
}

export function addToRecentActivity(item) {
  // item: { type: 'song'|'album'|'artist'|'playlist', id, name, image, artist?, duration? }
  // Remove duplicate by id
  state.recentActivity = state.recentActivity.filter(a => a.id !== item.id);
  // Add to front
  state.recentActivity.unshift(item);
  // Keep max 20
  if (state.recentActivity.length > 20) state.recentActivity.length = 20;
  localStorage.setItem("recentActivity", JSON.stringify(state.recentActivity));
  renderRecentActivity();
}

export function renderRecentActivity() {
  const container = document.getElementById("recentActivityGrid");
  const section = document.getElementById("recentActivitySection");
  if (!container || !section) return;
  if (state.recentActivity.length === 0) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";
  container.innerHTML = "";
  state.recentActivity.forEach(item => {
    const card = document.createElement("div");
    card.className = "recent-activity-card";
    const typeIcon = { song: "bx-music", album: "bx-album", artist: "bx-microphone", playlist: "bx-list-ul" }[item.type] || "bx-history";
    const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);
    card.innerHTML = `
      <img src="${item.image || ""}" alt="${item.name}" class="recent-activity-img ${item.type === "artist" ? "artist-round" : ""}">
      <div class="recent-activity-info">
        <p class="recent-activity-name">${item.name}</p>
        <span class="recent-activity-type"><i class="bx ${typeIcon}"></i> ${typeLabel}${item.artist ? " • " + item.artist : ""}</span>
      </div>
      <button class="recent-activity-remove" title="Remove" data-id="${item.id}">&times;</button>
    `;
    // Click to replay
    card.addEventListener("click", async (e) => {
      if (e.target.closest(".recent-activity-remove")) return;
      if (item.type === "song" && item.url) {
        state.currentSong = item.id;
        playsong(item.image, item.name, item.artist || "", item.id, item.url, item.duration || 0, "search");
      } else if (item.type === "album") {
        const { getAlbumDetails } = await import("./home.js");
        getAlbumDetails(item.id);
      } else if (item.type === "artist") {
        const { getArtistDetails } = await import("./home.js");
        getArtistDetails(item.id);
      } else if (item.type === "playlist") {
        const { getPlayListDetails } = await import("./home.js");
        getPlayListDetails(item.id, item.name, item.image);
      }
    });
    // Remove button
    card.querySelector(".recent-activity-remove").addEventListener("click", (e) => {
      e.stopPropagation();
      state.recentActivity = state.recentActivity.filter(a => a.id !== item.id);
      localStorage.setItem("recentActivity", JSON.stringify(state.recentActivity));
      renderRecentActivity();
    });
    container.appendChild(card);
  });
}

export function initSearchHistory() {
  const clearBtn = document.getElementById("clearHistoryBtn");
  clearBtn?.addEventListener("click", () => {
    state.recentActivity = [];
    localStorage.removeItem("recentActivity");
    renderRecentActivity();
  });
  renderRecentActivity();
}

export function initSearchPageEvents() {
  const handleSearch = debounce(() => {
    const query = document.getElementById("searchPageInput")?.value.trim();
    if (!query) return;
    ["SongContainer","ArtistContainer","PlaylistContainer","AlbumContainer"].forEach(id => { 
      if (!document.getElementById(id)?.classList.contains("hidden") && !state.isAiMode) {
          if (state.isYtMode && id === "SongContainer") {
              SearchYouTube(query);
          } else if (!state.isYtMode) {
              OnlineSearch(query, id);
          }
      } 
    });
  }, 500);
  document.getElementById("searchPageInput")?.addEventListener("input", handleSearch);
  document.getElementById("searchPageInput")?.addEventListener("keydown", async e => { if (e.key === "Enter") { const q = document.getElementById("searchPageInput")?.value.trim(); if (q && state.isAiMode) await performSmartSearch(q); } });

  const tabs = { SearchContainerOptionSong: {s:"SongContainer",h:["AlbumContainer","ArtistContainer","PlaylistContainer"]}, SearchContainerOptionArtist: {s:"ArtistContainer",h:["SongContainer","AlbumContainer","PlaylistContainer"]}, SearchContainerOptionAlbum: {s:"AlbumContainer",h:["SongContainer","ArtistContainer","PlaylistContainer"]}, SearchContainerOptionPlaylist: {s:"PlaylistContainer",h:["SongContainer","AlbumContainer","ArtistContainer"]} };
  Object.entries(tabs).forEach(([id, c]) => { document.getElementById(id)?.addEventListener("click", () => { c.h.forEach(i => document.getElementById(i)?.classList.add("hidden")); document.getElementById(c.s)?.classList.remove("hidden"); const q = document.getElementById("searchPageInput")?.value.trim(); if (q) OnlineSearch(q, c.s); if (c.s !== "SongContainer") { const el = document.getElementById(c.s); if (el) el.innerHTML = "Searching"; } }); });

  // AI Toggle
  const searchInput = document.getElementById("searchPageInput");
  const searchWrapper = document.getElementById("searchWrapper");
  const aiBtn = document.getElementById("aiToggleBtn");
  aiBtn?.addEventListener("click", () => { state.isAiMode = !state.isAiMode; searchWrapper?.classList.toggle("ai-glow-mode", state.isAiMode); searchWrapper?.classList.toggle("normal-focus-mode", !state.isAiMode); aiBtn?.classList.toggle("ai-icon-active", state.isAiMode); if (searchInput) searchInput.placeholder = state.isAiMode ? "✨ Describe a vibe..." : "Search for Artists or Albums..."; if (state.isAiMode) searchInput?.focus(); });
  searchInput?.addEventListener("focus", () => { if (!state.isAiMode) searchWrapper?.classList.add("normal-focus-mode"); });
  searchInput?.addEventListener("blur", () => searchWrapper?.classList.remove("normal-focus-mode"));

  // YT Toggle
  const ytBtn = document.getElementById("ytToggleBtn");
  ytBtn?.addEventListener("click", () => {
      state.isYtMode = !state.isYtMode;
      if (state.isYtMode) {
          ytBtn.style.color = "red";
          document.getElementById("SearchContainerOptionSong")?.click(); // Auto switch to song tab
          if (searchInput) {
              searchInput.placeholder = "Search YouTube Videos...";
              searchInput.focus();
              const query = searchInput.value.trim();
              if (query) SearchYouTube(query);
          }
      } else {
          ytBtn.style.color = "#aaa";
          if (searchInput) {
              searchInput.placeholder = "Search for Artists or Albums...";
              searchInput.focus();
              const query = searchInput.value.trim();
              if (query) OnlineSearch(query, "SongContainer");
          }
      }
  });
}
