/**
 * home.js — Home page: featured grids (Trending, Albums, Artists, Charts,
 * Playlists, New Releases) and the "Made For You" AI recommendations feed.
 */
import { state }                                from "../state.js";
import { universalPageHandler, addUnique, updateInitialPlaylist } from "./ui.js";
import { playsong, playSong }                   from "./playback.js";
import { getAlbumDetails, getArtistDetails, getPlayListDetails } from "./detail.js";

// ─── Initialize the full home page ───────────────────────────────────────────
export async function initializeHomePage() {
    addUnique("default-container-parent");
    universalPageHandler();
    document.getElementById("default-container-parent").classList.remove("hidden");

    const res    = await fetch(`/search?type=home&query=a`);
    const result = await res.json();
    const allData = result.data.data;

    const newReleasesKey = Object.keys(allData).find(key =>
        allData[key].title === "New Releases Pop - Hindi"
    );
    const finalNewReleasesData = newReleasesKey ? allData[newReleasesKey].data : [];

    await Trending(allData.trending.data);
    await artistHome(allData.artist_recos.data);
    await topCharts(allData.charts.data);
    await newPlaylists(allData.playlists.data);
    await newReleases(finalNewReleasesData);
    await newAlbum(allData.albums.data);
    await loadMadeForYou();
}

// ─── AI Recommendations Feed ──────────────────────────────────────────────────
export async function loadMadeForYou() {
    if (state.loadingReco) return;
    state.loadingReco = true;

    const grid         = document.getElementById("personalReco");
    const btnContainer = document.getElementById("load-more-foryou-container");
    if (!grid) { state.loadingReco = false; return; }

    if (btnContainer) {
        btnContainer.innerHTML = '<button class="load-more-button" disabled>Personalizing Your Mix...</button>';
    }

    try {
        const res  = await fetch("/recommendations", { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error("Network error");
        const data = await res.json();

        if (data.success && data.songs?.length > 0) {
            const fragment   = document.createDocumentFragment();
            let firstNewCard = null;

            data.songs.forEach(song => {
                if (state.shownSongIds.has(song.id)) return;
                state.shownSongIds.add(song.id);

                const card = document.createElement("div");
                card.className = "item-card fade-in";
                card.innerHTML = `
                    <img src="${song.image}" alt="${song.title}" class="item-card-image">
                    <div class="item-card-title">${song.title}</div>`;

                card.addEventListener("click", () => {
                    state.currentSong = song.id;
                    playsong(song.image, song.title, song.artist, song.id, song.url, song.duration, song.type);
                });

                if (!firstNewCard) firstNewCard = card;
                fragment.appendChild(card);
            });

            grid.appendChild(fragment);
            if (firstNewCard) firstNewCard.scrollIntoView({ behavior: "smooth", block: "start" });

            if (btnContainer) {
                btnContainer.innerHTML = `<button class="load-more-button" onclick="loadMadeForYou()">Load More For You</button>`;
            }
        } else {
            if (btnContainer) btnContainer.innerHTML = '<p style="color:gray">No more recommendations right now.</p>';
        }
    } catch (error) {
        console.error("Recommendation Fetch Error:", error);
        if (btnContainer) btnContainer.innerHTML = `<button class="load-more-button" onclick="loadMadeForYou()">Retry</button>`;
    } finally {
        state.loadingReco = false;
    }
}

// ─── Grid Renderers ───────────────────────────────────────────────────────────
export async function newReleases(data) {
    const grid = document.getElementById("newReleasesGrid");
    grid.innerHTML = "";
    data.forEach(item => {
        const card = document.createElement("div");
        card.className = "item-card";
        card.innerHTML = `
            <img src="${item.image?.[2]?.link || "/placeholder.jpg"}" alt="${item.name}" class="item-card-image">
            <div class="item-card-title">${item.name}</div>`;
        card.addEventListener("click", async () => {
            if (item.type === "song") {
                const req    = await fetch(`/search?type=songID&query=${item.id}`);
                const result = await req.json();
                const song   = result.data.data.songs[0];
                updateInitialPlaylist(song.id);
                state.currentSong = song.id;
                playsong(song.image[2].link, song.name, song.artist_map.artists[0].name, song.id, song.download_url[4].link, song.duration);
            } else if (item.type === "album") {
                getAlbumDetails(item.id);
            } else if (item.type === "playlist") {
                console.log("playlist");
            }
        });
        grid.appendChild(card);
    });
}

export async function Trending(data) {
    const grid = document.getElementById("newTrendingGrid");
    grid.innerHTML = "";
    data.forEach(item => {
        const imgSrc = Array.isArray(item.image) ? item.image?.[2]?.link : item.image;
        const card   = document.createElement("div");
        card.className = "item-card";
        card.innerHTML = `
            <img src="${imgSrc}" alt="${item.name}" class="item-card-image">
            <div class="item-card-title">${item.name}</div>
            <div class="item-card-subtitle">${item.year || 2025}</div>`;
        card.addEventListener("click", async () => {
            if (item.type === "song") {
                const req    = await fetch(`/search?type=songID&query=${item.id}`);
                const result = await req.json();
                const song   = result.data.songs[0];
                updateInitialPlaylist(song.id);
                state.currentSong = song.id;
                playsong(song.image[2].link, song.name, song.artist_map.artists[0].name, song.id, song.download_url[4].link, song.duration);
            } else if (item.type === "album") {
                getAlbumDetails(item.id);
            } else if (item.type === "playlist") {
                getPlayListDetails(item.id, item.name, imgSrc);
            }
        });
        grid.appendChild(card);
    });
}

export async function artistHome(data) {
    const grid = document.getElementById("featuredArtistGrid");
    grid.innerHTML = "";
    data.forEach(item => {
        const imgSrc = Array.isArray(item.image) ? item.image?.[2]?.link : item.image;
        const card   = document.createElement("div");
        card.className = "item-card";
        card.innerHTML = `
            <img src="${imgSrc}" alt="${item.name}" class="item-card-image">
            <div class="item-card-title">${item.name}</div>
            <div class="item-card-subtitle">${!item.year ? 2025 : item.year}</div>`;
        card.addEventListener("click", () => getArtistDetails(item.id));
        grid.appendChild(card);
    });
}

export async function topCharts(data) {
    const grid = document.getElementById("newChartsGrid");
    grid.innerHTML = "";
    data.forEach(item => {
        const imgSrc = Array.isArray(item.image) ? item.image?.[2]?.link : item.image;
        const card   = document.createElement("div");
        card.className = "item-card";
        card.innerHTML = `
            <img src="${imgSrc}" alt="${item.name}" class="item-card-image">
            <div class="item-card-title">${item.name}</div>`;
        card.addEventListener("click", () => getPlayListDetails(item.id, item.name, item.image));
        grid.appendChild(card);
    });
}

export async function newPlaylists(data) {
    const grid = document.getElementById("newPlaylistsGrid");
    grid.innerHTML = "";
    data.forEach(item => {
        const imgSrc = Array.isArray(item.image) ? item.image?.[2]?.link : item.image;
        const card   = document.createElement("div");
        card.className = "item-card";
        card.innerHTML = `
            <img src="${imgSrc}" alt="${item.name}" class="item-card-image">
            <div class="item-card-title">${item.name}</div>`;
        card.addEventListener("click", () => getPlayListDetails(item.id, item.name, item.image));
        grid.appendChild(card);
    });
}

export async function newAlbum(data) {
    const grid = document.getElementById("featuredAlbumGrid");
    grid.innerHTML = "";
    data.forEach(item => {
        const card = document.createElement("div");
        card.className = "item-card";
        card.innerHTML = `
            <img src="${item.image?.[2]?.link || "/placeholder.jpg"}" alt="${item.name}" class="item-card-image">
            <div class="item-card-title">${item.name}</div>
            <div class="item-card-subtitle">${item.year === 0 ? "2025" : item.year}</div>`;
        card.addEventListener("click", async () => {
            if (item.type === "song") {
                const req    = await fetch(`/search?type=songID&query=${item.id}`);
                const result = await req.json();
                const song   = result.data.data.songs[0];
                updateInitialPlaylist(song.id);
                state.currentSong = song.id;
                playsong(song.image[2].link, song.name, song.artist_map.artists[0].name, song.id, song.download_url[4].link, song.duration);
            } else if (item.type === "album") {
                getAlbumDetails(item.id);
            } else if (item.type === "playlist") {
                getPlayListDetails(item.id, item.name, item.image[2].link);
            }
        });
        grid.appendChild(card);
    });
}
