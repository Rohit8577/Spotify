// ============================================================
// Home Module — Home page sections and detail views
// ============================================================
import state from "./state.js";
import { highlight } from "./utils.js";
import { playsong, fetchSongs } from "./player.js";
import { updateInitialPlaylist, toggleDropdown, songToggleDropdown, addToPlaylist, playPlaylistSongs } from "./playlist.js";
import { addFavorite, addSearchSongFavorite } from "./favorites.js";
import { addToRecentActivity } from "./search.js";

export async function initializeHomePage() {
  const { navigateTo } = await import("./navigation.js");
  navigateTo({ view: "default-container-parent" });
  const res = await fetch(`/search?type=home&query=a`);
  const result = await res.json();
  const allData = result.data.data;

  const newReleasesKey = Object.keys(allData).find(key =>
    allData[key].title === "New Releases Pop - Hindi"
  );
  const finalNewReleasesData = newReleasesKey ? allData[newReleasesKey].data : [];

  await Trending(result.data.data.trending.data);
  await artistHome(result.data.data.artist_recos.data);
  await topCharts(result.data.data.charts.data);
  await newPlaylists(result.data.data.playlists.data);
  await newReleases(finalNewReleasesData);
  await newAlbum(result.data.data.albums.data);
  // Only load personalized recommendations for logged-in users
  if (sess === true) {
    // await loadMadeForYou();
  }
}

export async function loadMadeForYou() {
  if (state.loadingReco) return;
  state.loadingReco = true;
  const grid = document.getElementById("personalReco");
  const btnContainer = document.getElementById("load-more-foryou-container");
  if (!grid) return;
  if (btnContainer) btnContainer.innerHTML = '<button class="load-more-button" title="Personalizing Your Mix..." disabled><i class="bx bx-loader-alt bx-spin"></i></button>';
  try {
    const res = await fetch("/recommendations", { method: "GET", credentials: "include" });
    if (!res.ok) throw new Error("Network error");
    const data = await res.json();
    if (data.success && data.songs?.length > 0) {
      const fragment = document.createDocumentFragment();
      let firstNewCard = null;
      data.songs.forEach(song => {
        if (state.shownSongIds.has(song.id)) return;
        state.shownSongIds.add(song.id);
        const card = document.createElement("div");
        card.className = "item-card fade-in";
        card.innerHTML = `<img src="${song.image}" alt="${song.title}" class="item-card-image"><div class="item-card-title">${song.title}</div>`;
        card.addEventListener("click", () => { state.currentSong = song.id; playsong(song.image, song.title, song.artist, song.id, song.url, song.duration, song.type); });
        if (!firstNewCard) firstNewCard = card;
        fragment.appendChild(card);
      });
      grid.appendChild(fragment);
      if (firstNewCard) firstNewCard.scrollIntoView({ behavior: "smooth", block: "start" });
      if (btnContainer) btnContainer.innerHTML = `<button class="load-more-button" id="loadMoreForYouBtn" title="Load More For You"><i class="bx bx-chevron-down"></i></button>`;
      document.getElementById("loadMoreForYouBtn")?.addEventListener("click", loadMadeForYou);
    } else { if (btnContainer) btnContainer.innerHTML = '<p style="color:gray">No more recommendations right now.</p>'; }
  } catch (e) { console.error("Recommendation Error:", e); if (btnContainer) { btnContainer.innerHTML = `<button class="load-more-button" id="retryRecoBtn" title="Retry"><i class="bx bx-refresh"></i></button>`; document.getElementById("retryRecoBtn")?.addEventListener("click", loadMadeForYou); } }
  finally { state.loadingReco = false; }
}

async function newReleases(data) {
  const grid = document.getElementById("newReleasesGrid");
  if (grid) grid.innerHTML = "";
  data.forEach(item => {
    const card = document.createElement("div"); card.className = "item-card";
    card.innerHTML = `<img src="${item.image?.[2]?.link || ""}" alt="${item.name}" class="item-card-image"><div class="item-card-title">${item.name}</div>`;
    card.addEventListener("click", async () => {
      if (item.type === "song") { const req = await fetch(`/search?type=songID&query=${item.id}`); const r = await req.json(); const s = r.data.data.songs[0]; updateInitialPlaylist(s.id); state.currentSong = s.id; playsong(s.image[2].link, s.name, s.artist_map.artists[0].name, s.id, s.download_url[4].link, s.duration, "home"); }
      else if (item.type === "album") getAlbumDetails(item.id);
    });
    grid?.appendChild(card);
  });
}

async function Trending(data) {
  const grid = document.getElementById("newTrendingGrid");
  if (grid) grid.innerHTML = "";
  data.forEach(item => {
    const imgSrc = Array.isArray(item.image) ? item.image?.[2]?.link : item.image;
    const itemYear = item.year && item.year !== 0 ? item.year : (imgSrc?.match(/-(\d{4})-\d{14}-/)?.[1] || "");
    const card = document.createElement("div"); card.className = "item-card";
    card.innerHTML = `<img src="${imgSrc}" alt="${item.name}" class="item-card-image"><div class="item-card-title">${item.name}</div>${itemYear ? `<div class="item-card-subtitle">${itemYear}</div>` : ""}`;
    card.addEventListener("click", async () => {
      if (item.type === "song") { const req = await fetch(`/search?type=songID&query=${item.id}`); const r = await req.json(); const s = r.data.songs[0]; updateInitialPlaylist(s.id); state.currentSong = s.id; playsong(s.image[2].link, s.name, s.artist_map.artists[0].name, s.id, s.download_url[4].link, s.duration, "home"); }
      else if (item.type === "album") getAlbumDetails(item.id);
      else if (item.type === "playlist") getPlayListDetails(item.id, item.name, imgSrc);
    });
    grid?.appendChild(card);
  });
}

async function artistHome(data) {
  const grid = document.getElementById("featuredArtistGrid");
  if (grid) grid.innerHTML = "";
  data.forEach(item => {
    const imgSrc = Array.isArray(item.image) ? item.image?.[2]?.link : item.image;
    const itemYear = item.year && item.year !== 0 ? item.year : (imgSrc?.match(/-(\d{4})-\d{14}-/)?.[1] || "");
    const card = document.createElement("div"); card.className = "item-card";
    card.innerHTML = `<img src="${imgSrc}" alt="${item.name}" class="item-card-image"><div class="item-card-title">${item.name}</div>${itemYear ? `<div class="item-card-subtitle">${itemYear}</div>` : ""}`;
    card.addEventListener("click", () => getArtistDetails(item.id));
    grid?.appendChild(card);
  });
}

async function topCharts(data) {
  const grid = document.getElementById("newChartsGrid");
  if (grid) grid.innerHTML = "";
  data.forEach(item => {
    const imgSrc = Array.isArray(item.image) ? item.image?.[2]?.link : item.image;
    const card = document.createElement("div"); card.className = "item-card";
    card.innerHTML = `<img src="${imgSrc}" alt="${item.name}" class="item-card-image"><div class="item-card-title">${item.name}</div>`;
    card.addEventListener("click", () => getPlayListDetails(item.id, item.name, item.image));
    grid?.appendChild(card);
  });
}

async function newPlaylists(data) {
  const grid = document.getElementById("newPlaylistsGrid");
  if (grid) grid.innerHTML = "";
  data.forEach(item => {
    const imgSrc = Array.isArray(item.image) ? item.image?.[2]?.link : item.image;
    const card = document.createElement("div"); card.className = "item-card";
    card.innerHTML = `<img src="${imgSrc}" alt="${item.name}" class="item-card-image"><div class="item-card-title">${item.name}</div>`;
    card.addEventListener("click", () => getPlayListDetails(item.id, item.name, item.image));
    grid?.appendChild(card);
  });
}

async function newAlbum(data) {
  const grid = document.getElementById("featuredAlbumGrid");
  if (grid) grid.innerHTML = "";
  data.forEach(item => {
    const imgSrc = item.image?.[2]?.link || "";
    const itemYear = item.year && item.year !== 0 ? item.year : (imgSrc?.match(/-(\d{4})-\d{14}-/)?.[1] || "");
    const card = document.createElement("div"); card.className = "item-card";
    card.innerHTML = `<img src="${imgSrc}" alt="${item.name}" class="item-card-image"><div class="item-card-title">${item.name}</div>${itemYear ? `<div class="item-card-subtitle">${itemYear}</div>` : ""}`;
    card.addEventListener("click", async () => {
      if (item.type === "song") { const req = await fetch(`/search?type=songID&query=${item.id}`); const r = await req.json(); const s = r.data.data.songs[0]; updateInitialPlaylist(s.id); state.currentSong = s.id; playsong(s.image[2].link, s.name, s.artist_map.artists[0].name, s.id, s.download_url[4].link, s.duration, "home"); }
      else if (item.type === "album") getAlbumDetails(item.id);
      else if (item.type === "playlist") getPlayListDetails(item.id, item.name, item.image[2].link);
    });
    grid?.appendChild(card);
  });
}

// --- Detail views ---
export async function getAlbumDetails(albumId, isBack = false) {
  const { navigateTo } = await import("./navigation.js");
  if (!isBack) navigateTo({ view: "MainHomePage-2", type: "album", id: albumId });
  
  const mainHomePage = document.getElementById("MainHomePage-2");
  mainHomePage?.classList.remove("hidden");
  if (mainHomePage) mainHomePage.innerHTML = '<div class="placeholder-card">Loading Album Details...</div>';
  try {
    const response = await fetch(`/search?type=albumID&query=${albumId}`);
    const data = await response.json();
    const favRes = await fetch("/get-favorite"); const favResult = await favRes.json();
    if (data) {
      const album = data.data.data;
      addToRecentActivity({ type: "album", id: albumId, name: album.name, image: album.image[2].link, artist: album.artist_map.artists[0].name });
      const songsHtml = album.songs.map((song, i) => `<div class="song-list-item-1"><span class="song-number">${i + 1}</span><img src="${song.image[2].link}" alt="${song.name}" class="song-image"><div class="song-info" data-play='${JSON.stringify({ url: song.download_url[4].link, id: song.id, name: song.name, artist: song.artist_map.artists[0].name, image: song.image[2].link, duration: song.duration, source: "album", albumId })}'><div class="song-name text-white">${song.name}</div><div class="song-artist">${song.artist_map.artists[0].name}</div></div><div><i class="bx bxs-heart text-${favResult?.arr?.some(item => item.songId === song.id) ? "danger" : "gray"}" data-fav='${JSON.stringify({ url: song.download_url[4].link, image: song.image[2].link, name: song.name, artist: song.artist_map.artists[0].name, duration: song.duration, index: i, songId: song.id })}' title="Add to Like"></i></div><div class="relative" id="albumPlusIcon-${i}"><button class="play-button" data-dropdown='${JSON.stringify({ index: i, url: song.download_url[4].link, name: song.name, image: song.image[2].link, duration: song.duration, artist: song.artist_map.artists[0].name, songId: song.id })}' title="Add to Playlist">+</button></div></div>`).join("");
      mainHomePage.innerHTML = `<div class="detail-view"><div class="detail-header"><img src="${album.image[2].link}" alt="${album.name}" class="detail-image"><div class="detail-info"><h1 class="text-white">${album.name}</h1><p>${album.artist_map.artists[0].name} • ${album.year}</p><p>${album.song_count} songs</p><button class="play-all-button" id="playAllAlbumBtn">▶  Play All</button></div></div><div class="song-list">${songsHtml}</div></div>`;
      document.getElementById("playAllAlbumBtn")?.addEventListener("click", () => playSong(album.songs[0].download_url[4].link, album.songs[0].id, album.songs[0].name, album.songs[0].artist_map.artists[0].name, album.songs[0].image[2].link, album.songs[0].duration, "album", albumId));
      mainHomePage.querySelectorAll("[data-play]").forEach(el => el.addEventListener("click", () => { const d = JSON.parse(el.dataset.play); playSong(d.url, d.id, d.name, d.artist, d.image, d.duration, d.source, d.albumId); }));
      mainHomePage.querySelectorAll("[data-fav]").forEach(el => el.addEventListener("click", e => { e.stopPropagation(); const d = JSON.parse(el.dataset.fav); addFavorite(e, d.url, d.image, d.name, d.artist, d.duration, d.index, d.songId); }));
      mainHomePage.querySelectorAll("[data-dropdown]").forEach(el => el.addEventListener("click", e => { e.stopPropagation(); const d = JSON.parse(el.dataset.dropdown); toggleDropdown(e, d.index, d.url, d.name, d.image, d.duration, d.artist, d.songId); }));
    }
  } catch (e) { console.error("Album fetch error:", e); if (mainHomePage) mainHomePage.innerHTML = '<div class="placeholder-card">Error fetching album details.</div>'; }
}

export async function getArtistDetails(artistId, isBack = false) {
  const { navigateTo } = await import("./navigation.js");
  if (!isBack) navigateTo({ view: "MainHomePage-2", type: "artist", id: artistId });
  
  const mainHomePage = document.getElementById("MainHomePage-2");
  mainHomePage?.classList.remove("hidden");
  if (mainHomePage) mainHomePage.innerHTML = '<div class="placeholder-card">Loading Artist Details...</div>';
  try {
    const response = await fetch(`/search?type=artistID&query=${artistId}`);
    const data = await response.json();
    if (!data?.data) { if (mainHomePage) mainHomePage.innerHTML = '<div class="placeholder-card">Could not load artist details.</div>'; return; }
    const ad = data.data.data;
    addToRecentActivity({ type: "artist", id: artistId, name: ad.name, image: ad.image?.[2]?.link || "" });
    const topSongs = ad.top_songs || ad.topSongs || [];
    const topAlbums = ad.top_albums || ad.topAlbums || [];
    const newRel = ad.latest_release || [];
    const topPl = ad.featured_artist_playlist || [];

    const topSongsHtml = topSongs.length ? topSongs.map((s, i) => { const img = s.image?.[2]?.link || ""; const an = s.artist_map?.artists?.[0]?.name || s.subtitle?.split(" - ")[0] || "Unknown"; const dl = s.download_url?.[4]?.link || "#"; const dur = s.duration || "0"; return `<div class="song-list-item-1 artistTopSongs"><span class="song-number">${i + 1}</span><img src="${img}" alt="${s.name}" class="song-image"><div class="song-info" data-play='${JSON.stringify({ url: dl, id: s.id, name: s.name, artist: an, image: img, duration: dur, source: "artist", albumId: artistId })}'><div class="song-title text-white font-bold">${s.name}</div><div class="song-artist">${an}</div></div></div>`; }).join("") : '<p class="no-data">No Top Songs Found.</p>';

    const albumsHtml = topAlbums.map(a => `<div class="item-card" data-album="${a.id}"><img src="${a.image?.[2]?.link || ""}" alt="${a.name}" class="item-card-image"><div class="item-card-title">${a.name}</div><div class="item-card-subtitle">${a.year || ""}</div></div>`).join("");
    const relHtml = newRel.map(a => `<div class="item-card" data-album="${a.id}"><img src="${a.image?.[2]?.link || ""}" alt="${a.name}" class="item-card-image"><div class="item-card-title">${a.name}</div></div>`).join("");
    const plHtml = topPl.map(p => `<div class="item-card" data-playlist='${JSON.stringify({ id: p.id, name: p.name, image: p.image })}'><img src="${p.image || ""}" alt="${p.name}" class="item-card-image"><div class="item-card-title">${p.name}</div></div>`).join("");

    mainHomePage.innerHTML = `<div class="detail-view"><div class="detail-header artist-header"><img src="${ad.image?.[2]?.link || ""}" alt="${ad.name}" class="detail-image artist-image"><div class="detail-info"><h1 class="text-white">${ad.name}</h1><p>${parseInt(ad.follower_count || 0).toLocaleString()} Followers</p></div><div class="button"><button id="followArtistBtn"><i class="bx bx-plus font-bold"></i>Follow</button></div></div><div class="content-category"><h2>New Releases</h2><div class="content-grid">${relHtml}</div></div><div class="content-category"><h2>Top Songs</h2><div class="song-list">${topSongsHtml}</div></div><div class="content-category"><h2>Top Playlists</h2><div class="content-grid">${plHtml}</div></div><div class="content-category"><h2>Top Albums</h2><div class="content-grid">${albumsHtml}</div></div></div>`;

    document.getElementById("followArtistBtn")?.addEventListener("click", () => addArtist(artistId, ad.name));
    mainHomePage.querySelectorAll("[data-play]").forEach(el => el.addEventListener("click", () => { const d = JSON.parse(el.dataset.play); playSong(d.url, d.id, d.name, d.artist, d.image, d.duration, d.source, d.albumId); }));
    mainHomePage.querySelectorAll("[data-album]").forEach(el => el.addEventListener("click", () => getAlbumDetails(el.dataset.album)));
    mainHomePage.querySelectorAll("[data-playlist]").forEach(el => el.addEventListener("click", () => { const d = JSON.parse(el.dataset.playlist); getPlayListDetails(d.id, d.name, d.image); }));
  } catch (e) { console.error("Artist fetch error:", e); if (mainHomePage) mainHomePage.innerHTML = '<div class="placeholder-card">Error fetching artist details.</div>'; }
}

export async function getPlayListDetails(playlistId, playlistName, playlistImage, isBack = false) {
  const { navigateTo } = await import("./navigation.js");
  if (!isBack) navigateTo({ view: "MainHomePage-2", type: "playlist", id: playlistId, name: playlistName, image: playlistImage });
  
  addToRecentActivity({ type: "playlist", id: playlistId, name: playlistName, image: Array.isArray(playlistImage) ? playlistImage[2]?.link : playlistImage || "" });
  const mainHomePage = document.getElementById("MainHomePage-2");
  mainHomePage?.classList.remove("hidden");
  if (mainHomePage) mainHomePage.innerHTML = '<div class="placeholder-card">Loading Playlist Details...</div>';
  const res = await fetch(`/search?type=playlistID&query=${playlistId}`);
  const result = await res.json();
  let index = 1;
  let html = `<div class="playlist-details text-white"><div class="flex gap-5 items-center"><img src="${playlistImage}" class="h-150px rounded-lg"><h2>${playlistName || "My Playlist"}</h2><button class="play-button" id="addPlaylistBtn"> + </button></div></div><ul class="playlist-songs">`;
  result.data.data.songs.forEach(song => {
    html += `<li data-id="${song.id}" class="song-list-item mt-2 pointer font-bold"><div class="flex justify-center"><p>${index}</p></div><img src=${song.image[2].link} class="img-2 rounded"><div class="song-info" data-playsong='${JSON.stringify({ songId: song.id, playlistId })}'><div><p class="playlist-song-title">${song.name}</p></div><div><p class="text-sm text-gray">${song.artist_map.artists[0].name}</p></div></div><div><i class="bx bxs-heart text-gray" data-songfav='${JSON.stringify({ index, songId: song.id })}' title="Like"></i></div><div class="relative" id="albumPlusIcon-${index}"><button class="play-button" data-songdropdown='${JSON.stringify({ index, songId: song.id })}'>+</button></div></li>`;
    index++;
  });
  html += "</ul>";
  mainHomePage.innerHTML = html;
  document.getElementById("addPlaylistBtn")?.addEventListener("click", () => addToPlaylist(playlistId));
  mainHomePage.querySelectorAll("[data-playsong]").forEach(el => el.addEventListener("click", () => { const d = JSON.parse(el.dataset.playsong); playPlaylistSongs(d.songId, d.playlistId); }));
  mainHomePage.querySelectorAll("[data-songfav]").forEach(el => el.addEventListener("click", e => { e.stopPropagation(); const d = JSON.parse(el.dataset.songfav); addSearchSongFavorite(e, d.index, d.songId); }));
  mainHomePage.querySelectorAll("[data-songdropdown]").forEach(el => el.addEventListener("click", e => { e.stopPropagation(); const d = JSON.parse(el.dataset.songdropdown); songToggleDropdown(e, d.index, d.songId); }));
}

async function addArtist(id, artistName) {
  const res = await fetch("/addArtist", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  const result = await res.json();
  const { popupAlert } = await import("./utils.js");
  popupAlert(result.msg);
}

export function playSong(url, songId, title, artist, image, duration, source, id) {
  state.globalAlbumId = id;
  state.globalLibrary = source;
  state.currentSong = songId;
  highlight(title, source);
  addToRecentActivity({ type: "song", id: songId, name: title, image, artist, url, duration });
  playsong(image, title, artist, songId, url, duration, source);
}

// Make functions available globally for inline onclick handlers
window.getAlbumDetails = getAlbumDetails;
window.getArtistDetails = getArtistDetails;
window.getPlayListDetails = getPlayListDetails;
window.playSong = playSong;
window.addFavorite = addFavorite;
window.addSearchSongFavorite = addSearchSongFavorite;
window.toggleDropdown = toggleDropdown;
window.songToggleDropdown = songToggleDropdown;
window.addToPlaylist = addToPlaylist;
window.playPlaylistSongs = playPlaylistSongs;
