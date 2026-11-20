import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { HttpError } from '../utils/http.js';

const runFile = promisify(execFile);
const bundledExtractor = fileURLToPath(new URL(`../.tools/${process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'}`, import.meta.url));
const videoPattern = /^[A-Za-z0-9_-]{11}$/;
const audioTypes = { m4a: 'audio/mp4', webm: 'audio/webm', mp3: 'audio/mpeg', opus: 'audio/ogg', ogg: 'audio/ogg' };

export function youtubeVideoId(value) {
  if (typeof value !== 'string') return null;
  const reference = value.replace(/^(?:youtube_|youtube:)/, '');
  if (videoPattern.test(reference)) return reference;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    let id;
    if (host === 'youtu.be') id = url.pathname.split('/')[1];
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
      id = url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
    }
    return videoPattern.test(id || '') ? id : null;
  } catch { return null; }
}

export function createAudioTicket(videoId, user, sessionDigest, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ videoId, userId: String(user._id), version: user.tokenVersion || 0,
    sessionDigest, expiresAt: now + 6 * 60 * 60 * 1000 })).toString('base64url');
  const signature = createHmac('sha256', process.env.JWT_SECRET).update('youtube-audio:' + payload).digest('hex');
  return payload + '.' + signature;
}

export function verifyAudioTicket(ticket, videoId, now = Date.now()) {
  if (typeof ticket !== 'string' || ticket.length > 1024 || !videoPattern.test(videoId)) throw new HttpError(401, 'Invalid audio ticket');
  const [payload, signature, extra] = ticket.split('.');
  if (extra || !payload || !/^[a-f0-9]{64}$/.test(signature || '')) throw new HttpError(401, 'Invalid audio ticket');
  const expected = createHmac('sha256', process.env.JWT_SECRET).update('youtube-audio:' + payload).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) throw new HttpError(401, 'Invalid audio ticket');
  let data;
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { throw new HttpError(401, 'Invalid audio ticket'); }
  if (data.videoId !== videoId || !/^[a-f0-9]{24}$/i.test(data.userId || '') || !/^[a-f0-9]{64}$/.test(data.sessionDigest || '') ||
      !Number.isSafeInteger(data.version) || !Number.isFinite(data.expiresAt) || data.expiresAt <= now) throw new HttpError(401, 'Audio ticket expired');
  return data;
}

function validateMediaUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') &&
        (url.hostname === 'googlevideo.com' || url.hostname.endsWith('.googlevideo.com'))) return url.toString();
  } catch {}
  throw new HttpError(502, 'YouTube did not provide a valid audio stream.');
}

// No video formats or downloaded media files are used. Cache only short-lived
// descriptors; stream bytes from the server IP that resolved the signed URL.
export function createYouTubeService({ run = runFile, fetchResponse = fetch, now = Date.now } = {}) {
  const cache = new Map();
  const pending = new Map();
  let active = 0;

  async function resolve(videoId, { refresh = false } = {}) {
    if (!videoPattern.test(videoId)) throw new HttpError(400, 'Invalid YouTube video ID');
    if (process.env.YOUTUBE_AUDIO_ENABLED === 'false') throw new HttpError(503, 'YouTube audio is unavailable on this server.');
    if (!refresh && cache.get(videoId)?.expiresAt > now()) return cache.get(videoId).audio;
    if (pending.has(videoId)) return pending.get(videoId);
    if (active >= 3) throw new HttpError(503, 'YouTube is busy. Please try again shortly.');
    const task = (async () => {
      active++;
      try {
        const command = process.env.YT_DLP_PATH || (existsSync(bundledExtractor) ? bundledExtractor : 'yt-dlp');
        const args = ['--ignore-config', '--no-cache-dir', '--no-playlist', '--skip-download', '--dump-single-json', '--no-warnings', '--check-formats',
          '--socket-timeout', '10', '--retries', '1', '--extractor-retries', '1', '--js-runtimes', `node:${process.execPath}`,
          '--remote-components', 'ejs:github', '-f', 'bestaudio[ext=m4a][protocol=https]/bestaudio[protocol=https]'];
        if (process.env.YOUTUBE_COOKIE_FILE) args.push('--cookies', process.env.YOUTUBE_COOKIE_FILE);
        args.push(`https://www.youtube.com/watch?v=${videoId}`);
        let output;
        try { output = await run(command, args, { timeout: 35000, maxBuffer: 8 * 1024 * 1024, windowsHide: true }); }
        catch (error) {
          if (['ENOENT', 'EACCES'].includes(error.code)) throw new HttpError(503, 'YouTube audio is unavailable on this server.');
          if (error.killed || error.code === 'ETIMEDOUT') throw new HttpError(504, 'YouTube took too long. Please try again.');
          throw new HttpError(422, 'This YouTube audio is unavailable. Try another song.');
        }
        let info;
        try { info = JSON.parse(output.stdout); } catch { throw new HttpError(502, 'YouTube could not load this audio.'); }
        const format = [info, ...(info.requested_downloads || []), ...(info.requested_formats || [])]
          .find((item) => item?.vcodec === 'none' && item.acodec && item.acodec !== 'none' && item.url && audioTypes[item.ext] &&
            (!item.protocol || item.protocol === 'https'));
        if (!format) throw new HttpError(422, 'No audio-only stream is available for this song.');
        const url = validateMediaUrl(format.url);
        const headers = {};
        for (const [key, value] of Object.entries(format.http_headers || info.http_headers || {})) {
          if (/^(user-agent|referer|origin|accept|accept-language)$/i.test(key) && typeof value === 'string' && value.length < 3000 && !/[\r\n]/.test(value)) headers[key] = value;
        }
        const duration = Number(info.duration);
        const audio = { url, headers, mimeType: audioTypes[format.ext], duration: Number.isFinite(duration) && duration > 0 ? duration : 0 };
        const expiry = Number(new URL(url).searchParams.get('expire')) * 1000;
        const expiresAt = Math.min(now() + 10 * 60 * 1000, expiry > 0 ? expiry - 60000 : Infinity);
        if (cache.size >= 128) cache.delete(cache.keys().next().value);
        cache.set(videoId, { audio, expiresAt });
        return audio;
      } finally { active--; }
    })();
    pending.set(videoId, task);
    try { return await task; } finally { pending.delete(videoId); }
  }

  async function open(videoId, { range, signal } = {}) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const audio = await resolve(videoId, { refresh: attempt > 0 });
      let url = audio.url;
      let response;
      for (let redirects = 0; redirects < 4; redirects++) {
        try {
          response = await fetchResponse(url, { headers: { ...audio.headers, 'Accept-Encoding': 'identity', ...(range ? { Range: range } : {}) }, signal, redirect: 'manual' });
        } catch (error) {
          if (signal?.aborted) throw error;
          throw new HttpError(502, 'YouTube could not load this audio. Please try again.');
        }
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location || redirects === 3) throw new HttpError(502, 'YouTube could not load this audio.');
        url = validateMediaUrl(new URL(location, url).toString());
      }
      if ([403, 410].includes(response.status) && attempt === 0) { await response.body?.cancel(); continue; }
      if (response.status === 416) return { response, mimeType: audio.mimeType };
      if (!response.ok || !response.body || /^(text\/|application\/json)/i.test(response.headers.get('content-type') || '')) {
        await response.body?.cancel();
        throw new HttpError(502, 'YouTube could not load this audio.');
      }
      return { response, mimeType: audio.mimeType };
    }
  }
  return { resolve, open };
}
