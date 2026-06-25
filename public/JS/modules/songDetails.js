// ============================================================
// Song Details Module — Now Playing details page
// ============================================================
import state from "./state.js";
import { formatTime } from "./utils.js";
import { playSong } from "./home.js";

export async function currentPlayingSongDetails(id) {
  if (id && id.toString().startsWith("youtube_")) {
    document.querySelector(".cover-art-section img").src = state.globalImage || document.getElementById("currentPlayingSongImg")?.src || "";
    document.querySelector(".song-main-info").innerHTML = `<h1>${state.globalSongName}</h1><p class="artist-names">${state.globalArtist}</p><p class="album-name">YouTube Audio</p>`;
    document.querySelector(".action-buttons").innerHTML = `<button class="add-to-playlist-btn" id="ytAddToPlaylist">Add to Playlist</button><button class="share-song-btn" id="shareSongFromDetails">Share Song</button><button class="more-options-btn">...</button>`;
    
    document.getElementById("shareSongFromDetails")?.addEventListener("click", () => {
      import("./ws.js").then(({ openSongShareModal }) => openSongShareModal());
    });
    
    document.getElementById("ytAddToPlaylist")?.addEventListener("click", (e) => {
      import("./playlist.js").then(({ toggleDropdown }) => toggleDropdown(e, "yt-details", id, state.globalSongName, document.getElementById("currentPlayingSongImg")?.src || "", 0, state.globalArtist, id));
    });
    return;
  }

  const [songRes, recoRes] = await Promise.all([
    fetch(`/search?type=songID&query=${id}`),
    fetch(`/search?type=recomended&query=${id}`)
  ]);
  const result = await songRes.json();
  const reco_result = await recoRes.json();
  const song = result.data.songs ? result.data.songs[0] : result.data.data.songs[0];
  const artistId = song.artist_map?.artists?.[0]?.id || "";
  let artist_res = { data: {} };
  if (artistId) {
    const artist_req = await fetch(`/search?type=artistID&query=${artistId}`);
    artist_res = await artist_req.json();
  }

  const minute = Math.floor(song.duration / 60);
  const second = Math.floor(song.duration % 60);

  document.querySelector(".cover-art-section img").src = song.image[2].link || song.image[2].url;
  document.querySelector(".song-main-info").innerHTML = `<h1>${song.name}</h1><p class="artist-names">${song.artist_map?.artists?.[0]?.name || song.primaryArtists}</p><p class="album-name">${song.album?.name || song.album}</p>`;
  document.querySelector(".action-buttons").innerHTML = `<button class="add-to-playlist-btn">Add to Playlist</button><button class="share-song-btn" id="shareSongFromDetails">Share Song</button><button class="more-options-btn">...</button>`;

  // Share button in details page
  document.getElementById("shareSongFromDetails")?.addEventListener("click", () => {
    import("./ws.js").then(({ openSongShareModal }) => openSongShareModal());
  });

  document.querySelector(".text-details-section").innerHTML = `
    <div class="about-section"><h3>About the Song</h3><p><strong>Release Date:</strong> ${song.release_date}</p><p><strong>Duration:</strong> ${minute}:${second.toString().padStart(2,"0")}</p></div>
    <div class="lyrics-section"><h3>Lyrics</h3><div class="lyrics-content-wrapper active" id="lyrics-content"><p class="lyrics-text" id="lyrics-text-container"><span class="text-gray-400 flex items-center gap-2"><i class="fa-solid fa-compact-disc fa-spin"></i> Fetching lyrics...</span></p></div><button class="toggle-lyrics-btn" id="toggleLyricsBtn" style="display:none;">Read More...</button></div>`;

  renderRecommendations(reco_result);
  renderRelatedArtists(song.artist_map.artists);
  renderSameArtistSongs(artist_res.data);
  loadLyricsInBackground(song.id);
}

async function loadLyricsInBackground(id) {
  try {
    const ly = await fetch(`/search?type=lyrics&query=${id}`);
    const ly_result = await ly.json();
    const container = document.getElementById("lyrics-text-container");
    const btn = document.getElementById("toggleLyricsBtn");
    if (ly_result.data.status === "Success") {
      if (container) container.innerHTML = ly_result.data.data.lyrics.replace(/\n/g, "<br>");
      if (btn) btn.style.display = "block";
    } else { if (container) container.innerHTML = "Lyrics not available."; }
  } catch (e) { const c = document.getElementById("lyrics-text-container"); if (c) c.innerHTML = "Failed to load lyrics."; }
}

function renderRecommendations(reco_result) {
  const container = document.querySelector(".song-list-horizontal");
  if (container) container.innerHTML = "";
  reco_result.data.data.forEach(song => {
    const div = document.createElement("div");
    div.className = "song-card-horizontal";
    div.innerHTML = `<img src="${song.image[2].link}" alt="Cover" class="h-200px"><div class="song-infos"><span class="song-titles">${song.name}</span><span class="song-artist">${song.artist_map.artists[0].name}</span></div><button class="play-small-btn"><i class="fa-solid fa-play"></i></button>`;
    div.querySelector(".play-small-btn").addEventListener("click", () => playSong(song.download_url[4].link, song.id, song.name, song.artist_map.artists[0].name, song.image[2].link, song.duration, "", ""));
    container?.appendChild(div);
  });
}

function renderRelatedArtists(artists) {
  const container = document.querySelector(".artist-list-horizontal");
  if (container) container.innerHTML = "";
  artists.forEach(artist => {
    const imgSrc = Array.isArray(artist.image) ? artist.image[2].link : "https://cdn-icons-png.flaticon.com/512/847/847969.png";
    const div = document.createElement("div");
    div.className = "artist-card-horizontal";
    div.innerHTML = `<img src="${imgSrc}" class="artist-photo"><span class="artist-name">${artist.name}</span>`;
    div.addEventListener("click", async () => { const { getArtistDetails } = await import("./home.js"); getArtistDetails(artist.id); });
    container?.appendChild(div);
  });
}

function renderSameArtistSongs(artist_res) {
  const container = document.getElementById("song-list-horizontal");
  if (container) container.innerHTML = "";
  artist_res.data.top_songs.forEach(song => {
    const div = document.createElement("div");
    div.className = "song-card-horizontal";
    div.innerHTML = `<img src="${song.image[2].link}"><div class="song-info"><span class="song-title">${song.name}</span><span class="song-artist">${song.artist_map.artists[0].name}</span></div><button class="play-small-btn"><i class="fa-solid fa-play"></i></button>`;
    div.querySelector(".play-small-btn").addEventListener("click", () => playSong(song.download_url[4].link, song.id, song.name, song.artist_map.artists[0].name, song.image[2].link, song.duration, "", ""));
    container?.appendChild(div);
  });
}

export function initLyricsToggle() {
  document.addEventListener("click", e => {
    if (e.target?.id === "toggleLyricsBtn") {
      const lyricsContent = document.getElementById("lyrics-content");
      if (lyricsContent) {
        const isExpanded = lyricsContent.classList.toggle("expanded");
        e.target.textContent = isExpanded ? "Show Less" : "Read More...";
      }
    }
  });
}
