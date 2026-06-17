// ============================================================
// Playlist Module
// Playlist CRUD, song management within playlists
// ============================================================

import state from "./state.js";
import { popupAlert, highlight, logBehavior, downloadSong } from "./utils.js";
import { playsong } from "./player.js";
import { favorite } from "./favorites.js";

const mq = window.matchMedia("(max-width: 768px)");

// --- Fetch and Display Playlists ---
export async function fetchPlaylist() {
  document.querySelector(".playlists")?.querySelector("div")?.classList.add("hidden");
  document.querySelector(".sidebar1")?.classList.add("hidden");
  const playlistsEl = document.querySelector(".playlists");
  if (playlistsEl) playlistsEl.style.display = "block";

  const res = await fetch("/fetchplaylist");
  const result = await res.json();
  if (res.status === 200) {
    const plUl = document.querySelector(".playlists")?.querySelector("ul");
    if (plUl) plUl.innerHTML = "";
    if (result.array.length === 0) {
      document.querySelector(".playlists")?.querySelector("div")?.classList.remove("hidden");
      const plDiv = document.querySelector(".playlists")?.querySelector("div");
      if (plDiv) plDiv.innerHTML = "No Playlist";
    } else {
      result.array.forEach((name) => {
        const li = document.createElement("li");
        li.className = "flex items-center gap-2 justify-between";
        li.innerHTML = `
          <div class="flex gap-2 items-center">
            <img src="${name.image}" class="rounded h-60px">
            <p class="font-bold text-xl">${name.name}</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" id="Arrow" class="svg">
            <path fill="none" stroke="#fdfffd" d="m5.357 2.464 5 5.093-5 5.092" class="colorStroke249fe6 svgStroke"></path>
          </svg>`;

        li.addEventListener("click", async () => {
          document.getElementById("leftarrow")?.classList.remove("hidden");
          document.querySelector(".likedSongList")?.classList.add("hidden");
          document.querySelector(".MainProfileContainer")?.classList.add("hidden");
          librarySongs(name.name);
          const { homename, MQchange } = await import("./navigation.js");
          homename("music", name.name);
          if (mq.matches) MQchange();
        });

        document.querySelector(".playlists")?.querySelector("ul").appendChild(li);
      });
    }
  }
}

// --- Library Songs (show songs inside a playlist) ---
export async function librarySongs(name) {
  const { navigateTo } = await import("./navigation.js");
  navigateTo({ view: "mainSongContent" });

  const res1 = await fetch("/fetchplaylist");
  const result1 = await res1.json();
  const res = await fetch("/librarySongs", {
    method: "post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pname: name }),
  });
  const result = await res.json();

  document.querySelector(".OnlineSongList")?.classList.remove("hidden");
  const playlistData = result1.array.find((p) => p.name === name);
  const fav_res = await fetch("/get-favorite");
  const fav_result = await fav_res.json();

  if (playlistData) {
    let sum = 0;
    result.arr.forEach((song) => (sum += song.len));
    const hours = Math.floor(sum / 3600);
    const minutes = Math.floor((sum % 3600) / 60);
    const cover = document.getElementById("cover")?.querySelector(".playlist-header");
      if (cover) {
        cover.querySelector("img").src = playlistData.image;
        cover.querySelector(".playlist-title").textContent = playlistData.name;
        const descEl = cover.querySelector(".playlist-desc") || cover.querySelector(".text-gray-300");
        if (descEl) {
            descEl.innerHTML = `
              <b>${result.arr.length}</b> <span class="text-sm text-gray">songs</span>
              <div><span>&nbsp${hours} <span class="text-sm text-gray">&nbsphour</span> &nbsp${minutes} <span class="text-sm text-gray">&nbspminute</span></span></div>`;
        }
      }

    const detailsEl = document.getElementById("playlist-details");
    if (detailsEl) {
      detailsEl.innerHTML = `
        <p class="dot text-white mr-8 btn-hover1 pointer" onclick="document.getElementById('playlist-dropdown').classList.toggle('hidden')">⋮</p>
        <div id="playlist-dropdown" class="playlist-dropdown hidden">
          <ul>
            <li data-action="delete" data-name="${playlistData.name}"><b>Delete</b></li>
            <li data-action="rename" data-name="${playlistData.name}"><b>Rename</b></li>
            <li><b>Share</b></li>
          </ul>
        </div>`;

      detailsEl.querySelector('[data-action="delete"]')?.addEventListener("click", () => playlistDetail(playlistData.name));
      detailsEl.querySelector('[data-action="rename"]')?.addEventListener("click", () => showRenameInput(playlistData.name));
    }
  }

  if (result.arr.length !== 0) {
    const listEl = document.getElementById("LibrarySongList");
    document.getElementById("warning")?.classList.add("hidden");
    listEl?.classList.remove("hidden");
    if (listEl) listEl.innerHTML = "";

    result.arr.forEach((song) => {
      const minute = Math.floor(song.len / 60);
      const second = Math.floor(song.len % 60);
      const time = `${minute}:${second.toString().padStart(2, "0")}`;
      const li = document.createElement("li");
      let trimmedName = song.songName.split(" ").slice(0, 4).join(" ");
      li.innerHTML = `
        <div class="premium-song-row">
          <div class="song-col-main">
            <img src="${song.image}" class="img rounded">
            <div class="song-info-text">
              <p class="song-title-text">${trimmedName}</p>
              <p class="artist-name-text">${song.artist || "Unknown Artist"}</p>
            </div>
          </div>
          <div class="song-col-duration">
            <span>${time}</span>
          </div>
          <div class="song-col-action">
            <i class='bx bxs-heart heart-icon ${fav_result?.arr?.some((item) => item.songId === song.songId) ? "liked text-danger" : ""}'></i>
            <div class="dot btn-hover1 pos-rel">
              <p class="dots">⋮</p>
              <div class="dropdown hidden">
                <ul>
                  <li class="download-btn">Download</li>
                  <li>Add to another playlist</li>
                  <li class="remove-btn">Remove from playlist</li>
                </ul>
              </div>
            </div>
          </div>
        </div>`;

      li.addEventListener("click", () => {
        highlight(song.songName, "OnlineSongList");
        state.globalLibrary = name;
        playsong(song.image, song.songName, song.artist, song.songId, song.songUrl, song.len);
      });

      li.querySelector(".dot").addEventListener("click", (e) => {
        e.stopPropagation();
        const dropdown = li.querySelector(".dropdown");
        document.querySelectorAll(".dropdown").forEach((menu) => { if (menu !== dropdown) menu.classList.add("hidden"); });
        dropdown.classList.toggle("hidden");
      });

      li.querySelector(".download-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        downloadSong(song.songUrl, `${song.songName}.mp3`);
      });

      li.querySelector(".remove-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        removeSong(name, song.songId);
      });

      li.querySelector(".heart-icon").addEventListener("click", (e) => {
        e.stopPropagation();
        favorite(song.songUrl, song.image, song.songName, song.artist, song.len, song.songId);
        e.target.classList.toggle("liked");
      });

      listEl?.appendChild(li);
    });
  } else {
    document.getElementById("LibrarySongList")?.classList.add("hidden");
    const warning = document.getElementById("warning");
    warning?.classList.remove("hidden");
    if (warning) warning.innerHTML = "No Song In Playlist";
  }
}

// --- Add Song to Playlist ---
export async function plus(SongName, SongImg, SongUrl, artist, playlistName, SongLength, songId) {
  const res = await fetch("/songinfo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: SongName, url: SongImg, songUrl: SongUrl, artist, pname: playlistName, time: SongLength, songId }),
  });
  const results = await res.json();

  if (res.status === 200) {
    popupAlert(results.msg);
    logBehavior({ type: "added_to_playlist", song: { songName: SongName, songId, artist } });

    if (
      !document.querySelector(".OnlineSongList")?.classList.contains("hidden") &&
      document.getElementById("cover")?.querySelector(".playlist-title")?.innerHTML === playlistName
    ) {
      librarySongs(playlistName);
    }
  } else {
    popupAlert(results.msg);
  }
}

// --- Update Initial Playlist ---
export async function updateInitialPlaylist(id) {
  state.currentSong = id;
  const res = await fetch("/fetchplaylist");
  const result = await res.json();
  state.globalLibrary = result.array[0]?.name || "";
}

// --- Delete Playlist ---
export async function playlistDetail(name) {
  const res = await fetch("/deletePlaylist", {
    method: "post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playlistName: name }),
  });
  const result = await res.json();
  popupAlert(result.msg);
  const { navigateTo } = await import("./navigation.js");
  navigateTo({ view: "default-container-parent" });
  fetchPlaylist();
}

// --- Remove Song from Playlist ---
export async function removeSong(playlistName, songId) {
  const res = await fetch("/deleteSong", {
    method: "post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playlistName, songId }),
  });
  const result = await res.json();
  if (res.status === 200) {
    popupAlert(result.msg);
    librarySongs(playlistName);
  }
}

// --- Rename Playlist ---
function showRenameInput(currentName) {
  document.getElementById("playlist-dropdown")?.classList.add("hidden");
  const h2 = document.querySelector(".playlist-title");
  if (!h2) return;
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentName;
  input.className = "rename-input";
  input.style.cssText = "font-size:32px;font-weight:bold;color:white;background:transparent;border:none;border-bottom:1px solid #888;outline:none;width:" + h2.offsetWidth + "px";
  h2.replaceWith(input);
  input.focus();
  input.addEventListener("blur", () => handleRenameSubmit(input.value, currentName));
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") input.blur(); });
}

async function handleRenameSubmit(newName, oldName) {
  if (newName.trim() === "" || newName === oldName) {
    revertTitle(oldName);
    return;
  }
  const res = await fetch("/renamePlaylist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oldName, newName }),
  });
  const result = await res.json();
  if (res.status === 200) {
    revertTitle(newName);
    fetchPlaylist();
    librarySongs(newName);
    popupAlert(result.msg);
  } else {
    popupAlert(result.msg);
    revertTitle(oldName);
  }
}

function revertTitle(name) {
  const input = document.querySelector(".rename-input");
  if (!input) return;
  const h2 = document.createElement("h2");
  h2.className = "playlist-title";
  h2.textContent = name;
  h2.style.cssText = "font-size:32px;font-weight:bold;color:white";
  input.replaceWith(h2);
}

// --- Plus Button (add current song to playlist) ---
export async function initPlusButton() {
  document.getElementById("Plus")?.addEventListener("click", async () => {
    if (typeof sess !== "undefined" && sess !== true) {
      import("./utils.js").then(({ popupAlert }) => popupAlert("Please Sign Up to create playlists"));
      return;
    }
    const playnameDiv = document.getElementById("playname");
    playnameDiv?.querySelector("div")?.classList.add("hidden");
    if (!state.currentSong) return;

    const res = await fetch("/fetchplaylist");
    const result = await res.json();
    const ul = playnameDiv?.querySelector("ul");
    if (ul) ul.innerHTML = "";

    if (result.array.length === 0) {
      const noPlaylistDiv = playnameDiv?.querySelector("div");
      noPlaylistDiv?.classList.remove("hidden");
      if (noPlaylistDiv) noPlaylistDiv.innerHTML = "No Any Playlist";
    } else {
      for (const playlist of result.array) {
        const response = await fetch("/tickSymbol", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: state.currentSong, pname: playlist.name }),
        });
        const result1 = await response.json();
        const songExists = result1.msg === "exists";

        const li = document.createElement("li");
        li.className = "flex gap-2 items-center justify-between transition btn-hover btn-act pointer";
        li.innerHTML = `
          <div class="flex gap-4 items-center">
            <img src="${playlist.image}" alt="" class="rounded img">
            <p class="font-bold">${playlist.name}</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="svg-2" style="display: ${songExists ? "block" : "none"};">
            <path d="M12,22A10,10,0,1,0,2,12,10,10,0,0,0,12,22ZM8.293,11.293a.9994.9994,0,0,1,1.414,0L11,12.5859,14.293,9.293a1,1,0,0,1,1.414,1.414l-4,4a.9995.9995,0,0,1-1.414,0l-2-2A.9994.9994,0,0,1,8.293,11.293Z" fill="#0fff00"></path>
          </svg>`;

        li.addEventListener("click", async () => {
          const req = await fetch(`/search?type=songID&query=${state.currentSong}`);
          const res2 = await req.json();
          const songData = res2.data.data.songs[0];
          plus(songData.name, songData.image[2].link, songData.download_url[4].link, songData.artist_map.artists[0].name, playlist.name, songData.duration, songData.id);
          playnameDiv?.classList.add("hidden");
        });

        ul?.appendChild(li);
      }
    }

    playnameDiv?.classList.toggle("hidden");
  });
}

// --- Dropdown for add-to-playlist from album/artist pages ---
export async function toggleDropdown(event, index, songUrl, songName, songImage, songLength, artist, songId) {
  event.stopPropagation();
  let div = document.getElementById(`dropdown-${index}`);
  if (!div) {
    div = document.createElement("div");
    div.className = "shadow-lg hidden playlist-dropdown-1";
    div.id = `dropdown-${index}`;
    div.style.position = "absolute";
    div.style.right = "0";
    div.style.top = "100%";
    div.style.marginTop = "5px";
    div.style.backgroundColor = "#191919";
    div.style.borderRadius = "8px";
    div.style.zIndex = "9999";
    div.addEventListener("click", (e) => e.stopPropagation());
    
    const iconContainer = document.getElementById(`albumPlusIcon-${index}`);
    if (iconContainer) {
      iconContainer.appendChild(div);
    } else {
      document.body.appendChild(div);
    }
  }
  div.innerHTML = `<div class="h-full w-full flex items-center justify-center text-lg font-bold font-fam-2 text-white hidden"></div>
    <ul class="flex flex-col gap-1 justify-center p-2 m-0 list-none"></ul>`;
  document.querySelectorAll(".playlist-dropdown-1").forEach((d) => d.classList.add("hidden"));
  div.classList.toggle("hidden");
  await fetchplaylistList(index, songUrl, songName, songImage, songLength, artist, songId);
}

async function fetchplaylistList(index, songUrl, songName, songImg, songLength, artist, songId) {
  const res = await fetch("/fetchplaylist");
  const result = await res.json();
  const ul = document.getElementById(`dropdown-${index}`)?.querySelector("ul");
  if (ul) ul.innerHTML = "";

  result.array.forEach(async (song) => {
    const response = await fetch("/tickSymbol", {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: songUrl, pname: song.name }),
    });
    const results = await response.json();
    const check = results.msg === "exists";
    const li = document.createElement("li");
    li.className = "flex gap-2 items-center justify-between transition btn-hover btn-act pointer";
    li.innerHTML = `<div class="flex gap-4 items-center">
      <img src="${song.image}" alt="" class="rounded img">
      <p class="font-bold">${song.name}</p>
    </div>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="svg-2" style="display: ${check ? "block" : "none"};">
      <path d="M12,22A10,10,0,1,0,2,12,10,10,0,0,0,12,22ZM8.293,11.293a.9994.9994,0,0,1,1.414,0L11,12.5859,14.293,9.293a1,1,0,0,1,1.414,1.414l-4,4a.9995.9995,0,0,1-1.414,0l-2-2A.9994.9994,0,0,1,8.293,11.293Z" fill="#0fff00"></path>
    </svg>`;

    li.addEventListener("click", (e) => {
      e.stopPropagation();
      plus(songName, songImg, songUrl, artist, song.name, songLength, songId);
      document.querySelectorAll(".playlist-dropdown-1").forEach((d) => d.classList.add("hidden"));
    });

    ul?.appendChild(li);
  });
}

export async function songToggleDropdown(event, index, songId) {
  event.stopPropagation();
  const res = await fetch(`/search?type=songID&query=${songId}`);
  const result = await res.json();
  const song = result.data.songs ? result.data.songs[0] : result.data.data.songs[0];
  toggleDropdown(event, index, song.download_url[4].link, song.name, song.image[2].link, song.duration, song.artist_map.artists[0].name, song.id);
}

// --- Add online playlist to user library ---
export async function addToPlaylist(playlistId) {
  const res = await fetch(`https://saavn.dev/api/playlists?id=${playlistId}&page=0&limit=10`);
  const result = await res.json();
  const response = await fetch("/playlistname", {
    method: "post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: result.data.name, imageUrl: result.data.image[2].url }),
  });
  const result1 = await response.json();
  if (response.status === 200) {
    const songlist = await fetch("/playlistData", {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId }),
    });
    const songlistresult = await songlist.json();
    const ids = songlistresult.playlistSongs.map((item) => item.id);
    const { fetchSongs } = await import("./player.js");
    const songs = await fetchSongs(ids);
    await fetch("/save", {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pname: result.data.name, songList: songs }),
    });
    fetchPlaylist();
    popupAlert(result1.msg);
  } else {
    popupAlert(result1.msg);
  }
}

// --- Playlist Search Filter ---
export function initPlaylistSearch() {
  document.getElementById("playlistSearch")?.addEventListener("input", function () {
    const filter = this.value.toLowerCase().trim();
    const allSongs = document.getElementById("LibrarySongList")?.querySelectorAll("li");
    allSongs?.forEach((song) => {
      const name = song.querySelector(".song-item b")?.textContent.toLowerCase() || "";
      song.style.display = name.includes(filter) ? "flex" : "none";
    });
  });
}

// --- Playlist Create Form ---
export function initPlaylistForm() {
  document.getElementById("playlistForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("playlistName")?.value;
    const accessKey = "gJ3Io7-FiCSudtwMUsgvahmDMaTjhSWZA4gAM6iDrN4";
    const query = "Dark_abstract";
    const img = await fetch(`https://api.unsplash.com/photos/random?query=${query}&client_id=${accessKey}`);
    const data = await img.json();
    const imageUrl = `${data.urls.raw}&w=60&h=60&fit=crop`;
    const res = await fetch("/playlistname", {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, imageUrl }),
    });
    const result = await res.json();
    const inputEl = document.getElementById("new-playlist-name");
    if (inputEl) inputEl.value = "";
    document.getElementById("PlaylistName")?.classList.add("hidden");
    const { closePopup } = await import("./navigation.js");
    closePopup();
    popupAlert(result.msg);
  });
}

// --- Play online playlist song ---
export async function playPlaylistSongs(songId, playlistId) {
  const response = await fetch(`/search?type=songID&query=${songId}`);
  const result = await response.json();
  const song = result.data.data.songs[0];
  highlight(song.name, "playlist");
  state.globalLibrary = "OnlinePlaylist";
  state.globalAlbumId = playlistId;
  playsong(song.image[2].link, song.name, song.artist_map.artists[0].name, song.id, song.download_url[4].link, song.duration);
}
