import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Alert, Linking } from 'react-native';
import { musicApi } from '../api/musicApi';
import { normalizeSong, queueIndexAfter } from '../utils/song';
export { normalizeSong } from '../utils/song';

const PlayerContext = createContext(null);
export const PlayerProvider = ({ children }) => {
  const soundRef = useRef(null);
  const listenerRef = useRef(null);
  const requestRef = useRef(0);
  const finishRef = useRef(null);
  const loadingTimer = useRef(null);
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
  const latest = useRef({ currentSong, queue, queueIndex, isShuffle, repeatMode, volume, positionMillis, durationMillis });
  useLayoutEffect(() => {
    latest.current = { currentSong, queue, queueIndex, isShuffle, repeatMode, volume, positionMillis, durationMillis };
  }, [currentSong, queue, queueIndex, isShuffle, repeatMode, volume, positionMillis, durationMillis]);

  const release = () => {
    clearTimeout(loadingTimer.current);
    listenerRef.current?.remove();
    listenerRef.current = null;
    if (soundRef.current) {
      soundRef.current.pause();
      soundRef.current.remove();
      soundRef.current = null;
    }
  };
  const log = (song, type) => { if (song) musicApi.logInteraction({ type, source: song.source, song }); };

  const playSong = async (raw, newQueue = null, index = null, ended = false) => {
    const song = normalizeSong(raw);
    if (!song) return;
    const request = ++requestRef.current;
    if (song.source === 'youtube' || /(?:youtube\.com|youtu\.be)/.test(song.url)) {
      try { await Linking.openURL(song.url); } catch { Alert.alert('Playback unavailable', 'Could not open this video.'); }
      return;
    }
    if (!song.url) {
      try {
        const details = await musicApi.getSongDetails(song.id);
        if (request !== requestRef.current) return;
        const item = details?.data?.data?.songs?.[0] || details?.data?.songs?.[0];
        const resolved = normalizeSong(item);
        if (!resolved?.url) throw new Error('No audio available');
        return playSong(resolved, newQueue, index, ended);
      } catch { if (request === requestRef.current) Alert.alert('Playback unavailable', 'No audio is available for this song.'); return; }
    }
    const previous = latest.current;
    if (!ended && previous.currentSong && previous.positionMillis > 0) {
      const ratio = previous.positionMillis / (previous.durationMillis || Infinity);
      log(previous.currentSong, ratio >= 0.8 ? 'complete' : ratio < 0.2 ? 'skip' : 'play');
    }
    release();
    setCurrentSong(song); setIsLoadingSong(true); setIsPlaying(false);
    setPositionMillis(0); setDurationMillis(song.duration * 1000);
    let songs = newQueue?.map((item) => normalizeSong(item)).filter(Boolean) || previous.queue;
    let nextIndex = index ?? songs.findIndex((item) => item.id === song.id);
    if (nextIndex < 0 || songs[nextIndex]?.id !== song.id) {
      nextIndex = songs.findIndex((item) => item.id === song.id);
      if (nextIndex < 0) { songs = [song, ...songs]; nextIndex = 0; }
    }
    setQueue(songs); setQueueIndex(nextIndex);
    latest.current = { ...previous, currentSong: song, queue: songs, queueIndex: nextIndex };
    try {
      const sound = createAudioPlayer({ uri: song.url }, { updateInterval: 500 });
      soundRef.current = sound;
      sound.volume = previous.volume;
      let completed = false;
      listenerRef.current = sound.addListener('playbackStatusUpdate', (status) => {
        if (request !== requestRef.current) return;
        setIsPlaying(status.playing);
        setPositionMillis(status.currentTime * 1000 || 0);
        setDurationMillis(status.duration * 1000 || song.duration * 1000);
        if (status.isLoaded) { setIsLoadingSong(false); clearTimeout(loadingTimer.current); }
        if (status.didJustFinish && !completed) { completed = true; finishRef.current?.(); }
        else if (status.playing) completed = false;
      });
      loadingTimer.current = setTimeout(() => {
        if (request !== requestRef.current) return;
        release(); setIsLoadingSong(false); setIsPlaying(false);
        Alert.alert('Playback unavailable', 'The audio could not load. Please try again.');
      }, 20000);
      sound.setActiveForLockScreen(true, { title: song.title, artist: song.artist, artworkUrl: song.image });
      sound.play();
      musicApi.updateRecently({ songId: song.id, songUrl: song.url, image: song.image, songName: song.title, artist: song.artist, len: song.duration }).catch(() => {});
      log(song, 'play');
    } catch (error) {
      if (request !== requestRef.current) return;
      release(); setIsLoadingSong(false); setIsPlaying(false);
      Alert.alert('Playback unavailable', error.message || 'Could not load audio.');
    }
  };

  const playNext = async (ended = false) => {
    const current = latest.current;
    const next = queueIndexAfter(current.queueIndex, current.queue.length, current.isShuffle, current.repeatMode);
    if (next >= 0) return playSong(current.queue[next], current.queue, next, ended);
    if (!current.currentSong) return;
    const request = requestRef.current;
    try {
      const response = await musicApi.getSongRecommendations(current.currentSong.id);
      if (request !== requestRef.current) return;
      const data = response?.data?.data || response?.data;
      const recommendations = Array.isArray(data) ? data.map((item) => normalizeSong(item, 'reco')).filter((item) => item?.url && item.id !== current.currentSong.id) : [];
      if (recommendations.length) await playSong(recommendations[0], recommendations, 0, ended);
    } catch { /* End playback normally when recommendations are unavailable. */ }
  };

  const seekTo = async (millis) => {
    if (!Number.isFinite(millis)) return;
    try { await soundRef.current?.seekTo(Math.max(0, Math.min(millis, latest.current.durationMillis)) / 1000); } catch {}
  };

  const togglePlayPause = async () => {
    try {
      const sound = soundRef.current;
      if (!sound) { if (currentSong) await playSong(currentSong); return; }
      if (sound.playing) sound.pause();
      else { if (sound.duration && sound.currentTime >= sound.duration) await sound.seekTo(0); sound.play(); }
    } catch (error) { Alert.alert('Playback unavailable', error.message); }
  };

  const playPrevious = async () => {
    const current = latest.current;
    if (current.positionMillis > 3000) return seekTo(0);
    if (!current.queue.length) return;
    const index = Math.max(0, current.queueIndex - 1);
    return playSong(current.queue[index], current.queue, index);
  };

  const setVolume = (value) => {
    if (!Number.isFinite(value)) return;
    const level = Math.max(0, Math.min(1, value));
    setVolumeState(level); latest.current.volume = level;
    if (soundRef.current) soundRef.current.volume = level;
  };

  const updateEqSettings = (values, genre = 'Custom') => {
    if (!Array.isArray(values) || values.length !== 6 || values.some((value) => !Number.isFinite(value))) return;
    setEqValues(values.map((value) => Math.max(-12, Math.min(12, value)))); setEqGenre(genre);
  };

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' })
      .catch((error) => console.warn('Audio setup failed:', error.message));
    return () => { requestRef.current++; release(); };
  }, []);

  useLayoutEffect(() => { finishRef.current = async () => {
    const current = latest.current;
    log(current.currentSong, 'complete');
    if (current.repeatMode === 'one' && soundRef.current) {
      try { await soundRef.current.seekTo(0); soundRef.current?.play(); } catch {}
    } else await playNext(true);
  }; });

  return <PlayerContext.Provider value={{
    currentSong, isPlaying, isLoadingSong, positionMillis, durationMillis, queue, queueIndex, isShuffle, repeatMode, volume,
    eqValues, eqGenre, isFullPlayerVisible, isEqualizerVisible, isLyricsVisible,
    playSong, togglePlayPause, seekTo, seekRelative: (seconds) => seekTo(latest.current.positionMillis + seconds * 1000),
    playNext: () => playNext(false), playPrevious,
    toggleShuffle: () => setIsShuffle((value) => !value),
    toggleRepeat: () => setRepeatMode((value) => value === 'off' ? 'all' : value === 'all' ? 'one' : 'off'),
    setVolume, updateEqSettings, setIsFullPlayerVisible, setIsEqualizerVisible, setIsLyricsVisible,
  }}>{children}</PlayerContext.Provider>;
};
export const usePlayer = () => useContext(PlayerContext);
