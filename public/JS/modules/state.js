// ============================================================
// Centralized Application State
// All global variables from the monolith live here now.
// ============================================================

const state = {
  // --- Player State ---
  currentSong: null,
  globalSongName: "",
  globalSongId: "",
  globalArtist: "",
  globalAlbumId: "",
  globalLibrary: "",
  songQueue: [],
  songStartTime: 0,
  lastSongId: null,
  lastSongStartTime: 0,
  isSkipped: false,

  // --- Playback Flags ---
  ShuffleFlag: 0,
  RepeatFlag: 1,
  RepeatOneFlag: -1,
  LastIndex: -1,

  // --- Drag Flags ---
  Draging: false,
  isDragging: false,

  // --- Navigation ---
  navigationStack: [],
  shufflePname: "",

  // --- AI ---
  aiCurrentSong: "",
  aiCurrentArtist: "",
  isAiMode: false,

  // --- Audio Context (Equalizer) ---
  audioCtx: null,
  source: null,
  filters: [],

  // --- Misc ---
  SAAVN_BASE_URL: "",
  ytPlayer: undefined,
  updateInterval: undefined,
  timer: undefined,

  // --- Search Pagination ---
  currentSearchQuery: "",
  currentArtistPage: 1,
  currentAlbumPage: 1,
  RESULTS_PER_PAGE: 10,

  // --- Social ---
  _playlistToShare: null,
  _friendsCache: [],

  // --- Recommendations ---
  loadingReco: false,
  shownSongIds: new Set(),

  // --- Search History ---
  searchHistory: JSON.parse(localStorage.getItem("searchHistory")) || [],

  // --- Recent Activity (rich history with images/types) ---
  recentActivity: JSON.parse(localStorage.getItem("recentActivity")) || [],
};

export default state;
