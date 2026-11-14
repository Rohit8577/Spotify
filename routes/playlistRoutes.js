import { Router, HttpError, text } from '../utils/http.js';
import { songRecord, formatSong } from '../utils/songs.js';
import { fetchJson, saavnUrl } from '../utils/upstream.js';
import authMiddleware from '../middlewares/auth.js';
import User from '../models/User.js';

const router = Router();
const nameOf = (name) => text(name, 'Playlist name', 100);
const findPlaylist = (user, name) => {
  const playlist = user.library.find((item) => item.name === name);
  if (!playlist) throw new HttpError(404, 'Playlist not found');
  return playlist;
};

router.post('/playlistname', authMiddleware, async (req, res) => {
  const name = nameOf(req.body.name);
  const image = req.body.imageUrl || '';
  if (typeof image !== 'string' || image.length > 3000) throw new HttpError(400, 'Invalid image URL');
  const result = await User.updateOne({
    _id: req.user._id, 'library.name': { $ne: name }, 'library.99': { $exists: false },
  }, { $push: { library: { name, image, songs: [] } } });
  if (!result.modifiedCount) throw new HttpError(409, 'Playlist already exists or library limit reached');
  res.json({ msg: 'Playlist Created' });
});

router.get('/fetchplaylist', authMiddleware, (req, res) => res.json({ array: req.user.library }));
router.post('/import-playlist', authMiddleware, async (req, res) => {
  const id = text(String(req.body.playlistId ?? ''), 'Playlist ID');
  const result = await (req.app.locals.services.fetchJson || fetchJson)(saavnUrl('/playlist', { id }));
  const playlist = result.data || result;
  const name = nameOf(playlist.name || playlist.title);
  const songs = [...new Map((playlist.songs || []).slice(0, 1000).map((item) => formatSong(item))
    .filter((item) => item.id && item.url).map((item) => [item.id, songRecord(item)])).values()];
  if (!songs.length) throw new HttpError(422, 'This playlist has no playable songs');
  const cover = Array.isArray(playlist.image) ? playlist.image.at(-1)?.link || playlist.image.at(-1)?.url : playlist.image;
  const saved = await User.updateOne({ _id: req.user._id, 'library.name': { $ne: name }, 'library.99': { $exists: false } },
    { $push: { library: { name, image: cover || '', songs } } });
  if (!saved.modifiedCount) throw new HttpError(409, 'Playlist already exists or library limit reached');
  res.json({ msg: 'Playlist imported', name, total: songs.length });
});
router.post('/api/get-library', authMiddleware, (req, res) => res.json({ success: true, data: req.user.library }));
router.post('/librarySongs', authMiddleware, (req, res) => res.json({ arr: findPlaylist(req.user, nameOf(req.body.pname)).songs }));

router.post('/songinfo', authMiddleware, async (req, res) => {
  const name = nameOf(req.body.pname);
  findPlaylist(req.user, name);
  const song = songRecord({ ...req.body, image: req.body.url, url: req.body.songUrl });
  const result = await User.updateOne({ _id: req.user._id, library: { $elemMatch: {
    name, 'songs.songId': { $ne: song.songId }, 'songs.999': { $exists: false },
  } } }, { $push: { 'library.$.songs': song } });
  if (!result.modifiedCount) return res.status(409).json({ msg: 'Song already exists or playlist limit reached' });
  res.json({ msg: 'Song added to ' + name });
});

router.post('/tickSymbol', authMiddleware, (req, res) => {
  const playlist = findPlaylist(req.user, nameOf(req.body.pname));
  const id = text(String(req.body.url ?? ''), 'Song ID');
  res.json({ msg: playlist.songs.some((song) => song.songId === id) ? 'exists' : 'not exists' });
});

router.post('/deleteSong', authMiddleware, async (req, res) => {
  const name = nameOf(req.body.playlistName);
  findPlaylist(req.user, name);
  const songId = text(String(req.body.songId ?? ''), 'Song ID');
  await User.updateOne({ _id: req.user._id, 'library.name': name }, { $pull: { 'library.$.songs': { songId } } });
  res.json({ msg: 'Deleted Successfully' });
});

router.post('/deletePlaylist', authMiddleware, async (req, res) => {
  const name = nameOf(req.body.playlistName);
  const result = await User.updateOne({ _id: req.user._id, 'library.name': name }, { $pull: { library: { name } } });
  if (!result.modifiedCount) throw new HttpError(404, 'Playlist not found');
  res.json({ msg: 'Playlist Deleted' });
});

router.post('/renamePlaylist', authMiddleware, async (req, res) => {
  const oldName = nameOf(req.body.oldName);
  const newName = nameOf(req.body.newName);
  findPlaylist(req.user, oldName);
  if (oldName === newName) return res.json({ msg: 'Renamed successfully', updatedLibrary: req.user.library });
  const user = await User.findOneAndUpdate({
    _id: req.user._id, $and: [{ 'library.name': oldName }, { 'library.name': { $ne: newName } }],
  }, { $set: { 'library.$[playlist].name': newName } }, { arrayFilters: [{ 'playlist.name': oldName }], new: true, projection: { library: 1 } });
  if (!user) throw new HttpError(409, 'Playlist already exists');
  res.json({ msg: 'Renamed successfully', updatedLibrary: user.library });
});

router.post('/save', authMiddleware, async (req, res) => {
  const name = nameOf(req.body.pname);
  findPlaylist(req.user, name);
  if (!Array.isArray(req.body.songList) || req.body.songList.length > 1000) throw new HttpError(400, 'Provide up to 1000 songs');
  const songs = [...new Map(req.body.songList.map((item) => { const song = songRecord(item); return [song.songId, song]; })).values()];
  await User.updateOne({ _id: req.user._id, 'library.name': name }, { $set: { 'library.$.songs': songs } });
  res.json({ msg: 'Added' });
});
export default router;
