const videoPattern = /^[A-Za-z0-9_-]{11}$/;
const youtubeHosts = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'];

export function youtubeVideoId(value) {
  if (typeof value !== 'string') return null;
  const id = value.replace(/^(?:youtube_|youtube:)/, '');
  if (videoPattern.test(id)) return id;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !youtubeHosts.includes(url.hostname)) return null;
    const candidate = url.hostname === 'youtu.be' ? url.pathname.split('/')[1] :
      url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
    return videoPattern.test(candidate || '') ? candidate : null;
  } catch { return null; }
}

export function isYouTubeReference(value) {
  if (typeof value !== 'string') return false;
  if (/^(?:youtube:|youtube_)/.test(value)) return true;
  try { return youtubeHosts.includes(new URL(value).hostname); } catch { return false; }
}

export const isYouTubeSong = (song) => song?.source === 'youtube' || /^youtube_[A-Za-z0-9_-]{11}$/.test(song?.id || '') || isYouTubeReference(song?.url);
export function isYouTubeAudioUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && /^\/youtube\/audio\/[A-Za-z0-9_-]{11}$/.test(url.pathname);
  } catch { return false; }
}
export const youtubePageUrl = (song) => {
  const id = youtubeVideoId(song?.id) || youtubeVideoId(song?.url);
  return id && isYouTubeSong(song) ? `https://www.youtube.com/watch?v=${id}` : song?.url || '';
};

export function decodeMusicText(value) {
  if (typeof value !== 'string') return '';
  const entities = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (original, entity) => {
    if (entity[0] !== '#') return entities[entity.toLowerCase()] || original;
    const code = entity[1]?.toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : original;
  });
}

export function normalizeYouTubeSong(item) {
  if (!item || typeof item !== 'object') return null;
  const id = youtubeVideoId(typeof item.id === 'object' ? item.id?.videoId : item.id) || youtubeVideoId(item.url);
  if (!id) return null;
  const snippet = item.snippet || {};
  const length = item.contentDetails?.duration?.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  const duration = length ? Number(length[1] || 0) * 3600 + Number(length[2] || 0) * 60 + Number(length[3] || 0) : Number(item.duration || 0);
  return { id: `youtube_${id}`, title: decodeMusicText(snippet.title || item.title || 'YouTube Audio'),
    artist: decodeMusicText(snippet.channelTitle || item.artist || 'YouTube'),
    image: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || item.image,
    url: `youtube:${id}`, source: 'youtube', duration: Number.isFinite(duration) && duration > 0 ? duration : 0 };
}
