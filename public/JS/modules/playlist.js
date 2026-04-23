/**
 * playlist.js — User library / playlist management.
 * Owns: librarySongs, fetchPlaylist, createPlaylist form, delete, rename,
 *       removeSong, plus (add song to playlist).
 */
import { state }                        from "../state.js";
import { logBehavior }                  from "./tracking.js";
import { highlight, popupAlert, addUnique, universalPageHandler, closePopup } from "./ui.js";
import { playsong }                     from "./playback.js";
import { favorite }                     from "./favorites.js";
import { toggleDropdown }               from "./dropdown.js";

// ─── Show songs inside a user playlist ───────────────────────────────────────
export async function librarySongs(name) {
    addUnique("mainSongContent");
    universalPageHandler();
    document.getElementById("mainSongContent").classList.remove("hidden");

    const [res1, res, fav_res] = await Promise.all([
        fetch("/fetchplaylist"),
        fetch("/librarySongs", {
            method: "post",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pname: name })
        }),
        fetch("/get-favorite")
    ]);

    const result1    = await res1.json();
    const result     = await res.json();
    const fav_result = await fav_res.json();

    document.querySelector(".OnlineSongList").classList.remove("hidden");
    const playlistData = result1.array.find(p => p.name === name);

    if (playlistData) {
        let sum = 0;
        result.arr.forEach(song => { sum += song.len; });
        const hours   = Math.floor(sum / 3600);
        const minutes = Math.floor((sum % 3600) / 60);

        const cover = document.getElementById("cover").querySelector("div");
        cover.querySelector("img").src            = playlistData.image;
        cover.querySelector("h2").textContent      = playlistData.name;
        cover.querySelector("p").innerHTML = `
            <b>${result.arr.length}</b>
            <span class="text-sm text-gray">songs</span>
            <div><span>
                &nbsp${hours}<span class="text-sm text-gray">&nbsphour</span>
                &nbsp${minutes}<span class="text-sm text-gray">&nbspminute</span>
            </span></div>`;

        document.getElementById("playlist-details").innerHTML = `
            <p class="dot text-white mr-8 btn-hover1 pointer" onclick="playlistThreeDot()">⋮</p>
            <div id="playlist-dropdown" class="playlist-dropdown hidden">
                <ul>
                    <li onclick="playlistDetail('${playlistData.name}')"><b>Delete</b></li>
                    <li onclick="showRenameInput('${playlistData.name}')"><b>Rename</b></li>
                    <li><b>Share</b></li>
                </ul>
            </div>`;
    }

    const listEl = document.getElementById("LibrarySongList");
    if (result.arr.length !== 0) {
        listEl.classList.remove("hidden");
        listEl.innerHTML = "";
        result.arr.forEach(song => {
            const minute     = Math.floor(song.len / 60);
            const second     = Math.floor(song.len % 60);
            const time       = `${minute}:${second.toString().padStart(2, "0")}`;
            const trimmedName = song.songName.split(" ").slice(0, 4).join(" ");
            const isLiked    = fav_result?.arr?.some(item => item.songId === song.songId);

            const li = document.createElement("li");
            li.className = "justify-between";
            li.innerHTML = `
                <div class="song-item">
                    <div class="flex gap-2 items-center w-400px">
                        <img src="${song.image}" class="img rounded">
                        <span><b>${trimmedName}</b></span>
                    </div>
                    <strong class="time">${time}</strong>
                    <i class='bx bxs-heart heart-icon ${isLiked ? "liked" : ""}'></i>
                    <div class="dot btn-hover1 pos-rel">
                        <p class="dots">⋮</p>
                        <div class="dropdown hidden">
                            <ul>
                                <li onclick="downloadSong('${song.songUrl}','${song.songName}.mp3')">Download</li>
                                <li>Add to another playlist</li>
                                <li onclick="removeSong('${name}','${song.songId}')">Remove from playlist</li>
                            </ul>
                        </div>
                    </div>
                </div>`;

            li.addEventListener("click", async () => {
                highlight(song.songName, "OnlineSongList");
                state.globalLibrary = name;
                playsong(song.image, song.songName, song.artist, song.songId, song.songUrl, song.len);
            });

            li.querySelector(".dot").addEventListener("click", (e) => {
                e.stopPropagation();
                const dropdown = li.querySelector(".dropdown");
                document.querySelectorAll(".dropdown").forEach(m => { if (m !== dropdown) m.classList.add("hidden"); });
                dropdown.classList.toggle("hidden");
            });

            li.querySelector(".heart-icon").addEventListener("click", (e) => {
                e.stopPropagation();
                favorite(song.songUrl, song.image, song.songName, song.artist, song.len, song.songId);
                e.target.classList.toggle("liked");
            });

            listEl.appendChild(li);
        });
    } else {
        listEl.classList.add("hidden");
        const warning = document.getElementById("warning");
        warning.classList.remove("hidden");
        warning.innerHTML = "No Song In Playlist";
    }
}

// ─── Fetch and display playlist list in sidebar ───────────────────────────────
export async function fetchPlaylist() {
    const mq = window.matchMedia("(max-width: 768px)");
    document.querySelector(".playlists").querySelector("div").classList.add("hidden");
    document.querySelector(".sidebar1").classList.add("hidden");
    document.querySelector(".playlists").style.display = "block";

    const res    = await fetch("/fetchplaylist");
    const result = await res.json();

    if (res.status !== 200) return;

    const ul = document.querySelector(".playlists").querySelector("ul");
    ul.innerHTML = "";

    if (result.array.length === 0) {
        document.querySelector(".playlists").querySelector("div").classList.remove("hidden");
        document.querySelector(".playlists").querySelector("div").innerHTML = "No Playlist";
        document.getElementById("playname").querySelector("ul").innerHTML = "No Playlist";
        return;
    }

    result.array.forEach((item) => {
        const li = document.createElement("li");
        li.className = "flex items-center gap-2 justify-between";
        li.innerHTML = `
          <div class="flex gap-2 items-center">
          <img src="${item.image}" class="rounded h-60px">
        <p class="font-bold text-xl">${item.name}</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0   16 16" id="Arrow" class="svg">
        <path fill="none" stroke="#fdfffd" d="m5.357 2.464 5 5.093-5 5.092" class="colorStroke249fe6 svgStroke"></path>
        </svg>`;

        li.addEventListener("click", async () => {
            document.getElementById("leftarrow").classList.remove("hidden");
            document.querySelector(".likedSongList").classList.add("hidden");
            document.querySelector(".MainProfileContainer").classList.add("hidden");
            librarySongs(item.name);
            homename("music", item.name);
            if (mq.matches) MQchange_external();
        });
        ul.appendChild(li);
    });
}

// Late-bound MQchange from navigation.js (set by script.js)
let _MQchange = () => {};
export function registerMQchange(fn) { _MQchange = fn; }
function MQchange_external() { _MQchange(); }

// Late-bound homename from navigation.js (set by script.js)
let _homename = () => {};
export function registerHomename(fn) { _homename = fn; }
function homename(icon, name) { _homename(icon, name); }

// ─── Delete a playlist ────────────────────────────────────────────────────────
export async function playlistDetail(name) {
    const res    = await fetch("/deletePlaylist", {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistName: name })
    });
    const result = await res.json();
    popupAlert(result.msg);
    // Navigate home + refresh
    universalPageHandler();
    document.getElementById("default-container-parent").classList.remove("hidden");
    fetchPlaylist();
}

// ─── Add song to playlist ─────────────────────────────────────────────────────
export async function plus(SongName, SongImg, SongUrl, artist, playlistName, SongLength, songId) {
    const res = await fetch("/songinfo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: SongName, url: SongImg, songUrl: SongUrl,
            artist, pname: playlistName, time: SongLength, songId
        })
    });
    const results = await res.json();

    if (res.status === 200) {
        popupAlert(results.msg);
        logBehavior({ type: "added_to_playlist", song: { songName: SongName, songId, artist } });

        const playlistsDisplay = window.getComputedStyle(document.querySelector(".playlists")).display;
        if (
            !document.querySelector(".OnlineSongList").classList.contains("hidden") &&
            document.getElementById("cover").querySelector(".playlist-title")?.innerHTML === playlistName
        ) {
            librarySongs(playlistName);
        }
    } else {
        popupAlert(results.msg);
    }
}

// ─── Remove song from playlist ────────────────────────────────────────────────
export async function removeSong(playlistName, songId) {
    const res    = await fetch("/deleteSong", {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistName, songId })
    });
    const result = await res.json();
    if (res.status === 200) {
        popupAlert(result.msg);
        librarySongs(playlistName);
    }
}

// ─── Playlist three-dot menu ──────────────────────────────────────────────────
export function playlistThreeDot() {
    document.getElementById("playlist-dropdown").classList.toggle("hidden");
}

// ─── Inline rename: replaces h2 with an input ────────────────────────────────
export function showRenameInput(currentName) {
    document.getElementById("playlist-dropdown").classList.add("hidden");
    const h2    = document.querySelector(".playlist-title");
    const input = document.createElement("input");
    input.type  = "text";
    input.value = currentName;
    input.className = "rename-input";
    Object.assign(input.style, {
        fontSize: "32px", fontWeight: "bold", color: "white",
        backgroundColor: "transparent", border: "none",
        borderBottom: "1px solid #888", width: h2.offsetWidth + "px", outline: "none"
    });
    h2.replaceWith(input);
    input.focus();
    input.addEventListener("blur",    () => handleRenameSubmit(input.value, currentName));
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") input.blur(); });
}

export async function handleRenameSubmit(newName, oldName) {
    if (!newName.trim() || newName === oldName) { revertTitle(oldName); return; }
    const res    = await fetch("/renamePlaylist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName, newName })
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
    const h2    = document.createElement("h2");
    h2.className   = "playlist-title";
    h2.textContent = name;
    Object.assign(h2.style, { fontSize: "32px", fontWeight: "bold", color: "white" });
    input.replaceWith(h2);
}

// ─── "Plus" button on currently playing song ──────────────────────────────────
export function initPlusButton(getCurrentSong) {
    document.getElementById("Plus")?.addEventListener("click", async () => {
        const playnameDiv = document.getElementById("playname");
        playnameDiv.querySelector("div").classList.add("hidden");
        const cSong = getCurrentSong();
        if (!cSong) { console.log("error: No song selected"); return; }

        const res    = await fetch("/fetchplaylist");
        const result = await res.json();
        const ul     = playnameDiv.querySelector("ul");
        ul.innerHTML = "";

        if (result.array.length === 0) {
            const noPlaylistDiv = playnameDiv.querySelector("div");
            noPlaylistDiv.classList.remove("hidden");
            noPlaylistDiv.innerHTML = "No Any Playlist";
        } else {
            for (const playlist of result.array) {
                const response = await fetch("/tickSymbol", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: cSong, pname: playlist.name })
                });
                const result1    = await response.json();
                const songExists = result1.msg === "exists";
                const li         = document.createElement("li");
                li.className     = "flex gap-2 items-center justify-between transition btn-hover btn-act pointer";
                li.innerHTML     = `
                  <div class="flex gap-4 items-center">
                    <img src="${playlist.image}" alt="" class="rounded img">
                    <p class="font-bold">${playlist.name}</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="svg-2" style="display: ${songExists ? "block" : "none"};">
                    <path d="M12,22A10,10,0,1,0,2,12,10,10,0,0,0,12,22ZM8.293,11.293a.9994.9994,0,0,1,1.414,0L11,12.5859,14.293,9.293a1,1,0,0,1,1.414,1.414l-4,4a.9995.9995,0,0,1-1.414,0l-2-2A.9994.9994,0,0,1,8.293,11.293Z" fill="#0fff00"></path>
                  </svg>`;

                li.addEventListener("click", async () => {
                    const req    = await fetch(`/search?type=songID&query=${cSong}`);
                    const res    = await req.json();
                    const result = res.data.data.songs[0];
                    plus(result.name, result.image[2].link, result.download_url[4].link,
                        result.artist_map.artists[0].name, playlist.name, result.duration, result.id);
                    playnameDiv.classList.add("hidden");
                });
                ul.appendChild(li);
            }
        }

        if (playnameDiv.classList.contains("hidden")) {
            playnameDiv.classList.remove("hidden");
        } else {
            playnameDiv.classList.add("hidden");
        }
    });
}

// ─── Create playlist form submit ──────────────────────────────────────────────
export function initCreatePlaylistForm() {
    document.getElementById("playlistForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name       = document.getElementById("playlistName").value;
        const accessKey  = "gJ3Io7-FiCSudtwMUsgvahmDMaTjhSWZA4gAM6iDrN4";
        const img        = await fetch(`https://api.unsplash.com/photos/random?query=Dark_abstract&client_id=${accessKey}`);
        const data       = await img.json();
        const imageUrl   = `${data.urls.raw}&w=60&h=60&fit=crop`;

        const res    = await fetch("/playlistname", {
            method: "post",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, imageUrl })
        });
        const result = await res.json();

        document.getElementById("new-playlist-name").value = "";
        document.getElementById("PlaylistName").classList.add("hidden");
        closePopup();
        popupAlert(result.msg);
    });
}

// ─── Playlist search filter inside librarySongs view ─────────────────────────
export function initPlaylistSearchFilter() {
    document.getElementById("playlistSearch")?.addEventListener("input", function () {
        const filter  = this.value.toLowerCase().trim();
        document.getElementById("LibrarySongList").querySelectorAll("li").forEach(song => {
            const name = song.querySelector(".song-item b")?.textContent.toLowerCase() || "";
            song.style.display = name.includes(filter) ? "flex" : "none";
        });
    });
}
