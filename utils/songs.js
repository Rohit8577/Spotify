import { HttpError, text } from './http.js';

export function songRecord(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError(400, 'Song is required');
  const songId = text(String(input.songId ?? input.id ?? ''), 'Song ID', 200);
  const songName = text(input.songName ?? input.name ?? input.title, 'Song name', 500);
  const songUrl = text(input.songUrl ?? input.url ?? input.audio_url, 'Song URL', 3000);
  if (!/^https?:\/\//i.test(songUrl) && !/^youtube:[\w-]{11}$/.test(songUrl)) throw new HttpError(400, 'Invalid song URL');
  const rawLength = input.len ?? input.time ?? input.duration ?? 0;
  const len = Number(rawLength);
  if (!Number.isFinite(len) || len < 0) throw new HttpError(400, 'Invalid song duration');
  const image = input.image ?? input.imageUrl ?? input.image_url ?? '';
  const artist = input.artist ?? input.artistName ?? '';
  if (typeof image !== 'string' || image.length > 3000 || typeof artist !== 'string' || artist.length > 500) throw new HttpError(400, 'Invalid song details');
  return { songId, songName, songUrl, image, artist, len };
}

export function moveRecentPipeline(song) {
  return [{ $set: { recently: { $slice: [{ $concatArrays: [
    { $literal: [song] },
    { $filter: { input: { $ifNull: ['$recently', []] }, as: 'song', cond: { $ne: ['$$song.songId', { $literal: song.songId }] } } },
  ] }, 20] } } }];
}

export const bestLink = (items, quality) => {
  if (typeof items === 'string') return items;
  if (!Array.isArray(items)) return '';
  const best = items.find((item) => item.quality === quality) || items.at(-1);
  return best?.link || best?.url || '';
};

export function formatSong(song, source = 'browse') {
  return {
    id: String(song.id ?? song.songId ?? ''), title: song.name || song.title || song.songName || '',
    artist: song.artist_map?.primary_artists?.map((a) => a.name).join(', ') || song.artist_map?.artists?.map((a) => a.name).join(', ') || song.primaryArtists || song.artist || song.subtitle || '',
    image: bestLink(song.image, '500x500') || song.image_url || '',
    url: bestLink(song.download_url || song.downloadUrl, '320kbps') || song.audio_url || song.songUrl || '',
    duration: Number(song.duration || song.len || 0), type: source, source,
  };
}
