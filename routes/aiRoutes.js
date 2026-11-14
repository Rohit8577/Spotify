import { GoogleGenerativeAI } from '@google/generative-ai';
import { Router, HttpError, text, rateLimit } from '../utils/http.js';
import { fetchJson, saavnUrl, mapLimit } from '../utils/upstream.js';
import { formatSong } from '../utils/songs.js';
import authMiddleware from '../middlewares/auth.js';
import Interaction from '../models/Interactions.js';

const router = Router();
router.use(['/smart-playlist', '/get-smart-playlist', '/get-ai-eq', '/api/ask-ai'], rateLimit({ limit: 10 }));

async function generate(req, prompt) {
  if (req.app.locals.services.generateText) return req.app.locals.services.generateText(prompt);
  if (!process.env.googleApi) throw new HttpError(503, 'AI service is not configured');
  const model = new GoogleGenerativeAI(process.env.googleApi).getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(prompt, { timeout: 20000 });
  return result.response.text();
}
const jsonText = (value) => JSON.parse(value.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/\x60\x60\x60(?:json)?/gi, '').trim());
const requestJson = (req, url, options, timeout) => (req.app.locals.services.fetchJson || fetchJson)(url, options, timeout);
const uniquePlayable = (songs, excluded = new Set()) => {
  const found = new Set();
  return songs.filter((song) => {
    if (!song?.id || !song.url || excluded.has(song.id) || found.has(song.id)) return false;
    found.add(song.id);
    return true;
  });
};

async function searchTracks(req, keywords) {
  return mapLimit(keywords, 4, async (keyword) => {
    try {
      const data = await requestJson(req, saavnUrl('/search/songs', { q: keyword }));
      const match = data?.data?.results?.[0];
      return match ? formatSong(match, 'ai') : null;
    } catch { return null; }
  });
}

router.get(['/smart-playlist', '/get-smart-playlist'], async (req, res) => {
  const vibe = text(req.query.vibe, 'Vibe', 500);
  const maximum = req.path === '/get-smart-playlist' ? 30 : 20;
  const response = await generate(req, 'You are an expert music curator. Suggest ' + maximum +
    ' real songs for this mood: ' + JSON.stringify(vibe) +
    '. Respect requested genre and language. Return ONLY a comma-separated list of Song Name - Artist. No duplicates, numbering or introduction.');
  const keywords = [...new Set(response.split(',').map((item) => item.trim()).filter(Boolean))].slice(0, maximum);
  const songs = uniquePlayable(await searchTracks(req, keywords));
  res.json({ success: true, vibe, songs: songs.map((song) => ({ ...song, image_url: song.image, audio_url: song.url })) });
});

router.get('/get-ai-eq', async (req, res) => {
  const song = text(req.query.song, 'Song', 500);
  const artist = req.query.artist === undefined ? '' : text(req.query.artist, 'Artist', 500);
  try {
    const data = jsonText(await generate(req, 'Suggest a 6-band equalizer for ' + JSON.stringify({ song, artist }) +
      '. Frequencies: 60,170,350,1000,3000,10000 Hz. Return ONLY JSON: {"genre":"short description","values":[six numbers between -12 and 12]}.'));
    if (!Array.isArray(data.values) || data.values.length !== 6 || data.values.some((value) => !Number.isFinite(value))) throw new Error('Invalid EQ');
    res.json({ success: true, genre: typeof data.genre === 'string' ? data.genre.slice(0, 100) : 'Custom',
      values: data.values.map((value) => Math.max(-12, Math.min(12, value))), message: 'Tuned for ' + song });
  } catch {
    res.json({ success: false, genre: 'Flat Profile', values: [0, 0, 0, 0, 0, 0], message: 'AI unavailable. Using flat settings.' });
  }
});

router.post('/api/ask-ai', async (req, res) => {
  const prompt = text(req.body.prompt, 'Prompt', 4000);
  const data = await requestJson(req, (process.env.OLLAMA_URL || 'http://127.0.0.1:11434') + '/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.OLLAMA_MODEL || 'qwen3.5:4b', prompt, stream: false, options: { num_ctx: 2048, num_predict: 600 } }),
  }, 30000);
  if (typeof data.response !== 'string') throw new HttpError(502, 'Invalid AI response');
  res.json({ success: true, answer: data.response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim() });
});

// Cache per app and user: concurrent refreshes share one expensive generation.
const caches = new WeakMap();
router.get('/recommendations', authMiddleware, async (req, res) => {
  let cache = caches.get(req.app);
  if (!cache) { cache = new Map(); caches.set(req.app, cache); }
  const key = String(req.user._id);
  const now = Date.now();
  for (const [id, entry] of cache) if (entry.expires < now) cache.delete(id);
  let entry = cache.get(key);
  if (!entry) {
    if (cache.size >= 200) cache.delete(cache.keys().next().value);
    entry = { expires: now + 60000, promise: recommendations(req) };
    cache.set(key, entry);
  }
  try { res.json(await entry.promise); }
  catch (error) { cache.delete(key); throw error; }
});

async function recommendations(req) {
  const interactions = await Interaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
  const scores = new Map();
  const skipped = new Set();
  for (const interaction of interactions) {
    if (!interaction.song?.artistName) continue;
    if (interaction.type === 'skip') { skipped.add(interaction.song.songId); continue; }
    const weight = { complete: 4, play: 2, like: 5 }[interaction.type] || 0;
    const decay = Math.exp(-0.05 * Math.max(0, (Date.now() - interaction.createdAt) / 86400000));
    const artist = interaction.song.artistName;
    scores.set(artist, (scores.get(artist) || 0) + weight * decay);
  }
  const artists = [...scores].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name]) => name);
  let keywords = [];
  let aiVibe = 'Fresh mix based on trending hits';
  if (artists.length) {
    try {
      const data = await requestJson(req, (process.env.OLLAMA_URL || 'http://127.0.0.1:11434') + '/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || 'qwen3.5:4b', stream: false, format: 'json',
          prompt: 'Recommend 15 real songs for fans of ' + JSON.stringify(artists) +
            '. Mix favorites and discovery. Return JSON {"vibeCheck":"short description","tracks":[{"title":"song","artist":"artist"}]}.',
          options: { num_ctx: 2048, num_predict: 1200, temperature: 0.5 },
        }),
      }, 10000);
      const parsed = jsonText(data.response);
      if (Array.isArray(parsed.tracks)) keywords = parsed.tracks
        .filter((track) => typeof track?.title === 'string' && typeof track.artist === 'string')
        .slice(0, 15).map((track) => (track.title + ' ' + track.artist).slice(0, 300));
      if (typeof parsed.vibeCheck === 'string') aiVibe = parsed.vibeCheck.slice(0, 300);
    } catch { /* Music discovery remains available when the local model is offline. */ }
  }
  if (!keywords.length) keywords = artists.slice(0, 4);
  const [matches, trending] = await Promise.all([
    searchTracks(req, [...new Set(keywords)]),
    requestJson(req, saavnUrl('/get/trending')).catch(() => ({ data: [] })),
  ]);
  const trends = Array.isArray(trending.data) ? trending.data.filter((song) => ['song', 'track'].includes(song.type)).map((song) => formatSong(song, 'trending')) : [];
  const songs = uniquePlayable([...matches, ...trends], skipped).slice(0, 30);
  return { success: true, aiVibe, total: songs.length, songs };
}
export default router;
