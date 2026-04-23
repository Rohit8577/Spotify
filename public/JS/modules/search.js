/**
 * search.js — Search page: song/artist/album/playlist search, AI smart-playlist,
 * voice search, pagination, search history, and tab switching.
 */
import { state }                                from "../state.js";
import { debounce, formatTime }                 from "./helpers.js";
import { favorite }                             from "./favorites.js";
import { playsong }                             from "./playback.js";
import { getAlbumDetails, getArtistDetails, getPlayListDetails, displayArtistResults, displayAlbumResults, displayPlaylistResult, RESULTS_PER_PAGE } from "./detail.js";
import { universalPageHandler }                 from "./ui.js";

// ─── Song search results (search page) ───────────────────────────────────────
export async function Search(query) {
    document.getElementById("SearchContainer").classList.remove("hidden");
    document.getElementById("AiSearch").classList.add("hidden");

    if (!query) {
        query = document.getElementById("searchPageInput")?.value.trim() || "";
    }
    if (!query) return;

    const r    = await fetch(`/search?type=song&query=${encodeURIComponent(query)}`);
    const data = await r.json();
    const ul   = document.getElementById("searchResultSong");
    ul.innerHTML = "";

    data.data.data.results.forEach(song => {
        const li = document.createElement("li");
        li.className = "Search-song-item";
        const minute = Math.floor(song.duration / 60);
        const second = Math.floor(song.duration % 60);
        const time   = `${minute}:${second.toString().padStart(2, "0")}`;
        li.innerHTML = `
        <img src="${song.image[2].link}" alt="" />
        <span class="song-title"><b>${song.name}</b> - <strong>${song.artist_map.artists[0].name}</strong></span>
        <span class="song-length font-bold">${time}</span>
        <i class="bx bxs-heart text-gray hearts-icon" title="Add to Like"></i>
        <button class="play-button" title="Add to Playlist"> + </button>`;

        li.addEventListener("click", async () => {
            state.currentSong = song.id;
            playsong(song.image[2].link, song.name, song.artist_map.artists[0].name, song.id, song.download_url[4].link, song.duration);
        });
        li.querySelector(".hearts-icon").addEventListener("click", async (e) => {
            e.stopPropagation();
            favorite(song.download_url[4].link, song.image[2].link, song.name, song.artist_map.artists[0].name, song.duration, song.id);
        });
        ul.appendChild(li);
    });
}

// ─── Route search by container type ──────────────────────────────────────────
export async function OnlineSearch(query, source) {
    if (source === "AlbumContainer") {
        const res  = await fetch(`/search?type=album&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        fetchAndDisplayArtist(data.data.data.results, "AlbumContainer");
    } else if (source === "ArtistContainer") {
        const res  = await fetch(`/search?type=artist&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        fetchAndDisplayArtist(data.data.data.results, "ArtistContainer");
    } else if (source === "PlaylistContainer") {
        const res  = await fetch(`/search?type=album&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        fetchAndDisplayArtist(data.data.data.results, "PlaylistContainer");
    } else if (source === "SongContainer") {
        Search(query);
    }
}

// ─── Render artist / album / playlist cards ───────────────────────────────────
export function fetchAndDisplayArtist(query, source) {
    const grid = document.getElementById(source);
    grid.innerHTML = "";
    query.forEach(artist => {
        const card   = document.createElement("div");
        card.className = "item-card";
        const imgSrc = Array.isArray(artist.image)
            ? artist.image[2]?.link
            : (artist.image || "https://www.jiosaavn.com/_i/3.0/artist-default-film.png");
        card.innerHTML = `
            <img src="${imgSrc}" alt="${artist.name}" class="item-card-image artist-image">
            <div class="item-card-title">${artist.name}</div>
            <div class="item-card-subtitle">${artist.role || "Artist"}</div>`;
        card.addEventListener("click", () => {
            document.getElementById("Search-History").classList.add("hidden");
            if (source === "ArtistContainer")   getArtistDetails(artist.id);
            else if (source === "AlbumContainer")   getAlbumDetails(artist.id);
            else if (source === "PlaylistContainer") getPlayListDetails(artist.id, artist.name, artist.image);
        });
        grid.appendChild(card);
    });
}

// ─── AI Smart Playlist (vibe search) ─────────────────────────────────────────
export async function performSmartSearch(userVibe) {
    const resultList = document.getElementById("AiSearch");
    document.getElementById("SearchContainer").classList.add("hidden");
    resultList.classList.remove("hidden");
    resultList.innerHTML = `
        <div class="flex flex-col items-center justify-center p-8 text-gray-400 gap-4">
            <i class="fa-solid text-white fa-compact-disc fa-spin text-4xl text-purple-500"></i>
            <span class="text-lg text-white animate-pulse">AI is curating a playlist for "${userVibe}"...</span>
        </div>`;

    try {
        const response = await fetch(`/smart-playlist?vibe=${encodeURIComponent(userVibe)}`);
        const data     = await response.json();
        if (data.success && data.songs.length > 0) {
            resultList.innerHTML = "";
            const header = document.createElement("li");
            header.className = "text-purple-400 text-xl font-bold px-2 mb-2 text-sm ul-none uppercase tracking-wider";
            header.innerText = `✨ AI Curated Playlist: ${data.vibe}`;
            resultList.appendChild(header);
            data.songs.forEach((song, index) => {
                setTimeout(() => renderSongCard(song, resultList), index * 100);
            });
        } else {
            resultList.innerHTML = `<p class="p-4 text-danger font-bold text-center">😕 Gaane nahi mile. Try "Party songs" or "Sad songs".</p>`;
        }
    } catch (error) {
        console.error("Smart Search Error:", error);
        resultList.innerHTML = `<p class="p-4 text-danger font-bold text-center">Server Error.</p>`;
    }
}

// ─── AI search song card ───────────────────────────────────────────────────────
export function renderSongCard(song, container) {
    const li = document.createElement("li");
    li.className = "Search-song-item";
    li.innerHTML = `
        <img src="${song.image_url}" alt="" />
        <span>
            <span class="song-title"><b>${song.title}</b></span>
            <div class="text-sm text-gray"><strong>${song.artist}</strong></div>
        </span>
        <span class="song-length font-bold">${formatTime(song.duration)}</span>
        <i class="bx bxs-heart text-gray hearts-icon" title="Add to Liked"></i>
        <button class="play-button" title="Add to Playlist"> + </button>`;

    li.addEventListener("click", async () => {
        state.currentSong = song.id;
        playsong(song.image_url, song.title, song.artist, song.id, song.audio_url, song.duration);
    });
    li.querySelector(".hearts-icon").addEventListener("click", async (e) => {
        e.stopPropagation();
        favorite(song.audio_url, song.image_url, song.title, song.artist, song.duration, song.id);
    });
    container.appendChild(li);
}

// ─── Load more artists / albums ───────────────────────────────────────────────
export async function loadMore(type) {
    let page, url, loadMoreContainer;
    if (type === "artists") {
        state.currentArtistPage++;
        page = state.currentArtistPage;
        loadMoreContainer = document.getElementById("load-more-artists-container");
        url = `${state.SAAVN_BASE_URL}/search/artists?query=${encodeURIComponent(state.currentSearchQuery)}&limit=${RESULTS_PER_PAGE}&page=${page}`;
    } else if (type === "albums") {
        state.currentAlbumPage++;
        page = state.currentAlbumPage;
        loadMoreContainer = document.getElementById("load-more-albums-container");
        url = `${state.SAAVN_BASE_URL}/search/albums?query=${encodeURIComponent(state.currentSearchQuery)}&limit=${RESULTS_PER_PAGE}&page=${page}`;
    } else return;

    if (loadMoreContainer) loadMoreContainer.innerHTML = '<div class="placeholder-card">Loading...</div>';
    try {
        const response = await fetch(url);
        const data     = await response.json();
        if (type === "artists")  displayArtistResults(data.data.results);
        else if (type === "albums") displayAlbumResults(data.data.results);
    } catch (error) {
        console.error("Failed to load more:", error);
        if (loadMoreContainer) loadMoreContainer.innerHTML = '<div class="placeholder-card" style="color:red;">Failed to load.</div>';
    }
}

// ─── Clear search input ───────────────────────────────────────────────────────
export function clearSearch() {
    document.getElementById("search-results-container")?.classList.add("hidden");
    document.getElementById("default-content").classList.remove("hidden");
    document.getElementById("searchInput").value = "";
}

// ─── Search history ───────────────────────────────────────────────────────────
export function updateHistory() {
    const historyList = document.getElementById("historyList");
    const searchInputquery = document.getElementById("searchPageInput");
    historyList.innerHTML = "";
    if (state.searchHistory.length === 0) {
        historyList.innerHTML = "<p>No recent searches yet.</p>";
        return;
    }
    state.searchHistory.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        li.onclick     = () => { searchInputquery.value = item; };
        historyList.appendChild(li);
    });
}

// ─── Voice search ─────────────────────────────────────────────────────────────
export function initVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous      = false;
    recognition.lang            = "en-IN";
    recognition.interimResults  = false;

    const micBtn = document.getElementById("micBtn");
    micBtn?.addEventListener("click", () => { recognition.start(); console.log("Sun raha hoon... 🎧"); });

    recognition.onresult = (event) => {
        const voiceText = event.results[0][0].transcript;
        document.getElementById("searchPageInput").value = voiceText;
        Search(voiceText);
    };
    recognition.onerror = (event) => console.error("Voice error:", event.error);
    recognition.onend   = () => console.log("Listening band ho gaya 😴");
}

// ─── Debounced search input handler for the search page ──────────────────────
export const handleSearch = debounce(() => {
    const query = document.getElementById("searchPageInput")?.value.trim();
    if (!query) return;
    ["SongContainer", "ArtistContainer", "PlaylistContainer", "AlbumContainer"].forEach(id => {
        if (!document.getElementById(id).classList.contains("hidden")) {
            if (!state.isAiMode) OnlineSearch(query, id);
        }
    });
}, 500);

// ─── Search tab option buttons ────────────────────────────────────────────────
export function initSearchTabs() {
    const tabs = {
        SearchContainerOptionArtist:   "ArtistContainer",
        SearchContainerOptionAlbum:    "AlbumContainer",
        SearchContainerOptionPlaylist: "PlaylistContainer",
        SearchContainerOptionSong:     "SongContainer"
    };

    Object.entries(tabs).forEach(([btnId, target]) => {
        document.getElementById(btnId)?.addEventListener("click", async () => {
            const allIds = ["SongContainer", "ArtistContainer", "AlbumContainer", "PlaylistContainer"];
            allIds.forEach(id => {
                const el = document.getElementById(id);
                if (id !== target) el.classList.add("hidden");
                else el.classList.remove("hidden");
            });
            const query = document.getElementById("searchPageInput")?.value.trim();
            if (target !== "SongContainer" && query) {
                document.getElementById(target).innerHTML = "Searching";
                OnlineSearch(query, target);
            } else if (target === "SongContainer" && query) {
                Search(query);
            }
        });
    });
}

// ─── Search page input: debounce + Enter for AI mode ─────────────────────────
export function initSearchPageInput() {
    const searchInputquery = document.getElementById("searchPageInput");
    if (!searchInputquery) return;

    searchInputquery.addEventListener("input", handleSearch);

    searchInputquery.addEventListener("keydown", async (event) => {
        if (event.key === "Enter") {
            const query = searchInputquery.value.trim();
            if (!query) return;
            if (state.isAiMode) {
                console.log("🤖 AI Mode for:", query);
                await performSmartSearch(query);
            }
        }
    });
}

// ─── Inline search (top-nav search input) ────────────────────────────────────
export function initInlineSearch(sess) {
    const searchInput = document.getElementById("search");
    const resultsList = document.getElementById("results");

    searchInput.addEventListener("input", async () => {
        if (!sess) { alert("Please login to listen song"); return; }
        const query = searchInput.value.trim();
        resultsList.innerHTML = "";
        const songlist = document.querySelector(".inpSongList");
        songlist.style.display = "block";
        if (query.length === 0) return;

        try {
            const res   = await fetch(`/search?type=song&query=${encodeURIComponent(query)}`);
            const data  = await res.json();
            const songs = data.data.data.results;

            if (songs) {
                songs.slice(0, 7).forEach(song => {
                    const li = document.createElement("li");
                    li.innerHTML = `
                        <img src="${song.image[2].link}" alt="${song.name}" style="width:50px;height:50px;border-radius:4px;margin-right:10px;">
                        <span><b>${song.name}</b> - <strong>${song.artist_map.artists[0].name}</strong></span>`;
                    li.style.display    = "flex";
                    li.style.alignItems = "center";
                    li.style.gap        = "10px";
                    li.addEventListener("click", async () => {
                        songlist.style.display = "none";
                        playsong(song.image[2].link, song.name, song.artist_map.artists[0].name, song.id, song.download_url[4].link, song.duration);
                    });
                    resultsList.appendChild(li);
                });
            } else {
                resultsList.innerHTML = "<li>No results found</li>";
            }
        } catch (err) {
            console.error("Error fetching songs:", err);
            resultsList.innerHTML = "<li>API Error</li>";
        }
    });
}
