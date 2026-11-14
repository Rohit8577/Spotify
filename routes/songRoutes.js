import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Router, HttpError, text } from '../utils/http.js';
import { fetchJson, saavnUrl } from '../utils/upstream.js';
import { songRecord, moveRecentPipeline } from '../utils/songs.js';
import authMiddleware from '../middlewares/auth.js';
import User from '../models/User.js';

const router = Router();
const searchTypes = {
  song: ['/search/songs', 'q'], songID: ['/song', 'id'],
  artist: ['/search/artists', 'q'], artistID: ['/artist', 'id'],
  album: ['/search/albums', 'q'], albumID: ['/album', 'id'],
  playlist: ['/search/playlists', 'q'], playlistID: ['/playlist', 'id'],
  home: ['/modules'], recomended: ['/song/recommend', 'id'], lyrics: ['/get/lyrics', 'id'],
};

router.post('/playlistData', async (req, res) => {
  const id = text(String(req.body.playlistId ?? ''), 'Playlist ID');
  const result = await (req.app.locals.services.fetchJson || fetchJson)(saavnUrl('/playlist', { id }));
  const playlist = result.data || result;
  res.json({ playlistSongs: Array.isArray(playlist.songs) ? playlist.songs : [] });
});

router.get('/search', async (req, res) => {
  const type = text(req.query.type, 'Search type', 30);
  const query = type === 'home' ? '' : text(req.query.query, 'Query', 300);
  let url;
  if (Object.hasOwn(searchTypes, type)) {
    const [path, key] = searchTypes[type];
    url = saavnUrl(path, key ? { [key]: query } : {});
  } else if (type === 'youtube' || type === 'youtube_related') {
    if (!process.env.YOUTUBE_API_KEY) throw new HttpError(503, 'YouTube search is not configured');
    // relatedToVideoId has been removed from the YouTube search API.
    const params = new URLSearchParams({ part: 'snippet', q: query, type: 'video', key: process.env.YOUTUBE_API_KEY, maxResults: '10' });
    url = 'https://www.googleapis.com/youtube/v3/search?' + params;
  } else throw new HttpError(400, 'Invalid search type');
  const result = await (req.app.locals.services.fetchJson || fetchJson)(url);
  res.json({ type, data: result });
});

router.get('/get-songs', async (req, res) => {
  try {
    const files = await readdir(fileURLToPath(new URL('../public/songs/', import.meta.url)));
    res.json(files.filter((file) => /\.(mp3|m4a|ogg|wav|flac)$/i.test(file)));
  } catch (error) {
    if (error.code === 'ENOENT') return res.json([]);
    throw error;
  }
});
router.get('/get-favorite', authMiddleware, (req, res) => res.json({ arr: req.user.favorite }));
router.post('/favorite', authMiddleware, async (req, res) => {
  const song = songRecord(req.body);
  const user = await User.findOneAndUpdate({ _id: req.user._id }, [{ $set: { favorite: {
    $cond: [
      { $in: [{ $literal: song.songId }, { $ifNull: ['$favorite.songId', []] }] },
      { $filter: { input: '$favorite', as: 'song', cond: { $ne: ['$$song.songId', { $literal: song.songId }] } } },
      { $concatArrays: [{ $ifNull: ['$favorite', []] }, { $literal: [song] }] },
    ],
  } } }], { new: true, projection: { favorite: 1 } });
  const added = user.favorite.some((item) => item.songId === song.songId);
  res.status(added ? 200 : 201).json({ msg: added ? 'Added To Liked' : 'Remove From Liked', liked: added });
});

router.post(['/updateRecently', '/api/update-recently-email'], authMiddleware, async (req, res) => {
  const song = songRecord(req.body);
  await User.updateOne({ _id: req.user._id }, moveRecentPipeline(song));
  res.json({ success: true, msg: 'Recently Updated' });
});
router.get('/updateRecently', authMiddleware, (req, res) => res.json({ arr: req.user.recently }));
export default router;
