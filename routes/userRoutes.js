import mongoose from 'mongoose';
import { Router, HttpError, text, passwordValue, rateLimit } from '../utils/http.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { sendSession } from '../utils/tokens.js';
import authMiddleware from '../middlewares/auth.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Interaction from '../models/Interactions.js';
import { findPerson, isFriend, requireFriend } from '../utils/friends.js';

const router = Router();
router.get('/userprofile', authMiddleware, (req, res) => {
  const user = req.user;
  res.json({ id: user._id, email: user.email, name: user.name, lib: user.library, artist: user.artist });
});
const passwordAttempts = rateLimit({ limit: 10, keyOf: (req) => String(req.user._id) });
router.post('/profile', authMiddleware, (req, res, next) => req.body.newPassword ? passwordAttempts(req, res, next) : next(), async (req, res) => {
  const name = text(req.body.name, 'Name', 100);
  const changes = { name };
  let versionChange = {};
  const filter = { _id: req.user._id };
  if (req.user.tokenVersion) filter.tokenVersion = req.user.tokenVersion;
  else filter.$or = [{ tokenVersion: 0 }, { tokenVersion: { $exists: false } }];
  if (req.body.newPassword) {
    passwordValue(req.body.newPassword);
    text(req.body.currentPassword, 'Current password', 256);
    const credentials = await User.findById(req.user._id).select('password');
    if (!await verifyPassword(req.body.currentPassword, credentials.password)) throw new HttpError(401, 'Current password is incorrect');
    changes.password = await hashPassword(passwordValue(req.body.newPassword));
    versionChange = { $inc: { tokenVersion: 1 } };
    filter.password = credentials.password;
  }
  const user = await User.findOneAndUpdate(filter, { $set: changes, ...versionChange }, { new: true });
  if (!user) throw new HttpError(409, 'Credentials changed. Sign in again before updating your password.');
  sendSession(res, user, 200, 'Profile updated');
});
router.post('/addArtist', authMiddleware, async (req, res) => {
  const id = Number(req.body.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError(400, 'Invalid artist ID');
  await User.updateOne({ _id: req.user._id }, [{ $set: { artist: { $slice: [{ $concatArrays: [
    [{ id }], { $filter: { input: { $ifNull: ['$artist', []] }, as: 'artist', cond: { $ne: ['$$artist.id', id] } } },
  ] }, 200] } } }]);
  res.json({ msg: 'Artist Moved to Top' });
});

async function searchFriends(req, res) {
  const raw = req.body?.friendId ?? req.query.username;
  if (raw === '') return res.json([]);
  const query = text(raw, 'Search', 100);
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const users = await User.find({ _id: { $ne: req.user._id }, $or: [{ email: regex }, { name: regex }] }).select('_id name email').limit(10).lean();
  res.json(users.map((user) => ({ ...user, id: String(user._id), username: user.email,
    status: isFriend(req.user, user) ? 'Friends' : req.user.friendRequestsend.some((request) => request.email === user.email) ? 'Pending' : 'Send Request' })));
}
router.post('/searchFriend', authMiddleware, searchFriends);
router.get('/friends/search', authMiddleware, searchFriends);

router.post(['/sendFriendRequest', '/friends/send-request'], authMiddleware, async (req, res) => {
  const friend = await findPerson(req.body.friendId || req.body.to);
  if (!friend) throw new HttpError(404, 'User not found');
  if (String(friend._id) === String(req.user._id)) throw new HttpError(400, 'You cannot add yourself');
  if (isFriend(req.user, friend)) throw new HttpError(409, 'Already friends');
  await User.updateOne({ _id: req.user._id, 'friendRequestsend.email': { $ne: friend.email } }, { $push: { friendRequestsend: { email: friend.email, currStatus: 0 } } });
  await User.updateOne({ _id: friend._id, 'friendRequestreceive.email': { $ne: req.user.email } }, { $push: { friendRequestreceive: { email: req.user.email, currStatus: 0 } } });
  res.json({ msg: 'Request sent successfully', message: 'Request sent successfully' });
});

router.get('/friends/requests', authMiddleware, (req, res) => res.json(req.user.friendRequestreceive));
router.post('/friends/respond', authMiddleware, async (req, res) => {
  const friend = await findPerson(req.body.friendId);
  if (!friend || !req.user.friendRequestreceive.some((request) => request.email === friend.email)) throw new HttpError(404, 'Request not found');
  if (typeof req.body.accept !== 'boolean') throw new HttpError(400, 'Choose accept or reject');
  if (req.body.accept) {
    await User.updateOne({ _id: req.user._id, 'friends.id': { $ne: String(friend._id) } }, { $push: { friends: { id: String(friend._id), email: friend.email, name: friend.name } } });
    await User.updateOne({ _id: friend._id, 'friends.id': { $ne: String(req.user._id) } }, { $push: { friends: { id: String(req.user._id), email: req.user.email, name: req.user.name } } });
  }
  await User.updateOne({ _id: req.user._id }, { $pull: { friendRequestreceive: { email: friend.email }, friendRequestsend: { email: friend.email } } });
  await User.updateOne({ _id: friend._id }, { $pull: { friendRequestsend: { email: req.user.email }, friendRequestreceive: { email: req.user.email } } });
  res.json({ success: true });
});

async function friendsOf(user) {
  const ids = user.friends.map((friend) => friend.id).filter((id) => mongoose.isObjectIdOrHexString(id));
  const emails = user.friends.map((friend) => friend.email || friend.id);
  return User.find({ $or: [{ _id: { $in: ids } }, { email: { $in: emails } }] }).select('_id name email').lean();
}
router.get('/friends/list', authMiddleware, async (req, res) => {
  const friends = await friendsOf(req.user);
  res.json(friends.map((friend) => ({ id: String(friend._id), email: friend.email, name: friend.name })));
});
router.get('/friends/activity', authMiddleware, async (req, res) => {
  const friends = await friendsOf(req.user);
  const latest = await Interaction.aggregate([
    { $match: { user: { $in: friends.map((friend) => friend._id) } } },
    { $sort: { createdAt: -1, _id: -1 } },
    { $group: { _id: '$user', song: { $first: '$song' }, createdAt: { $first: '$createdAt' } } },
  ]);
  const activity = new Map(latest.map((item) => [String(item._id), item]));
  res.json(friends.map((friend) => {
    const recent = activity.get(String(friend._id));
    return { id: String(friend._id), email: friend.email, name: friend.name,
      status: recent?.song?.songName && Date.now() - recent.createdAt < 600000 ? 'Listening to ' + recent.song.songName : 'Offline' };
  }));
});

router.post('/log-interaction', authMiddleware, async (req, res) => {
  const { type, song } = req.body;
  if (!['play', 'complete', 'skip', 'like'].includes(type)) throw new HttpError(400, 'Invalid interaction');
  const songId = text(String(song?.songId ?? song?.id ?? ''), 'Song ID');
  const songName = text(song?.songName || song?.title || song?.name, 'Song name', 500);
  const artistName = text(song?.artist || song?.artistName, 'Artist', 500);
  const source = text(req.body.source || 'browse', 'Source', 100);
  await Interaction.create({ user: req.user._id, type, source, song: { songId, songName, artistName } });
  const cutoff = await Interaction.find({ user: req.user._id }).sort({ createdAt: -1, _id: -1 }).skip(49).limit(1).select('createdAt _id').lean();
  if (cutoff.length) await Interaction.deleteMany({ user: req.user._id, $or: [
    { createdAt: { $lt: cutoff[0].createdAt } }, { createdAt: cutoff[0].createdAt, _id: { $lt: cutoff[0]._id } },
  ] });
  res.json({ success: true });
});

router.get('/chat/history/:friendId', authMiddleware, async (req, res) => {
  const friend = await requireFriend(req.user, req.params.friendId);
  const filter = { $or: [
    { senderEmail: req.user.email, receiverEmail: friend.email },
    { senderEmail: friend.email, receiverEmail: req.user.email },
    { senderEmail: String(req.user._id), receiverEmail: String(friend._id) },
    { senderEmail: String(friend._id), receiverEmail: String(req.user._id) },
  ] };
  if (req.query.before) {
    if (!mongoose.isObjectIdOrHexString(req.query.before)) throw new HttpError(400, 'Invalid message cursor');
    filter._id = { $lt: req.query.before };
  }
  const messages = await Message.find(filter).sort({ createdAt: -1, _id: -1 }).limit(100).lean();
  res.json(messages.reverse().map((message) => ({
    ...message,
    senderEmail: message.senderEmail === String(req.user._id) ? req.user.email : message.senderEmail === String(friend._id) ? friend.email : message.senderEmail,
    receiverEmail: message.receiverEmail === String(req.user._id) ? req.user.email : message.receiverEmail === String(friend._id) ? friend.email : message.receiverEmail,
  })));
});

router.post('/sharePlaylist', authMiddleware, async (req, res) => {
  const friend = await requireFriend(req.user, req.body.friendId);
  const id = text(req.body.playlistId, 'Playlist');
  const playlist = req.user.library.find((item) => String(item._id) === id || item.name === id);
  if (!playlist) throw new HttpError(404, 'Playlist not found');
  const copy = { name: playlist.name, image: playlist.image, songs: playlist.songs.map((song) => {
    const data = song.toObject(); delete data._id; return data;
  }) };
  const result = await User.updateOne({ _id: friend._id, 'library.name': { $ne: copy.name }, 'library.99': { $exists: false } }, { $push: { library: copy } });
  if (!result.modifiedCount) throw new HttpError(409, 'Friend already has this playlist or library is full');
  res.json({ success: true });
});
export default router;
