import { Server } from 'socket.io';
import { parseCookie } from 'cookie';
import { authenticateToken } from './middlewares/auth.js';
import { requireFriend } from './utils/friends.js';
import { text, HttpError } from './utils/http.js';
import Message from './models/Message.js';
import User from './models/User.js';
import { originAllowed, trustedOrigins } from './utils/browserSecurity.js';
import { mapLimit } from './utils/upstream.js';

export function attachSockets(server, { origins = trustedOrigins() } = {}) {
  const io = new Server(server, {
    maxHttpBufferSize: 32768,
    cors: (req, callback) => callback(null, { origin: originAllowed(req, origins) ? req.headers.origin || false : false, credentials: true }),
    allowRequest: (req, callback) => callback(null, originAllowed(req, origins) &&
      (Boolean(req.headers.origin) || !req.headers['sec-fetch-site'] || req.headers['sec-fetch-site'] === 'same-origin')),
  });
  // A socket that never sends again must not keep receiving after revocation/expiry.
  // Check recipients at delivery time so this also works across server processes.
  const deliver = async (rooms, event, payload, exceptId) => {
    if (!rooms.length) return;
    const recipients = await io.to(rooms).fetchSockets();
    await mapLimit(recipients, 8, async (recipient) => {
      if (recipient.id === exceptId) return;
      const current = await authenticateToken(recipient.data.token);
      if (!current) return recipient.disconnect(true);
      recipient.emit(event, payload);
    });
  };
  io.use(async (socket, next) => {
    try {
      const cookies = parseCookie(socket.handshake.headers.cookie || '');
      const token = socket.handshake.auth?.token || cookies.token;
      const user = await authenticateToken(token);
      if (!user) return next(new Error('Unauthorized'));
      socket.data.user = user;
      socket.data.token = token;
      next();
    } catch { next(new Error('Authentication unavailable')); }
  });
  io.on('connection', (socket) => {
    const user = socket.data.user;
    socket.join(user.email);
    // Legacy clients can still send register; identity comes only from the JWT.
    socket.on('register', () => {});
    const events = [];
    const handler = (name, action) => socket.on(name, async (data, acknowledgement) => {
      const ack = typeof acknowledgement === 'function' ? acknowledgement : () => {};
      try {
        const now = Date.now();
        while (events.length && events[0] < now - 60000) events.shift();
        if (events.length >= 60) throw new HttpError(429, 'Too many messages');
        events.push(now);
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Invalid message');
        const currentUser = await authenticateToken(socket.data.token);
        if (!currentUser) { socket.disconnect(true); return; }
        const result = await action(data, currentUser);
        ack({ success: true, ...result });
      } catch (error) {
        const message = error.status ? error.message : 'Unable to send message';
        ack({ success: false, message });
        socket.emit('message-error', { message });
      }
    });
    handler('now-playing', async (data, currentUser) => {
      const title = text(data.songName || data.title, 'Song name', 500);
      const ids = currentUser.friends.map((friend) => friend.id);
      const emails = currentUser.friends.map((friend) => friend.email || friend.id);
      const validIds = ids.filter((id) => /^[a-f0-9]{24}$/i.test(id));
      const friends = await User.find({ $or: [{ _id: { $in: validIds } }, { email: { $in: emails } }] }).select('email').lean();
      await deliver(friends.map((friend) => friend.email), 'friend-now-playing', {
        username: currentUser.name, email: currentUser.email, song: { ...data, title, songName: title },
      }, socket.id);
    });
    handler('share-song', async (data, currentUser) => {
      const friend = await requireFriend(currentUser, data.to);
      if (!data.song || typeof data.song !== 'object' || Array.isArray(data.song)) throw new HttpError(400, 'Song is required');
      const id = text(String(data.song.songId || data.song.id || ''), 'Song ID');
      const title = text(data.song.songName || data.song.title, 'Song title', 500);
      await deliver([friend.email], 'song-shared', { from: currentUser.name || currentUser.email, song: { ...data.song, id, songId: id, title, songName: title } });
    });
    handler('send-chat-message', async (data, currentUser) => {
      const friend = await requireFriend(currentUser, data.to);
      const content = text(data.content, 'Message', 4000);
      const message = await Message.create({ senderEmail: currentUser.email, receiverEmail: friend.email, content });
      await deliver([friend.email, currentUser.email], 'receive-chat-message', message);
      return { message };
    });
  });
  return io;
}
