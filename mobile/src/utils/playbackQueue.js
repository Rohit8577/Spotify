import { normalizeSong } from './song.js';
import { isYouTubeSong, isYouTubeReference, isYouTubeAudioUrl, youtubeVideoId } from './youtube.js';

export const isPlayable = (song) => typeof song?.url === 'string' && /^(?:https?:\/\/|file:\/\/|content:\/\/)/i.test(song.url) && !isYouTubeReference(song.url) &&
  (!isYouTubeSong(song) || isYouTubeAudioUrl(song.url)) && !/^https?:\/\/(?:www\.)?(?:jio)?saavn\.com\//i.test(song.url);
export const audioSource = (song) => ({ uri: song.url, name: song.title });
export const audioMetadata = (song) => ({ title: song.title, artist: song.artist, artworkUrl: song.image, albumTitle: 'SangeetX' });

// Preserve the current native media item and position when shuffling.
export function shuffledUpcoming(songs, index, random = Math.random) {
  const remaining = songs.slice(index + 1);
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  return [...songs.slice(0, index + 1), ...remaining];
}

export function playableQueue(raw, selected) {
  const songs = [...new Map((raw || []).map((item) => normalizeSong(item)).filter(isPlayable).map((song) => [song.id, song])).values()];
  if (!isPlayable(selected)) return { songs, index: -1 };
  const index = songs.findIndex((song) => song.id === selected.id);
  if (index < 0) return { songs: [selected, ...songs], index: 0 };
  songs[index] = selected;
  return { songs, index };
}

export async function preparePlaybackQueue(raw, selected, prepareYouTubeAudio) {
  let songs = (raw || []).map((item) => normalizeSong(item)).filter(Boolean);
  if (!songs.some((song) => song.id === selected.id)) songs.unshift(selected);
  const videoIds = [...new Set(songs.filter(isYouTubeSong).map((song) => youtubeVideoId(song.id) || youtubeVideoId(song.url)).filter(Boolean))].slice(0, 100);
  if (videoIds.length) {
    const selectedId = isYouTubeSong(selected) ? youtubeVideoId(selected.id) || youtubeVideoId(selected.url) : undefined;
    try {
      const sources = await prepareYouTubeAudio({ videoIds, selectedVideoId: selectedId });
      const resolved = new Map(sources.map((source) => [source.id, source]));
      const prepare = (song) => {
        const source = resolved.get(song.id);
        return source ? { ...song, url: source.url, duration: source.duration || song.duration } : song;
      };
      songs = songs.map(prepare);
      selected = prepare(selected);
    } catch (error) { if (selectedId) throw error; }
  }
  if (!isPlayable(selected)) throw new Error('No audio is available for this song.');
  return playableQueue(songs, selected);
}
