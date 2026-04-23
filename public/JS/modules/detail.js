/**
 * detail.js — Detail views for Albums, Artists, and Online Playlists.
 * Also owns: addArtist (follow), addToPlaylist (import online playlist),
 * playPlaylistSongs.
 */
import { state }                                from "../state.js";
import { universalPageHandler, addUnique, highlight, popupAlert } from "./ui.js";
import { playsong, playSong, fetchSongs }       from "./playback.js";
import { fetchPlaylist, librarySongs }          from "./playlist.js";
import { addFavorite, addSearchSongFavorite }   from "./favorites.js";
import { toggleDropdown, songToggleDropdown }   from "./dropdown.js";

// ─── Album Detail View ────────────────────────────────────────────────────────
export async function getAlbumDetails(albumId) {
    universalPageHandler();
    addUnique("MainHomePage-2");
    const mainHomePage = document.getElementById("MainHomePage-2");
    mainHomePage.classList.remove("hidden");
    mainHomePage.innerHTML = '<div class="placeholder-card">Loading Album Details...</div>';

    try {
        const [response, fav_res] = await Promise.all([
            fetch(`/search?type=albumID&query=${albumId}`),
            fetch("/get-favorite")
        ]);
        const data      = await response.json();
        const result    = await fav_res.json();
        const album     = data.data.data;

        const songsHtml = album.songs.map((song, index) => `
    <div class="song-list-item-1">
        <span class="song-number">${index + 1}</span>
        <img src="${song.image[2].link}" alt="${song.name}" class="song-image">
        <div class="song-info" onclick="playSong('${song.download_url[4].link}','${song.id}', '${song.name}', '${song.artist_map.artists[0].name}', '${song.image[2].link}','${song.duration}','album',${albumId})">
            <div class="song-name text-white">${song.name}</div>
            <div class="song-artist">${song.artist_map.artists[0].name}</div>
        </div>
        <div>
         <i class="bx bxs-heart text-${result?.arr?.some(item => item.songId === song.id) ? "danger" : "gray"}" id="heart-${index}" onclick="addFavorite(event,'${song.download_url[4].link}','${song.image[2].link}','${song.name}','${song.artist_map.artists[0].name}','${song.duration}','${index}','${song.id}')" title="Add to Like"></i>
        </div>
        <div class="relative" id="albumPlusIcon-${index}">
            <button class="play-button" onclick="toggleDropdown(event, ${index},'${song.download_url[4].link}','${song.name}','${song.image[2].link}','${song.duration}','${song.artist_map.artists[0].name}','${song.id}')" title="Add to Playlist">+</button>
        </div>
    </div>
`).join("");

        mainHomePage.innerHTML = `
            <div class="detail-view">
                <button class="back-button" onclick="showMainView()">← Back to Home</button>
                <div class="detail-header">
                    <img src="${album.image[2].link}" alt="${album.name}" class="detail-image">
                    <div class="detail-info">
                        <h1 class="text-white">${album.name}</h1>
                        <p>${album.artist_map.artists[0].name} • ${album.year}</p>
                        <p>${album.song_count} songs</p>
                        <button class="play-all-button" onclick="playSong('${album.songs[0].download_url[4].link}','${album.songs[0].id}', '${album.songs[0].name}', '${album.songs[0].artist_map.artists[0].name}', '${album.songs[0].image[2].link}','album','${albumId}')">▶ Play All</button>
                    </div>
                </div>
                <div class="song-list">${songsHtml}</div>
            </div>`;
    } catch (error) {
        console.error("Error fetching album details:", error);
        mainHomePage.innerHTML = '<div class="placeholder-card">Error fetching album details. <button class="back-button" onclick="showMainView()">Go Back</button></div>';
    }
}

// ─── Artist Detail View ───────────────────────────────────────────────────────
export async function getArtistDetails(artistId) {
    universalPageHandler();
    addUnique("MainHomePage-2");
    const mainHomePage = document.getElementById("MainHomePage-2");
    mainHomePage.classList.remove("hidden");
    mainHomePage.innerHTML = '<div class="placeholder-card">Loading Artist Details...</div>';

    try {
        const response  = await fetch(`/search?type=artistID&query=${artistId}`);
        const data      = await response.json();
        if (!data || !data.data) { mainHomePage.innerHTML = `<div class="placeholder-card">Could not load artist details.<button class="back-button" onclick="showMainView()">Go Back</button></div>`; return; }

        const artistData   = data.data.data;
        const topSongs     = artistData.top_songs     || artistData.topSongs     || [];
        const topAlbums    = artistData.top_albums    || artistData.topAlbums    || [];
        const NewReleases  = artistData.latest_release || [];
        const TopPlaylist  = artistData.featured_artist_playlist || [];

        const topSongsHtml = topSongs.length
            ? topSongs.map((song, index) => {
                const image       = song.image?.[2]?.link || "";
                const artistName  = song.artist_map?.artists?.[0]?.name || song.subtitle?.split(" - ")[0] || "Unknown Artist";
                const downloadLink = song.download_url?.[4]?.link || "#";
                const duration    = song.duration || "0";
                return `
                    <div class="song-list-item-1 artistTopSongs">
                        <span class="song-number">${index + 1}</span>
                        <img src="${image}" alt="${song.name}" class="song-image">
                        <div class="song-info" onclick="playSong('${downloadLink}','${song.id}','${song.name}','${artistName}','${image}','${duration}','artist','${artistId}')">
                            <div class="song-title text-white font-bold">${song.name}</div>
                            <div class="song-artist">${artistName}</div>
                        </div>
                        <i class="bx bxs-heart text-gray" onclick="addFavorite('${downloadLink}','${image}','${song.name}','${artistName}','${duration}','${song.id}')" title="Add to Like"></i>
                        <div class="relative" id="albumPlusIcon-${index}">
                            <button class="play-button" onclick="toggleDropdown(event, ${index}, '${downloadLink}', '${song.name}', '${image}', '${duration}', '${artistName}', '${song.id}')" title="Add to Playlist">+</button>
                        </div>
                    </div>`;
            }).join("")
            : `<p class="no-data">No Top Songs Found.</p>`;

        const topAlbumsHtml = topAlbums.length
            ? topAlbums.map(album => `
                <div class="item-card" onclick="getAlbumDetails('${album.id}')">
                    <img src="${album.image?.[2]?.link || ""}" alt="${album.name}" class="item-card-image">
                    <div class="item-card-title">${album.name}</div>
                    <div class="item-card-subtitle">${album.year || ""}</div>
                </div>`).join("")
            : `<p class="no-data">No Albums Found.</p>`;

        const newReleasesHtml = NewReleases.map(album => `
            <div class="item-card" onclick="getAlbumDetails('${album.id}')">
                <img src="${album.image?.[2]?.link || ""}" alt="${album.name}" class="item-card-image">
                <div class="item-card-title">${album.name}</div>
                <div class="item-card-subtitle">${album.year || ""}</div>
            </div>`).join("");

        const topPlaylistsHtml = TopPlaylist.map(playlist => `
            <div class="item-card" onclick="getPlayListDetails('${playlist.id}', '${playlist.name}','${playlist.image}')">
                <img src="${playlist.image || ""}" alt="${playlist.name}" class="item-card-image">
                <div class="item-card-title">${playlist.name}</div>
            </div>`).join("");

        mainHomePage.innerHTML = `
            <div class="detail-view">
                <button class="back-button" onclick="showMainView()">← Back to Home</button>
                <div class="detail-header artist-header">
                    <img src="${artistData.image?.[2]?.link || ""}" alt="${artistData.name}" class="detail-image artist-image">
                    <div class="detail-info">
                        <h1 class="text-white">${artistData.name}</h1>
                        <p>${parseInt(artistData.follower_count || 0).toLocaleString()} Followers</p>
                    </div>
                    <div class="button">
                        <button class="flex items-center justify-center gap-2" onclick="addArtist('${artistId}','${artistData.name}')">
                            <i class="bx bx-plus font-bold"></i>Follow
                        </button>
                    </div>
                </div>
                <div class="content-category"><h2>New Releases</h2><div class="content-grid">${newReleasesHtml}</div></div>
                <div class="content-category"><h2>Top Songs</h2><div class="song-list">${topSongsHtml}</div></div>
                <div class="content-category"><h2>Top Playlists</h2><div class="content-grid">${topPlaylistsHtml}</div></div>
                <div class="content-category"><h2>Top Albums</h2><div class="content-grid">${topAlbumsHtml}</div></div>
            </div>`;

    } catch (error) {
        console.error("Error fetching artist details:", error);
        mainHomePage.innerHTML = `<div class="placeholder-card">Error fetching artist details.<button class="back-button" onclick="showMainView()">Go Back</button></div>`;
    }
}

// ─── Online Playlist Detail View ──────────────────────────────────────────────
export async function getPlayListDetails(playlistId, playlistName, playlistImage) {
    universalPageHandler();
    const mainHomePage = document.getElementById("MainHomePage-2");
    mainHomePage.classList.remove("hidden");
    mainHomePage.innerHTML = '<div class="placeholder-card">Loading Playlist Details...</div>';

    const res    = await fetch(`/search?type=playlistID&query=${playlistId}`);
    const result = await res.json();
    const safePlaylistName = (playlistName || "My Playlist").replace(/'/g, "\\'");

    let html = `
        <div class="playlist-details text-white">
            <button class="back-button" onclick="showMainView()">← Back to Home</button>
            <div class="flex gap-5 items-center ">
                <img src="${playlistImage}" class=" h-150px rounded-lg">
                <h2>${playlistName || "My Playlist"}</h2>
                <button class="play-button" onclick="addToPlaylist(${playlistId})" > + </button>
            </div>
        </div>
        <ul class="playlist-songs">`;

    let index = 1;
    result.data.data.songs.forEach(song => {
        const safeName   = song.name.replace(/'/g, "\\'");
        const safeArtist = song.artist_map.artists[0].name.replace(/'/g, "\\'");
        html += `
            <li data-id="${song.id}" class="song-list-item mt-2 pointer font-bold">
                <div class="flex justify-center"><p>${index}</p></div>
                    <img src=${song.image[2].link} class="img-2 rounded">
                <div class="song-info" onclick="playPlaylistSongs('${song.id}','${playlistId}')" id="playlistSongName">
                    <div><p class="playlist-song-title">${song.name}</p></div>
                    <div><p class="text-sm text-gray">${song.artist_map.artists[0].name}</p></div>
                </div>
                <div><i class="bx bxs-download text-lg text-gray"></i></div>
                <div>
                    <i class="bx bxs-heart text-gray" id="heart-${index}" onclick="addSearchSongFavorite(event,${index},'${song.id}')"></i>
                </div>
                <div class="relative" id="albumPlusIcon-${index}">
                    <button class="play-button" onclick="songToggleDropdown(event,${index},'${song.id}')" > + </button>
                </div>
            </li>`;
        index++;
    });

    html += `</ul>`;
    mainHomePage.innerHTML = html;
}

// ─── Play a song from an online playlist ─────────────────────────────────────
export async function playPlaylistSongs(songId, playlistId) {
    const response = await fetch(`/search?type=songID&query=${songId}`);
    const result   = await response.json();
    const song     = result.data.data.songs[0];
    highlight(song.name, "playlist");
    state.globalLibrary = "OnlinePlaylist";
    state.globalAlbumId = playlistId;
    playsong(song.image[2].link, song.name, song.artist_map.artists[0].name,
        song.id, song.download_url[4].link, song.duration);
}

// ─── Import an online playlist into user library ──────────────────────────────
export async function addToPlaylist(playlistId) {
    const res    = await fetch(`https://saavn.dev/api/playlists?id=${playlistId}&page=0&limit=10`);
    const result = await res.json();

    const response = await fetch("/playlistname", {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: result.data.name, imageUrl: result.data.image[2].url })
    });
    const result1 = await response.json();

    if (response.status === 200) {
        const songlist = await fetch("/playlistData", {
            method: "post",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playlistId })
        });
        const songlistresult = await songlist.json();
        const ids   = songlistresult.playlistSongs.map(item => item.id);
        const songs = await fetchSongs(ids);

        await fetch("/save", {
            method: "post",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pname: result.data.name, songList: songs })
        });
        fetchPlaylist();
        popupAlert(result1.msg);
    } else {
        popupAlert(result1.msg);
    }
}

// ─── Follow / unfollow artist ─────────────────────────────────────────────────
export async function addArtist(id, artistName) {
    const res    = await fetch("/addArtist", {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
    });
    const result = await res.json();
    popupAlert(result.msg);
}

// ─── Search page: display artist / album / playlist grids ─────────────────────
export const RESULTS_PER_PAGE = 10;

export function displayArtistResults(artists) {
    const artistGrid        = document.getElementById("artist-grid");
    const loadMoreContainer = document.getElementById("load-more-artists-container");
    artistGrid.innerHTML   += artists.map(artist => `
        <div class="item-card" onclick="getArtistDetails('${artist.id}')">
            <img src="${artist.image?.[2]?.url || "/placeholder.jpg"}" alt="${artist.name}" class="item-card-image artist-image">
            <div class="item-card-title">${artist.name}</div>
            <div class="item-card-subtitle">${artist.role || "Artist"}</div>
        </div>`).join("");
    loadMoreContainer.innerHTML = artists.length === RESULTS_PER_PAGE
        ? `<button class="load-more-button" onclick="loadMore('artists')">Load More Artists</button>` : "";
}

export function displayAlbumResults(albums) {
    const albumGrid         = document.getElementById("album-grid");
    const loadMoreContainer = document.getElementById("load-more-albums-container");
    albumGrid.innerHTML    += albums.map(album => `
        <div class="item-card" onclick="getAlbumDetails('${album.id}')">
            <img src="${album.image?.[2]?.url || "/placeholder.jpg"}" alt="${album.name}" class="item-card-image">
            <div class="item-card-title">${album.name}</div>
            <div class="item-card-subtitle">${album.year}</div>
        </div>`).join("");
    loadMoreContainer.innerHTML = albums.length === RESULTS_PER_PAGE
        ? `<button class="load-more-button" onclick="loadMore('albums')">Load More Albums</button>` : "";
}

export function displayPlaylistResult(playlist) {
    const grid = document.getElementById("playlist-grid");
    grid.innerHTML += playlist.map(artist => `
        <div class="item-card" onclick="getPlayListDetails('${artist.id}','${artist.title}','${artist.image}')">
            <img src="${artist.image || "/placeholder.jpg"}" alt="${artist.name}" class="item-card-image artist-image">
            <div class="item-card-title">${artist.title}</div>
            <div class="item-card-subtitle">${artist.type || "Artist"}</div>
        </div>`).join("");
}

// stub - overridden via window from navigation
export function showMainView() {}
