/**
 * playback.js — Core song playback logic.
 * Owns: playsong(), playbackControl(), fetchSongs(), playSong(),
 *       currentPlayingMusic(), handleSongClick().
 *
 * currentPlayingMusic() wants to call currentPlayingSongDetails() (nowPlaying.js).
 * To avoid a circular dep (playback → nowPlaying → detail → playback), we use
 * a late-bound callback set by script.js via registerNowPlayingCallback().
 */
import { state }        from "../state.js";
import { player, playpause } from "./player.js";
import { logBehavior }  from "./tracking.js";
import { highlight, popupAlert, updateInitialPlaylist } from "./ui.js";
import { updateRecently, displayRecently } from "./recently.js";

/* ── Injected by script.js after all modules load ───────────────────────────── */
let _currentPlayingSongDetails = () => {};
export function registerNowPlayingCallback(fn) { _currentPlayingSongDetails = fn; }

/* ── Injected by script.js: equalizer init tied to audio context ─────────────*/
let _initEqualizer = () => {};
export function registerEqualizerInit(fn) { _initEqualizer = fn; }

// ─── Current Playing Music Bar Update ────────────────────────────────────────
export async function currentPlayingMusic(img, name, artist, id) {
    document.getElementById("currentPlayingSongImg").src = img;
    const trimmedName = name.split(" ").slice(0, 4).join(" ");
    document.getElementById("currentPlayingName").innerHTML = `<span> <strong>${trimmedName}</strong></span>`;
    document.getElementById("Plus").style.display = "block";
    _currentPlayingSongDetails(id);
    state.songStartTime = Date.now();
    state.isSkipped = true;
}

// ─── Play a Song ──────────────────────────────────────────────────────────────
export async function playsong(image, name, artist, id, url, duration, source = "search") {
    // Log previous song interaction before switching
    if (state.globalSongId && state.globalArtist && player.duration && !isNaN(player.duration)) {
        const completionRate = player.currentTime / player.duration;
        let interactionType = "play";
        if (completionRate >= 0.8) interactionType = "complete";
        else if (completionRate < 0.2) interactionType = "skip";

        logBehavior({
            type: interactionType,
            source: source,
            song: { songName: state.globalSongName, songId: state.globalSongId, artist: state.globalArtist }
        });
    }

    _initEqualizer();
    currentPlayingMusic(image, name, artist, id);
    player.src = url;
    player.pause();
    await updateRecently(url, image, name, artist, duration, id);
    displayRecently();
    playpause();

    // Update global state
    state.globalSongName   = name;
    state.globalSongId     = id;
    state.globalArtist     = artist;
    state.aiCurrentSong    = name;
    state.aiCurrentArtist  = artist;
}

// ─── Fetch Songs by ID Array (for online playlists) ──────────────────────────
export async function fetchSongs(ids) {
    try {
        const results = await Promise.all(ids.map(async (id) => {
            const res  = await fetch(`https://saavn.dev/api/songs/${id}`);
            const json = await res.json();
            const song = json.data[0];
            return {
                songUrl:  song.downloadUrl?.[4]?.url  || "",
                image:    song.image?.[2]?.url         || "",
                songName: song.name                    || "",
                artist:   song.artists?.primary?.map(a => a.name).join(", ") || "",
                len:      Number(song.duration)        || 0,
                songId:   song.id
            };
        }));
        return results;
    } catch (err) {
        console.error("Error fetching songs:", err);
        return [];
    }
}

// ─── Playback Control: Next / Prev / Shuffle / Repeat ────────────────────────
export async function playbackControl(PlaylistName, SongName, direction = "forward") {
    let result, highlightname;

    if (!PlaylistName || (
        PlaylistName !== "Liked" &&
        PlaylistName !== "recently" &&
        PlaylistName !== "album" &&
        PlaylistName !== "artist" &&
        PlaylistName !== "OnlinePlaylist" &&
        PlaylistName !== "recently_1"
    )) {
        highlightname = "OnlineSongList";
        const res = await fetch("/librarySongs", {
            method: "post",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pname: PlaylistName })
        });
        result = await res.json();

    } else if (PlaylistName === "recently") {
        highlightname = "recently";
        result = await (await fetch("/updateRecently")).json();

    } else if (PlaylistName === "recently_1") {
        highlightname = "recently_1";
        result = await (await fetch("/updateRecently")).json();

    } else if (PlaylistName === "album") {
        highlightname = "album";
        const fetchResult = await fetch(`/search?type=albumID&query=${state.globalAlbumId}`);
        const raw = await fetchResult.json();
        result = {
            arr: raw.data.songs.map(song => ({
                songUrl:  song.download_url?.[4]?.link || "",
                image:    song.image?.[2]?.link         || "",
                songName: song.name                     || "",
                artist:   song.artists?.primary?.[0]?.name || "",
                len:      Number(song.duration)         || 0
            }))
        };

    } else if (PlaylistName === "artist") {
        highlightname = "artist";
        const fetchResult = await fetch(`/search?type=artistID&query=${state.globalAlbumId}`);
        const raw = await fetchResult.json();
        result = {
            arr: raw.data.topSongs.map(song => ({
                songUrl:  song.download_url?.[4]?.link || "",
                image:    song.image?.[2]?.link         || "",
                songName: song.name                     || "",
                artist:   song.artists?.primary?.[0]?.name || "",
                len:      Number(song.duration)         || 0
            }))
        };

    } else if (PlaylistName === "OnlinePlaylist") {
        highlightname = "playlist";
        const res = await fetch("/playlistData", {
            method: "post",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playlistId: state.globalAlbumId })
        });
        const raw = await res.json();
        const ids   = raw.playlistSongs.map(item => item.id);
        const songs = await fetchSongs(ids);
        result = { arr: songs };

    } else {
        // Liked
        highlightname = "Liked";
        result = await (await fetch("/get-favorite")).json();
    }

    const arr = result.arr;

    if (state.RepeatFlag === 1) {
        let index = arr.findIndex(song => song.songName === SongName);
        index = direction === "forward" ? index + 1 : index - 1;
        if (index >= arr.length) index = 0;
        if (index < 0) index = arr.length - 1;
        await _applyTrack(arr, index, highlightname);

    } else if (state.ShuffleFlag === 1) {
        let index;
        do { index = Math.floor(Math.random() * arr.length); }
        while (state.LastIndex === index);
        state.LastIndex = index;
        await _applyTrack(arr, index, highlightname);

    } else if (state.RepeatOneFlag === 1) {
        const index = arr.findIndex(song => song.songName === SongName);
        await _applyTrack(arr, index, highlightname);
    }
}

async function _applyTrack(arr, index, highlightname) {
    const song = arr[index];
    player.src = song.songUrl;
    if (highlightname !== "recently" && highlightname !== "recently_1") {
        await updateRecently(song.songUrl, song.image, song.songName, song.artist, song.len, song.songId);
        await displayRecently();
    }
    currentPlayingMusic(song.image, song.songName, song.artist, song.songId);
    playpause();
    state.globalSongName  = song.songName;
    state.globalSongId    = song.songId;
    state.globalArtist    = song.artist;
    highlight(song.songName, highlightname);
}

// ─── Wrapper for album/artist/playlist inline-onclick calls ──────────────────
export async function playSong(url, songId, title, artist, image, duration, source, id) {
    state.globalAlbumId = id;
    state.globalLibrary = source;
    state.currentSong   = songId;
    highlight(title, source);
    playsong(image, title, artist, songId, url, duration);
}

// ─── Generic song-click handler (recently played, liked, etc.) ───────────────
export function handleSongClick(song, libraryType) {
    highlight(song.songName, libraryType);
    state.globalLibrary = libraryType;
    state.currentSong   = song.songId;
    playsong(song.image, song.songName, song.artist, song.songId, song.songUrl, song.len);
}
