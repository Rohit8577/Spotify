/**
 * state.js — Single source of truth for all mutable global state.
 * All modules import this object and mutate its properties directly
 * so changes are shared across the entire application.
 */
export const state = {
    // --- Current Song ---
    currentSong: null,          // song ID currently selected for "Add to Playlist"
    globalSongName: "",
    globalSongId: "",
    globalArtist: "",
    globalAlbumId: "",          // album/artist/playlist ID for playbackControl context

    // --- Queue & Library ---
    songQueue: [],
    globalLibrary: "",          // which list is active: playlist name / "Liked" / "recently" / "album" etc.

    // --- Playback Mode Flags ---
    ShuffleFlag: 0,
    RepeatFlag: 1,              // default: repeat list
    RepeatOneFlag: -1,
    LastIndex: -1,              // last shuffled index to avoid repeats

    // --- AI / EQ ---
    aiCurrentSong: "",
    aiCurrentArtist: "",
    isAiMode: false,

    // --- API Base URL (loaded async on DOMContentLoaded) ---
    SAAVN_BASE_URL: "",

    // --- Drag state for volume/seekbar ---
    Draging: false,
    isDragging: false,

    // --- Interaction Tracking ---
    isSkipped: false,
    songStartTime: 0,
    lastSongId: null,
    lastSongStartTime: 0,

    // --- Navigation Back-Button Stack ---
    backButtonArray: [],

    // --- AI Recommendations ---
    loadingReco: false,
    shownSongIds: new Set(),

    // --- Search Page ---
    currentSearchQuery: "",
    currentArtistPage: 1,
    currentAlbumPage: 1,

    // --- Friends & Sharing ---
    _playlistToShare: null,
    _friendsCache: [],

    // --- Search History ---
    searchHistory: []
};
