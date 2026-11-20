import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { io as connect } from 'socket.io-client';
import { testServer } from './helpers.js';
import User from '../models/User.js';
import Verification from '../models/Verification.js';
import Interaction from '../models/Interactions.js';
import Message from '../models/Message.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { HttpError } from '../utils/http.js';
import { mapLimit, fetchJson } from '../utils/upstream.js';

let env, owner, friend;
const song = { songId: 'one', songName: 'One', songUrl: 'https://audio.example.test/one.mp3', image: '', artist: 'Artist', len: 60 };
before(async () => { env = await testServer(); owner = await env.createUser(); friend = await env.createUser('friend@example.test'); });
after(async () => { await env?.close(); });
const post = (path, body, token = owner.token) => env.request(path, { method: 'POST', body, token });

test('artist follow and unfollow persist, validate IDs and only update the authenticated account', async () => {
  const account = await env.createUser('artist-follow@example.test');
  const other = await env.createUser('artist-other@example.test');
  await post('/addArtist', { id: 123 }, account.token);
  await post('/addArtist', { id: 456 }, account.token);
  await post('/addArtist', { id: 123 }, other.token);
  assert.equal((await post('/removeArtist', { id: 123 }, null)).status, 401);
  for (const id of [null, -1, 'bad', 1.5]) assert.equal((await post('/removeArtist', { id }, account.token)).status, 400);
  assert.equal((await post('/removeArtist', { id: 123, userId: String(other.user._id) }, account.token)).status, 200);
  assert.deepEqual((await User.findById(account.user._id)).artist.map((artist) => artist.id), [456]);
  assert.deepEqual((await User.findById(other.user._id)).artist.map((artist) => artist.id), [123]);
});

test('passwords use salted hashes and legacy credentials still verify', async () => {
  const one = await hashPassword('test password');
  assert.notEqual(one, await hashPassword('test password'));
  assert.equal(await verifyPassword('test password', one), true);
  assert.equal(await verifyPassword('wrong', one), false);
  assert.equal(await verifyPassword(undefined, undefined), false);
  assert.equal(await verifyPassword('legacy', 'legacy'), true);
});

test('authentication rejects guests, malformed tokens and query-token leakage', async () => {
  for (const token of [undefined, 'broken']) assert.equal((await env.request('/userprofile', { token })).status, 401);
  assert.equal((await env.request('/userprofile?token=' + owner.token)).status, 401);
  const response = await env.request('/userprofile', { token: owner.token, headers: { Cookie: 'token=expired' } });
  assert.equal(response.status, 200);
  assert.equal(response.data.password, undefined);
});

test('OAuth-only accounts cannot log in with an omitted password', async () => {
  await User.create({ email: 'oauth@example.test', name: 'OAuth' });
  assert.equal((await post('/login', { email: 'oauth@example.test' }, null)).status, 400);
  assert.equal((await post('/login', { email: 'oauth@example.test', password: 'fake' }, null)).status, 401);
});

test('legacy login migrates plain text and canonicalizes email input', async () => {
  await User.create({ email: 'legacy@example.test', password: 'oldpassword' });
  const response = await post('/login', { email: ' LEGACY@example.test ', password: 'oldpassword' }, null);
  assert.equal(response.status, 200);
  assert.match((await User.findOne({ email: 'legacy@example.test' })).password, /^scrypt\$/);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(response.headers.get('set-cookie'), /SameSite=Lax/);
});

test('signup requires a server-verified OTP, does not leak it and consumes proof once', async () => {
  const email = 'signup@example.test';
  const payload = { email, globalPassword: 'newpassword', userdata: { name: 'New User' } };
  assert.equal((await post('/signup', payload, null)).status, 403);
  const sent = await post('/send-otp', { email }, null);
  assert.equal(sent.status, 200); assert.equal(sent.data.otp, undefined);
  assert.equal((await post('/send-otp', { email }, null)).status, 429);
  const code = env.outbox.at(-1).code;
  assert.equal((await post('/verify-otp', { email, otp: code === '1111' ? '2222' : '1111' }, null)).status, 400);
  const verified = await post('/verify-otp', { email, otp: code }, null);
  assert.equal(verified.status, 200);
  assert.equal((await post('/verify-otp', { email, otp: code }, null)).status, 400);
  const response = await post('/signup', { ...payload, verificationToken: verified.data.verificationToken }, null);
  assert.equal(response.status, 201);
  assert.match((await User.findOne({ email })).password, /^scrypt\$/);
  assert.equal((await post('/updtpass', { email, newpassword: 'attacker', verificationToken: verified.data.verificationToken }, null)).status, 403);
});

test('password reset rejects missing proof and revokes old tokens', async () => {
  const account = await env.createUser('reset@example.test');
  const email = account.user.email;
  assert.equal((await post('/updtpass', { email, newpassword: 'changed123' }, null)).status, 403);
  await post('/send-otp', { email, purpose: 'reset' }, null);
  const verified = await post('/verify-otp', { email, otp: env.outbox.at(-1).code, purpose: 'reset' }, null);
  assert.equal((await post('/updtpass', { email, newpassword: 'changed123', verificationToken: verified.data.verificationToken }, null)).status, 200);
  assert.equal((await env.request('/userprofile', { token: account.token })).status, 401);
  assert.equal((await post('/login', { email, password: 'changed123' }, null)).status, 200);
});

test('OTP expiry and attempt limits are enforced', async () => {
  const email = 'attempts@example.test';
  await post('/send-otp', { email }, null);
  const code = env.outbox.at(-1).code;
  for (let i = 0; i < 5; i++) await post('/verify-otp', { email, otp: code === '1111' ? '2222' : '1111' }, null);
  assert.equal((await post('/verify-otp', { email, otp: code }, null)).status, 400);
  await Verification.updateOne({ email }, { $set: { attempts: 0, expiresAt: new Date(Date.now() - 1) } });
  assert.equal((await post('/verify-otp', { email, otp: code }, null)).status, 400);
});

test('malformed auth input does not reach database queries or crash server', async () => {
  assert.equal((await post('/login', { email: { $ne: null }, password: 'password' }, null)).status, 400);
  assert.equal((await post('/signup', { email: 'missing@example.test' }, null)).status, 400);
  assert.equal((await env.request('/health')).status, 200);
  const response = await fetch(env.base + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(response.status, 400); assert.match(response.headers.get('content-type'), /json/);
});

test('playlist creation is atomic, validates names and isolates owners', async () => {
  assert.equal((await post('/playlistname', { name: '   ' })).status, 400);
  const attempts = await Promise.all(Array.from({ length: 8 }, () => post('/playlistname', { name: 'Mix' })));
  assert.equal(attempts.filter((result) => result.status === 200).length, 1);
  assert.equal((await post('/librarySongs', { pname: 'Mix' }, friend.token)).status, 404);
  assert.equal((await User.findById(owner.user._id)).library.length, 1);
});

test('playlist song CRUD deduplicates concurrent writes and validates missing targets', async () => {
  const payload = { pname: 'Mix', name: song.songName, songId: song.songId, songUrl: song.songUrl, url: '', artist: song.artist, time: 60 };
  const results = await Promise.all(Array.from({ length: 6 }, () => post('/songinfo', payload)));
  assert.equal(results.filter((result) => result.status === 200).length, 1);
  assert.equal((await post('/librarySongs', { pname: 'Mix' })).data.arr.length, 1);
  assert.equal((await post('/save', { pname: 'missing', songList: [] })).status, 404);
  assert.equal((await post('/save', { pname: 'Mix', songList: 'invalid' })).status, 400);
  assert.equal((await post('/save', { pname: 'Mix', songList: [song, song] })).status, 200);
  assert.equal((await post('/librarySongs', { pname: 'Mix' })).data.arr.length, 1);
  assert.equal((await post('/renamePlaylist', { oldName: 'Mix', newName: 'Renamed' })).status, 200);
  assert.equal((await post('/deleteSong', { playlistName: 'Renamed', songId: 'one' })).status, 200);
  assert.equal((await post('/deletePlaylist', { playlistName: 'Renamed' })).status, 200);
});

test('online playlist import writes complete songs atomically and rejects duplicates', async () => {
  const first = await post('/import-playlist', { playlistId: 'album-1' });
  assert.equal(first.status, 200);
  assert.equal(first.data.total, 1);
  assert.equal((await post('/librarySongs', { pname: 'Test Album' })).data.arr[0].songId, 'track-1');
  assert.equal((await post('/import-playlist', { playlistId: 'album-1' })).status, 409);
  assert.equal((await post('/playlistData', { playlistId: 'album-1' })).data.playlistSongs.length, 1);
});

test('profile edits persist and password changes require the current password', async () => {
  const account = await env.createUser('profile@example.test');
  assert.equal((await post('/profile', { name: 'Updated' }, account.token)).status, 200);
  assert.equal((await User.findById(account.user._id)).name, 'Updated');
  assert.equal((await post('/profile', { name: 'Updated', currentPassword: 'wrong', newPassword: 'changed123' }, account.token)).status, 401);
  const result = await post('/profile', { name: 'Updated', currentPassword: 'password123', newPassword: 'changed123' }, account.token);
  assert.equal(result.status, 200);
  assert.equal((await env.request('/userprofile', { token: result.data.token })).status, 200);
  assert.equal((await env.request('/userprofile', { token: account.token })).status, 401);
});

test('recent history is bounded, atomic, and stores dollar-prefixed metadata literally', async () => {
  await Promise.all(Array.from({ length: 25 }, (_, i) => post('/updateRecently', { ...song, songId: 'recent-' + i })));
  for (let i = 0; i < 3; i++) assert.equal((await post('/updateRecently', { ...song, songName: '$favorite' })).status, 200);
  const result = (await env.request('/updateRecently', { token: owner.token })).data.arr;
  assert.equal(result.length, 20);
  assert.equal(result[0].songName, '$favorite');
  assert.equal(result.filter((item) => item.songId === 'one').length, 1);
});

test('favorite toggle survives concurrent requests without duplicate songs', async () => {
  const results = await Promise.all(Array.from({ length: 5 }, () => post('/favorite', song)));
  assert.equal(results.every((result) => [200, 201].includes(result.status)), true);
  assert.equal((await env.request('/get-favorite', { token: owner.token })).data.arr.length, 1);
});

test('search encodes reserved characters and surfaces provider errors', async () => {
  assert.equal((await env.request('/search?type=song&query=AC%26DC%20%23live')).status, 200);
  assert.equal(new URL(env.calls.at(-1)).searchParams.get('q'), 'AC&DC #live');
  assert.equal((await env.request('/search?type=constructor&query=x')).status, 400);
  assert.equal((await env.request('/search?type=song&query[x]=y')).status, 400);
  const original = env.services.fetchJson;
  env.services.fetchJson = async () => { throw new HttpError(504, 'timeout'); };
  try { assert.equal((await env.request('/search?type=song&query=x')).status, 504); }
  finally { env.services.fetchJson = original; }
  assert.equal((await env.request('/get-songs')).status, 200);
});

test('friend requests reach recipient, acceptance is reciprocal, search escapes regex', async () => {
  assert.equal((await post('/searchFriend', { friendId: '[' })).status, 200);
  assert.equal((await post('/sendFriendRequest', { friendId: owner.user.email })).status, 400);
  assert.equal((await post('/sendFriendRequest', { friendId: friend.user.email })).status, 200);
  const pending = await env.request('/friends/requests', { token: friend.token });
  assert.equal(pending.data[0].email, owner.user.email);
  assert.equal((await post('/friends/respond', { friendId: owner.user.email, accept: true }, friend.token)).status, 200);
  assert.equal((await env.request('/friends/list', { token: owner.token })).data[0].email, friend.user.email);
  assert.equal((await env.request('/friends/activity', { token: owner.token })).status, 200);
});

test('interaction data accepts mobile shape and retains only the latest 50', async () => {
  assert.equal((await post('/log-interaction', { type: 'bad' })).status, 400);
  for (let i = 0; i < 52; i++) assert.equal((await post('/log-interaction', { type: 'play', song: { id: 'log-' + i, title: 'Song', artist: 'Artist' } })).status, 200);
  assert.equal(await Interaction.countDocuments({ user: owner.user._id }), 50);
});

test('recommendations deduplicate and exclude skipped songs even from trending', async () => {
  await post('/log-interaction', { type: 'skip', song: { id: 'track-1', title: 'Song', artist: 'Artist' } });
  const before = env.calls.length;
  const results = await Promise.all([env.request('/recommendations', { token: owner.token }), env.request('/recommendations', { token: owner.token })]);
  assert.equal(results[0].status, 200);
  assert.deepEqual(results[0].data.songs.map((item) => item.id), ['track-2']);
  const count = env.calls.length - before;
  await env.request('/recommendations', { token: owner.token });
  assert.equal(env.calls.length - before, count);
});

test('AI EQ validates shape and clamps values; empty prompts fail fast', async () => {
  env.services.generateText = async () => '{"genre":"Test","values":[-30,30,0,1,2,3]}';
  assert.deepEqual((await env.request('/get-ai-eq?song=Test')).data.values, [-12, 12, 0, 1, 2, 3]);
  env.services.generateText = async () => '{"values":[1]}';
  assert.equal((await env.request('/get-ai-eq?song=Test')).data.success, false);
  assert.equal((await post('/api/ask-ai', { prompt: ' ' })).status, 400);
});

test('Ask AI falls back to the configured text provider when Ollama is offline or returns an empty reply', async () => {
  const originalFetch = env.services.fetchJson;
  const originalGenerate = env.services.generateText;
  const prompts = [];
  env.services.generateText = async (prompt) => { prompts.push(prompt); return '<think>internal</think>Arijit Singh is a playback singer.'; };
  try {
    for (const mode of ['offline', 'empty']) {
      env.services.fetchJson = async (_url, _options, timeout) => {
        assert.equal(timeout, 8000);
        if (mode === 'offline') throw new HttpError(502, 'Local model unavailable');
        return { response: '<think>no public answer</think>' };
      };
      const result = await post('/api/ask-ai', { prompt: 'Name a singer' });
      assert.equal(result.status, 200); assert.equal(result.data.answer, 'Arijit Singh is a playback singer.');
    }
    assert.deepEqual(prompts, ['Name a singer', 'Name a singer']);
  } finally { env.services.fetchJson = originalFetch; env.services.generateText = originalGenerate; }
});

test('Ask AI keeps a bounded primary request and reports failure when neither provider is configured', async () => {
  const originalFetch = env.services.fetchJson;
  const originalGenerate = env.services.generateText;
  const oldKey = process.env.googleApi;
  delete env.services.generateText; delete process.env.googleApi;
  env.services.fetchJson = async (_url, _options, timeout) => { assert.equal(timeout, 30000); throw new HttpError(504, 'Provider timed out'); };
  try {
    const result = await post('/api/ask-ai', { prompt: 'Name a singer' });
    assert.equal(result.status, 504); assert.equal(result.data.success, false);
  } finally {
    env.services.fetchJson = originalFetch; env.services.generateText = originalGenerate;
    if (oldKey === undefined) delete process.env.googleApi; else process.env.googleApi = oldKey;
  }
});

test('socket identity cannot be spoofed and web/mobile chat shares email identifiers', async () => {
  const guest = connect(env.base, { reconnection: false });
  try { const [error] = await once(guest, 'connect_error'); assert.match(error.message, /Unauthorized/); } finally { guest.close(); }
  const sender = connect(env.base, { auth: { token: owner.token }, reconnection: false });
  const receiver = connect(env.base, { auth: { token: friend.token }, reconnection: false });
  try {
    await Promise.all([once(sender, 'connect'), once(receiver, 'connect')]);
    sender.emit('register', { id: 'victim@example.test', name: 'Victim' });
    const incoming = once(receiver, 'receive-chat-message');
    const ack = await sender.timeout(5000).emitWithAck('send-chat-message', { to: String(friend.user._id), content: 'Hello' });
    assert.equal(ack.success, true);
    const [message] = await incoming;
    assert.equal(message.senderEmail, owner.user.email);
    assert.equal(message.receiverEmail, friend.user.email);
    assert.equal((await sender.timeout(5000).emitWithAck('send-chat-message', null)).success, false);
    const stranger = await env.createUser('stranger@example.test');
    assert.equal((await sender.timeout(5000).emitWithAck('send-chat-message', { to: stranger.user.email, content: 'No' })).success, false);
    assert.equal((await env.request('/chat/history/' + friend.user._id, { token: owner.token })).data.length, 1);
    assert.equal((await env.request('/chat/history/' + stranger.user._id, { token: owner.token })).status, 403);
    assert.equal(await Message.countDocuments(), 1);
  } finally { sender.close(); receiver.close(); }
});

test('bounded worker pool enforces concurrency while preserving order', async () => {
  let active = 0, peak = 0;
  const result = await mapLimit([1, 2, 3, 4, 5], 2, async (item) => {
    active++; peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5)); active--; return item * 2;
  });
  assert.equal(peak, 2); assert.deepEqual(result, [2, 4, 6, 8, 10]);
});

test('fetchJson times out slow providers', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, { signal }) => new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 1000);
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); });
  });
  try { await assert.rejects(fetchJson('http://test', {}, 10), { status: 504 }); }
  finally { globalThis.fetch = original; }
});
