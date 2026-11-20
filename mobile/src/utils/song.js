import { decodeMusicText, isYouTubeReference } from './youtube.js';

const bestLink = (items, quality) => {
  if (typeof items === 'string') return items;
  if (!Array.isArray(items)) return '';
  const best = items.find((item) => item?.quality === quality) || items.at(-1);
  return best?.link || best?.url || '';
};

export function normalizeSong(item, defaultSource = 'browse') {
  if (!item || typeof item !== 'object') return null;
  // Catalog url is often a web page; prefer actual download links for playback.
  const audio = bestLink(item.download_url || item.downloadUrl, '320kbps');
  const url = audio || item.songUrl || item.audio_url || item.url || '';
  const id = String(item.songId ?? item.id ?? url);
  if (!id) return null;
  const image = bestLink(item.image || item.imageUrl || item.image_url || item.songImg, '500x500');
  const artist = item.artist || item.artistName || item.primaryArtists ||
    (item.artist_map?.primary_artists || item.artist_map?.artists || item.artists?.primary || []).map((value) => value?.name).filter(Boolean).join(', ') || item.subtitle;
  const duration = Number(item.duration ?? item.len ?? 0);
  return { id, title: decodeMusicText(item.title || item.name || item.songName) || 'Unknown Title',
    artist: typeof artist === 'string' ? decodeMusicText(artist) : 'Various Artists',
    image: image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
    url, duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
    source: /^youtube_[A-Za-z0-9_-]{11}$/.test(id) || isYouTubeReference(url) ? 'youtube' : item.source || item.type || defaultSource };
}

export function queueIndexAfter(index, length, shuffle, repeat, random = Math.random) {
  if (!length) return -1;
  if (shuffle && length > 1) return (Math.max(0, index) + 1 + Math.floor(random() * (length - 1))) % length;
  if (index + 1 < length) return index + 1;
  return repeat === 'all' ? 0 : -1;
}
