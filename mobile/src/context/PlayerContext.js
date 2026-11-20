import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createAudioPlaylist, setAudioModeAsync } from 'expo-audio';
import { AppState } from 'react-native';
import { Alert } from '../utils/alert';
import { musicApi } from '../api/musicApi';
import { normalizeSong } from '../utils/song';
import { audioSource, audioMetadata, isPlayable, preparePlaybackQueue, shuffledUpcoming } from '../utils/playbackQueue';
import { isYouTubeSong } from '../utils/youtube';
import { useArtworkTheme } from '../hooks/useArtworkTheme';
export { normalizeSong } from '../utils/song';

const PlayerContext = createContext(null);
const lockScreenOptions = { showNextTrack: true, showPreviousTrack: true, isLiveStream: false };

export const PlayerProvider = ({ children }) => {
  const native = useRef(null);
  const listeners = useRef([]);
  const request = useRef(0);
  const audioReady = useRef(null);
  const recommendationRequest = useRef(null);
  const canonicalQueue = useRef([]);
  const rebuilding = useRef(false);
  const pendingPlay = useRef(null);
  const state = useRef({ songs: [], index: -1, shuffle: false, repeat: 'off', volume: 1, failures: 0, failed: false, position: 0, duration: 0 });
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingSong, setIsLoadingSong] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [volume, setVolumeState] = useState(1);
  const [eqValues, setEqValues] = useState([0, 0, 0, 0, 0, 0]);
  const [eqGenre, setEqGenre] = useState('Flat');
  const [isFullPlayerVisible, setIsFullPlayerVisible] = useState(false);
  const [isEqualizerVisible, setIsEqualizerVisible] = useState(false);
  const [isLyricsVisible, setIsLyricsVisible] = useState(false);
  const artworkTheme = useArtworkTheme(currentSong?.image);
  const favorites = useRef({ ids: new Set(), busy: false, generation: 0 });
  const [likedSongIds, setLikedSongIds] = useState([]);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);

  useEffect(() => {
    const generation = ++favorites.current.generation;
    if (!currentSong) return;
    musicApi.getFavorites().then((result) => {
      if (generation !== favorites.current.generation || favorites.current.busy) return;
      const ids = (result?.arr || []).map((song) => String(song.songId));
      favorites.current.ids = new Set(ids); setLikedSongIds(ids);
    }).catch(() => {});
    return () => { favorites.current.generation++; };
  }, [currentSong?.id]);

  async function toggleCurrentSongFavorite() {
    if (!currentSong || favorites.current.busy) return;
    const song = currentSong;
    favorites.current.busy = true; favorites.current.generation++;
    setIsUpdatingFavorite(true);
    try {
      const result = await musicApi.toggleFavorite({ songId: song.id, url: song.url, image: song.image,
        name: song.title, artist: song.artist, len: song.duration });
      const liked = typeof result.liked === 'boolean' ? result.liked : result.msg === 'Added To Liked';
      if (liked) favorites.current.ids.add(song.id);
      else favorites.current.ids.delete(song.id);
      setLikedSongIds([...favorites.current.ids]);
    } catch { Alert.alert('Could not save song', 'Check your connection and try again.'); }
    finally { favorites.current.busy = false; setIsUpdatingFavorite(false); }
  }

  function log(song, type) {
    if (song) musicApi.logInteraction({ type, source: song.source, song }).catch(() => {});
  }
  function updateQueue(songs) { state.current.songs = songs; setQueue(songs); }
  function syncTrack(index) {
    const song = state.current.songs[index];
    if (!song) return;
    const changed = index !== state.current.index;
    if (changed) {
      const ratio = state.current.position / (state.current.duration || Infinity);
      log(state.current.songs[state.current.index], ratio >= 0.8 ? 'complete' : ratio < 0.2 ? 'skip' : 'play');
      state.current.position = 0; state.current.duration = 0;
    }
    state.current.index = index;
    setCurrentSong(song); setQueueIndex(index);
    if (changed) {
      setPositionMillis(0); setDurationMillis(song.duration * 1000);
      if (native.current) native.current.volume = state.current.volume;
      native.current?.updateLockScreenMetadata(audioMetadata(song));
      musicApi.updateRecently({ songId: song.id, songUrl: song.url, image: song.image, songName: song.title, artist: song.artist, len: song.duration }).catch(() => {});
      log(song, 'play');
    }
  }

  // Fill ahead; advancing between queued tracks never depends on a JS timer.
  async function fillRecommendations() {
    const player = native.current;
    const song = state.current.songs[player?.currentIndex];
    if (!player || !song || isYouTubeSong(song) || state.current.repeat !== 'off' || state.current.songs.length - player.currentIndex > 4) return;
    const key = `${request.current}:${song.id}`;
    if (recommendationRequest.current === key) return;
    recommendationRequest.current = key;
    const generation = request.current;
    try {
      const response = await musicApi.getSongRecommendations(song.id);
      if (generation !== request.current || player !== native.current) return;
      const data = response?.data?.data || response?.data;
      const seen = new Set(state.current.songs.map((item) => item.id));
      const extra = (Array.isArray(data) ? data : []).map((item) => normalizeSong(item, 'reco')).filter((item) => {
        if (!isPlayable(item) || seen.has(item.id)) return false;
        seen.add(item.id); return true;
      }).slice(0, 25);
      canonicalQueue.current = [...canonicalQueue.current, ...extra];
      updateQueue([...state.current.songs, ...extra]);
      extra.forEach((item) => player.add(audioSource(item)));
    } catch { recommendationRequest.current = null; }
  }

  function release() {
    listeners.current.forEach((listener) => listener.remove()); listeners.current = [];
    if (native.current) {
      native.current.pause(); native.current.clearLockScreenControls(); native.current.destroy(); native.current = null;
    }
  }
  function ensureAudio() {
    if (!audioReady.current) audioReady.current = setAudioModeAsync({
      playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMixPersistent',
    }).catch((error) => { audioReady.current = null; throw error; });
    return audioReady.current;
  }
  function ensurePlayer() {
    if (native.current) return native.current;
    const player = createAudioPlaylist({ updateInterval: 500 });
    native.current = player;
    listeners.current = [player.addListener('playlistStatusUpdate', (status) => {
      if (player !== native.current || rebuilding.current || status.currentIndex !== player.currentIndex) return;
      syncTrack(status.currentIndex);
      const song = state.current.songs[status.currentIndex];
      if (song && !song.duration && Number.isFinite(status.duration) && status.duration > 0) {
        const updated = { ...song, duration: status.duration };
        updateQueue(state.current.songs.map((item, index) => index === status.currentIndex ? updated : item));
        canonicalQueue.current = canonicalQueue.current.map((item) => item.id === updated.id ? updated : item);
        setCurrentSong(updated);
      }
      state.current.position = status.currentTime; state.current.duration = status.duration;
      setIsPlaying(status.playing); setIsLoadingSong(Boolean(pendingPlay.current) || status.isBuffering);
      setPositionMillis(Math.max(0, status.currentTime * 1000 || 0));
      setDurationMillis(status.duration * 1000 || state.current.songs[status.currentIndex]?.duration * 1000 || 0);
      const error = /** @type {any} */ (status).error;
      if (error) {
        state.current.failures++;
        if (state.current.failures < 3 && status.currentIndex + 1 < state.current.songs.length) {
          player.next(); player.play();
        } else {
          state.current.failed = true;
          player.pause(); setIsLoadingSong(false);
          if (AppState.currentState === 'active') Alert.alert('Playback unavailable', 'Check your connection, then tap play to retry.');
        }
      } else if (status.playing && status.currentTime > 1) state.current.failures = 0;
    }), player.addListener('trackChanged', ({ currentIndex }) => {
      if (rebuilding.current || currentIndex !== player.currentIndex) return;
      syncTrack(currentIndex); void fillRecommendations();
    })];
    return player;
  }

  async function playSong(raw, newQueue = null, _index = null) {
    let song = normalizeSong(raw);
    if (!song) return;
    const generation = ++request.current;
    pendingPlay.current = generation;
    setIsLoadingSong(true);
    try {
      if (!isYouTubeSong(song) && !isPlayable(song)) {
        const details = await musicApi.getSongDetails(song.id);
        song = normalizeSong(details?.data?.data?.songs?.[0] || details?.data?.songs?.[0]);
        if (!isPlayable(song)) throw new Error('No audio is available for this song.');
      }
      const prepared = await preparePlaybackQueue(newQueue || state.current.songs, song, musicApi.prepareYouTubeAudio);
      song = prepared.songs[prepared.index];
      if (generation !== request.current) return;
      await ensureAudio();
      if (generation !== request.current) return;
      const player = ensurePlayer();
      canonicalQueue.current = prepared.songs;
      const songs = state.current.shuffle ? shuffledUpcoming(prepared.songs, prepared.index) : prepared.songs;
      // Keep one service/player alive across every song in the queue.
      rebuilding.current = true;
      player.pause(); player.clear(); state.current.index = -1; state.current.failures = 0; state.current.failed = false;
      updateQueue(songs);
      songs.forEach((item) => player.add(audioSource(item)));
      player.skipTo(prepared.index);
      player.volume = state.current.volume;
      player.loop = state.current.repeat === 'one' ? 'single' : state.current.repeat === 'all' ? 'all' : 'none';
      rebuilding.current = false;
      pendingPlay.current = null;
      syncTrack(prepared.index);
      player.setActiveForLockScreen(true, audioMetadata(song), lockScreenOptions);
      setIsLoadingSong(true); player.play();
      void fillRecommendations();
    } catch (error) {
      rebuilding.current = false;
      if (generation !== request.current) return;
      pendingPlay.current = null;
      setIsLoadingSong(false);
      Alert.alert('Playback unavailable', error.response?.data?.message || error.message || 'Could not load audio.');
    }
  }
  async function seekTo(millis) {
    const player = native.current;
    if (!player || !Number.isFinite(millis)) return;
    try { await player.seekTo(Math.max(0, Math.min(millis / 1000, player.duration || Infinity))); } catch {}
  }
  async function togglePlayPause() {
    const player = native.current;
    if (!player) return;
    if (state.current.failed) {
      const song = state.current.songs[player.currentIndex];
      release();
      return playSong(song, state.current.songs);
    }
    if (player.playing) player.pause();
    else {
      await ensureAudio();
      if (player.duration && player.currentTime >= player.duration) await player.seekTo(0);
      player.play();
      void fillRecommendations();
    }
  }
  async function playNext() {
    const player = native.current;
    const generation = request.current;
    if (!player) return;
    if (player.currentIndex + 1 >= player.trackCount && state.current.repeat !== 'all') await fillRecommendations();
    if (player !== native.current || generation !== request.current) return;
    if (player.currentIndex + 1 < player.trackCount || state.current.repeat === 'all') { player.next(); player.play(); }
    void fillRecommendations();
  }
  function playPrevious() {
    const player = native.current;
    if (!player) return;
    if (player.currentTime > 3 || player.currentIndex === 0) void player.seekTo(0);
    else player.previous();
  }
  function setVolume(value) {
    if (!Number.isFinite(value)) return;
    const level = Math.max(0, Math.min(1, value));
    state.current.volume = level; setVolumeState(level);
    if (native.current) native.current.volume = level;
  }
  function toggleRepeat() {
    const mode = state.current.repeat === 'off' ? 'all' : state.current.repeat === 'all' ? 'one' : 'off';
    state.current.repeat = mode; setRepeatMode(mode);
    if (native.current) native.current.loop = mode === 'one' ? 'single' : mode === 'all' ? 'all' : 'none';
  }
  function toggleShuffle() {
    const value = !state.current.shuffle;
    state.current.shuffle = value; setIsShuffle(value);
    const player = native.current;
    if (!player) return;
    const index = player.currentIndex;
    const songs = state.current.songs;
    const played = new Set(songs.slice(0, index + 1).map((song) => song.id));
    const reordered = value ? shuffledUpcoming(songs, index) : [...songs.slice(0, index + 1), ...canonicalQueue.current.filter((song) => !played.has(song.id))];
    for (let i = songs.length - 1; i > index; i--) player.remove(i);
    updateQueue(reordered);
    reordered.slice(index + 1).forEach((song) => player.add(audioSource(song)));
  }
  function updateEqSettings(values, genre = 'Custom') {
    if (!Array.isArray(values) || values.length !== 6 || values.some((value) => !Number.isFinite(value))) return;
    setEqValues(values.map((value) => Math.max(-12, Math.min(12, value)))); setEqGenre(genre);
  }
  useEffect(() => () => { request.current++; release(); }, []);

  return <PlayerContext.Provider value={{
    currentSong, isPlaying, isLoadingSong, positionMillis, durationMillis, queue, queueIndex, isShuffle, repeatMode, volume, artworkTheme,
    isCurrentSongLiked: likedSongIds.includes(currentSong?.id), isUpdatingFavorite, toggleCurrentSongFavorite,
    eqValues, eqGenre, isFullPlayerVisible, isEqualizerVisible, isLyricsVisible,
    playSong, togglePlayPause, seekTo, seekRelative: (seconds) => seekTo((native.current?.currentTime || 0) * 1000 + seconds * 1000),
    playNext, playPrevious, toggleShuffle, toggleRepeat, setVolume, updateEqSettings,
    setIsFullPlayerVisible, setIsEqualizerVisible, setIsLyricsVisible,
    isPlaybackActive: () => Boolean(native.current?.playing || native.current?.isBuffering),
  }}>{children}</PlayerContext.Provider>;
};
export const usePlayer = () => useContext(PlayerContext);
