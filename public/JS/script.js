/**
 * script.js — Application Entry Point
 *
 * This file is a thin orchestrator. It:
 *   1. Imports all feature modules
 *   2. Boots the equalizer and AI search mode
 *   3. Wires cross-module callbacks (breaking circular deps cleanly)
 *   4. Runs the DOMContentLoaded initialisation sequence
 *   5. Exposes all functions that EJS inline-onclick attributes need on window
 *
 * No business logic lives here — everything is delegated to its module.
 */

// ── Core utilities & shared state ───────────────────────────────────────────
import { state }                 from "./state.js";
import { debounce, escapeHtml, formatTime } from "./modules/helpers.js";
import { logBehavior }           from "./modules/tracking.js";
import { createEqualizer }       from "./modules/equalizer.js";
import { initAiSearchMode }      from "./modules/aiSearchMode.js";

// ── UI utilities ─────────────────────────────────────────────────────────────
import {
    highlight, popupAlert, closePopup, updateInitialPlaylist,
    downloadSong, universalPageHandler, addUnique
} from "./modules/ui.js";

// ── Audio player ─────────────────────────────────────────────────────────────
import {
    player, seekBar1, fillBar,
    playpause, updateSeekBar, updateplaytime,
    initPlayerListeners
} from "./modules/player.js";

// ── Playback engine ──────────────────────────────────────────────────────────
import {
    playsong, playbackControl, fetchSongs, playSong,
    handleSongClick, currentPlayingMusic,
    registerNowPlayingCallback, registerEqualizerInit
} from "./modules/playback.js";

// ── Recently played ──────────────────────────────────────────────────────────
import { updateRecently, displayRecently, recentlyDisplay } from "./modules/recently.js";

// ── Favorites ────────────────────────────────────────────────────────────────
import {
    favorite, DisplayLiked, renderLikedSongs,
    addFavorite, addSearchSongFavorite
} from "./modules/favorites.js";

// ── Playlists ────────────────────────────────────────────────────────────────
import {
    librarySongs, fetchPlaylist, playlistDetail, plus, removeSong,
    playlistThreeDot, showRenameInput, handleRenameSubmit,
    initPlusButton, initCreatePlaylistForm, initPlaylistSearchFilter,
    registerMQchange, registerHomename
} from "./modules/playlist.js";

// ── Detail views ─────────────────────────────────────────────────────────────
import {
    getAlbumDetails, getArtistDetails, getPlayListDetails,
    addToPlaylist, addArtist, playPlaylistSongs,
    displayArtistResults, displayAlbumResults, displayPlaylistResult
} from "./modules/detail.js";

// ── Now Playing panel ────────────────────────────────────────────────────────
import {
    currentPlayingSongDetails, initLyricsToggle
} from "./modules/nowPlaying.js";

// ── Home page grids ───────────────────────────────────────────────────────────
import { initializeHomePage, loadMadeForYou } from "./modules/home.js";

// ── Search ────────────────────────────────────────────────────────────────────
import {
    Search, OnlineSearch, performSmartSearch, renderSongCard,
    loadMore, clearSearch, updateHistory,
    handleSearch, initSearchTabs, initSearchPageInput,
    initInlineSearch, initVoiceSearch, fetchAndDisplayArtist
} from "./modules/search.js";

// ── Social / Profile ─────────────────────────────────────────────────────────
import {
    openProfilePage, makePlaylistTile, searchUsersForRequest,
    sendRequest, openFriendSection, renderFriendList, searchFriend,
    openShareModal, profileThreeDot, initSocialListeners
} from "./modules/social.js";

// ── Chat / WebSocket ──────────────────────────────────────────────────────────
import {
    initWebSocket, initChatListeners, openChatWith, closeChatDrawer,
    sendSongShare, sendPlaylistShare, clearChatBadge
} from "./modules/chat.js";

// ── Navigation ────────────────────────────────────────────────────────────────
import {
    home, libraryshow, homename, renderSearch,
    checkMQ, MQchange, initNavListeners
} from "./modules/navigation.js";

// ── Dropdown ──────────────────────────────────────────────────────────────────
import {
    toggleDropdown, fetchplaylistList, songToggleDropdown,
    initDropdownCloseListener
} from "./modules/dropdown.js";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Cross-module callback wiring (breaks circular dependencies cleanly)
// ═══════════════════════════════════════════════════════════════════════════════

// playback.js needs currentPlayingSongDetails from nowPlaying.js
registerNowPlayingCallback(currentPlayingSongDetails);

// playback.js needs the equalizer's initEqualizer — set after we create it
const sess    = window.sess;
const sliders = document.querySelectorAll(".vertical-slider");
const equalizer = createEqualizer({ player, sliders });
const { applySettings, initEqualizer } = equalizer;

registerEqualizerInit(initEqualizer);
equalizer.bindSliders();

// playlist.js needs MQchange + homename (from navigation.js) for fetchPlaylist
registerMQchange(MQchange);
registerHomename(homename);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Player event listeners (wired after playback.js is available)
// ═══════════════════════════════════════════════════════════════════════════════

initPlayerListeners({
    onSongEnd: () => {
        logBehavior({
            type: "complete",
            song: { songName: state.globalSongName, songId: state.globalSongId, artist: state.globalArtist }
        });
        playbackControl(state.globalLibrary, state.globalSongName);
    },

    onForward: () => {
        const { currentTime, duration } = player;
        if (!state.globalSongId || !duration || isNaN(duration)) {
            playbackControl(state.globalLibrary, state.globalSongName, "forward");
            return;
        }
        const completionRate = currentTime / duration;
        let interactionType  = completionRate >= 0.8 ? "complete" : completionRate < 0.2 ? "skip" : "play";
        logBehavior({ type: interactionType, song: { songName: state.globalSongName, songId: state.globalSongId, artist: state.globalArtist } });
        playbackControl(state.globalLibrary, state.globalSongName, "forward");
    },

    onBackward: () => {
        const { currentTime, duration } = player;
        if (!state.globalSongId || !duration || isNaN(duration)) {
            playbackControl(state.globalLibrary, state.globalSongName, "backward");
            return;
        }
        const completionRate = currentTime / duration;
        let interactionType  = completionRate >= 0.8 ? "complete" : completionRate < 0.2 ? "skip" : "play";
        logBehavior({ type: interactionType, song: { songName: state.globalSongName, songId: state.globalSongId, artist: state.globalArtist } });
        playbackControl(state.globalLibrary, state.globalSongName, "backward");
    },

    onPlayPause: (key) => {
        if (key === "l") { recentlyDisplay(); displayRecently(); }
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Equalizer wiring
// ═══════════════════════════════════════════════════════════════════════════════

equalizer.bindPresetButtons();
equalizer.bindAiButton(() => ({
    song:   state.aiCurrentSong,
    artist: state.aiCurrentArtist
}));

// ═══════════════════════════════════════════════════════════════════════════════
// 4. AI Search Mode
// ═══════════════════════════════════════════════════════════════════════════════

initAiSearchMode({
    getIsAiMode: ()    => state.isAiMode,
    setIsAiMode: value => { state.isAiMode = value; }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. DOMContentLoaded — full application bootstrap
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", async () => {
    // Load JioSaavn base URL from backend
    try {
        const r = await fetch("/url");
        const { url } = await r.json();
        state.SAAVN_BASE_URL = url;
    } catch (e) { console.warn("Could not load SAAVN_BASE_URL"); }

    // Wire all navigation listeners
    initNavListeners(sess);

    // Wire search input + tabs + voice search
    initSearchPageInput();
    initSearchTabs();
    initVoiceSearch();
    initInlineSearch(sess);

    // Wire playlist CRUD UI
    initPlusButton(() => state.currentSong);
    initCreatePlaylistForm();
    initPlaylistSearchFilter();

    // Wire now-playing lyrics toggle
    initLyricsToggle();

    // Wire dropdown close listener
    initDropdownCloseListener();

    // Wire social listeners (share modal, friend modal, now-playing panel)
    initSocialListeners();

    // Wire chat drawer listeners
    initChatListeners();

    // Load initial search history
    state.searchHistory = JSON.parse(localStorage.getItem("searchHistory")) || [];
    updateHistory();

    // Clear search history button
    document.getElementById("clearHistoryBtn")?.addEventListener("click", () => {
        state.searchHistory = [];
        localStorage.removeItem("searchHistory");
        updateHistory();
    });

    if (sess === true) {
        // Authenticated user bootstrap
        initializeHomePage();

        // Connect WebSocket for real-time chat
        initWebSocket();

        if (!("webkitSpeechRecognition" in window)) {
            console.warn("Voice search not supported in this browser.");
        }

        document.querySelector(".currentPlayingMusic").style.display = "flex";
        document.getElementById("percent").innerHTML = `${Math.round(player.volume * 100)}%`;
        document.getElementById("fillBar").style.width = "100%";

        home();
        checkMQ(window.matchMedia("(max-width: 768px)"));
    } else {
        document.querySelector(".no-login").style.display = "flex";
        document.querySelector(".currentPlayingMusic").style.display = "none";
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Global window assignments (required by EJS inline onclick attributes)
//    Keep these in sync with Object.assign below if adding new functions.
// ═══════════════════════════════════════════════════════════════════════════════

// Also expose universalPageHandler directly (used by social.js via window)
window.universalPageHandler = universalPageHandler;
window.popupAlert = popupAlert;

Object.assign(window, {
    // Playback
    playSong,
    playsong,
    playbackControl,

    // Favorites
    addArtist,
    addFavorite,
    addSearchSongFavorite,
    favorite,
    DisplayLiked,

    // Playlists
    librarySongs,
    fetchPlaylist,
    playlistDetail,
    playlistThreeDot,
    removeSong,
    showRenameInput,

    // Detail views
    getAlbumDetails,
    getArtistDetails,
    getPlayListDetails,
    addToPlaylist,
    playPlaylistSongs,

    // Search
    loadMore,
    loadMadeForYou,
    Search,
    performSmartSearch,
    clearSearch,

    // Miscellaneous
    downloadSong,
    opendownload:    () => window.open("download", "_blank"),
    redirect:        () => window.open("https://apps.microsoft.com/store/detail/9NCBCSZSJRSB?launch=true&mode=mini&cid=spotifyweb-store-button", "_blank"),
    openFriendSection,
    openProfilePage,
    profileThreeDot,
    sendRequest,
    searchUsersForRequest,

    // Chat
    openChatWith,
    closeChatDrawer,
    sendSongShare,
    sendPlaylistShare,
    clearChatBadge,

    // Dropdown
    toggleDropdown,
    songToggleDropdown,

    // Navigation
    showMainView: () => {},   // placeholder — currently no-op

    // Social
    openShareModal,
});
