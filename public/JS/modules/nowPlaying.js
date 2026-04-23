/**
 * nowPlaying.js — "Now Playing" detail panel: song info, lyrics, related artists,
 * same-artist songs, and recommended tracks.
 *
 * Exports `currentPlayingSongDetails_external` so favorites.js can call it
 * without importing playback.js (which would create a circle).
 */
import { state }            from "../state.js";
import { getArtistDetails } from "./detail.js";
// Note: playSong() in onclick strings resolves via window.playSong set in script.js

// ─── Main entry: fetch and render the full now-playing detail panel ───────────
export async function currentPlayingSongDetails(id) {
    if (!id) return;
    const [songRes, recoRes] = await Promise.all([
        fetch(`/search?type=songID&query=${id}`),
        fetch(`/search?type=recomended&query=${id}`)
    ]);

    const result      = await songRes.json();
    const reco_result = await recoRes.json();
    const song        = result.data.data.songs[0];

    const artist_req = await fetch(`/search?type=artistID&query=${song.artist_map.artists[0].id}`);
    const artist_res = await artist_req.json();

    const minute = Math.floor(song.duration / 60);
    const second = Math.floor(song.duration % 60);

    // Cover & main info
    document.querySelector(".cover-art-section").querySelector("img").src = song.image[2].link;
    document.querySelector(".song-main-info").innerHTML = `
        <h1>${song.name}</h1>
        <p class="artist-names">${song.artist_map.artists[0].name}</p>
        <p class="album-name">${song.album}</p>`;

    // Action buttons
    document.querySelector(".action-buttons").innerHTML = `
        <button class="add-to-playlist-btn">Add to Playlist</button>
        <button class="share-song-btn">Share Song</button>
        <button class="more-options-btn">...</button>`;

    // About + Lyrics skeleton
    document.querySelector(".text-details-section").innerHTML = `
        <div class="about-section">
            <h3>About the Song</h3>
            <p><strong>Release Date:</strong> ${song.release_date}</p>
            <p><strong>Duration: </strong> ${minute}:${second.toString().padStart(2, "0")}</p>
        </div>
        <div class="lyrics-section">
            <h3>Lyrics</h3>
            <div class="lyrics-content-wrapper active" id="lyrics-content">
                <p class="lyrics-text" id="lyrics-text-container">
                    <span class="text-gray-400 flex items-center gap-2">
                        <i class="fa-solid fa-compact-disc fa-spin"></i> Fetching lyrics...
                    </span>
                </p>
            </div>
            <button class="toggle-lyrics-btn" id="toggleLyricsBtn" style="display: none;">Read More...</button>
        </div>`;

    renderRecommendations(reco_result);
    renderRelatedArtists(song.artist_map.artists);
    renderSameArtistSongs(artist_res.data);
    loadLyricsInBackground(song.id);
}

// Alias so favorites.js can import without creating a circle
export const currentPlayingSongDetails_external = currentPlayingSongDetails;

// ─── Lyrics fetcher (runs in background after UI renders) ────────────────────
async function loadLyricsInBackground(id) {
    try {
        const ly       = await fetch(`/search?type=lyrics&query=${id}`);
        const ly_result = await ly.json();
        const lyricsContainer = document.getElementById("lyrics-text-container");
        const toggleBtn       = document.getElementById("toggleLyricsBtn");

        if (ly_result.data.status === "Success") {
            lyricsContainer.innerHTML = ly_result.data.data.lyrics.replace(/\n/g, "<br>");
            if (toggleBtn) toggleBtn.style.display = "block";
        } else {
            lyricsContainer.innerHTML = "Lyrics not available.";
        }
    } catch (error) {
        console.error("Lyrics load failed", error);
        const el = document.getElementById("lyrics-text-container");
        if (el) el.innerHTML = "Failed to load lyrics.";
    }
}

// ─── Recommended songs row ────────────────────────────────────────────────────
function renderRecommendations(reco_result) {
    const container = document.querySelector(".song-list-horizontal");
    container.innerHTML = "";
    reco_result.data.data.forEach(song => {
        const div = document.createElement("div");
        div.className = "song-card-horizontal";
        div.innerHTML = `
            <img src="${song.image[2].link}" alt="Cover" class="h-200px">
            <div class="song-infos">
                <span class="song-titles">${song.name}</span>
                <span class="song-artist">${song.artist_map.artists[0].name}</span>
            </div>
            <button class="play-small-btn" onclick="playSong('${song.download_url[4].link}','${song.id}','${song.name}','${song.artist_map.artists[0].name}','${song.image[2].link}','${song.duration}','','')">
                <i class="fa-solid fa-play"></i>
            </button>`;
        container.appendChild(div);
    });
}

// ─── Related artists row ──────────────────────────────────────────────────────
function renderRelatedArtists(artists) {
    const container = document.querySelector(".artist-list-horizontal");
    container.innerHTML = "";
    artists.forEach(artist => {
        const imgSrc = Array.isArray(artist.image)
            ? artist.image[2].link
            : "https://cdn-icons-png.flaticon.com/512/847/847969.png";
        const div = document.createElement("div");
        div.className = "artist-card-horizontal";
        div.innerHTML = `
            <img src="${imgSrc}" class="artist-photo">
            <span class="artist-name">${artist.name}</span>`;
        div.addEventListener("click", () => getArtistDetails(artist.id));
        container.appendChild(div);
    });
}

// ─── More songs by same artist ────────────────────────────────────────────────
function renderSameArtistSongs(artist_res) {
    const container = document.getElementById("song-list-horizontal");
    container.innerHTML = "";
    artist_res.data.top_songs.forEach(songs => {
        const div = document.createElement("div");
        div.className = "song-card-horizontal";
        div.innerHTML = `
            <img src="${songs.image[2].link}">
            <div class="song-info">
                <span class="song-title">${songs.name}</span>
                <span class="song-artist">${songs.artist_map.artists[0].name}</span>
            </div>
            <button class="play-small-btn" onclick="playSong('${songs.download_url[4].link}','${songs.id}','${songs.name}','${songs.artist_map.artists[0].name}','${songs.image[2].link}','${songs.duration}','','')">
                <i class="fa-solid fa-play"></i>
            </button>`;
        container.appendChild(div);
    });
}

// ─── Lyrics toggle ("Read More / Show Less") wired via event delegation ───────
export function initLyricsToggle() {
    document.addEventListener("click", (e) => {
        if (e.target && e.target.id === "toggleLyricsBtn") {
            const lyricsContent = document.getElementById("lyrics-content");
            if (lyricsContent) {
                const isExpanded = lyricsContent.classList.toggle("expanded");
                e.target.textContent = isExpanded ? "Show Less" : "Read More...";
            }
        }
    });
}
