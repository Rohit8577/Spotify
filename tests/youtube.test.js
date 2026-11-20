import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createYouTubeService, createAudioTicket, verifyAudioTicket, youtubeVideoId } from '../services/youtube.js';
import { tokenDigest } from '../utils/tokens.js';
import { HttpError } from '../utils/http.js';
import { testServer } from './helpers.js';
import User from '../models/User.js';
import { youtubeVideoId as mobileVideoId } from '../mobile/src/utils/youtube.js';

const videoId = 'jNQXAC9IVRw';
const secondId = '8tagabEHM3g';
const descriptor = (overrides = {}) => ({ id: videoId, vcodec: 'none', acodec: 'mp4a.40.2', ext: 'm4a', duration: 19,
  url: 'https://r1.example.googlevideo.com/videoplayback?expire=4102444800', ...overrides });
const output = (value) => ({ stdout: JSON.stringify(value) });
let env;
before(async () => { env = await testServer(); });
after(async () => { await env?.close(); });

test('YouTube references accept watch, music, short and saved links and reject spoofed hosts or invalid IDs', () => {
  for (const reference of [videoId, 'youtube_' + videoId, 'youtube:' + videoId,
    'https://www.youtube.com/watch?v=' + videoId, 'https://music.youtube.com/watch?v=' + videoId,
    'https://youtu.be/' + videoId + '?si=share', 'https://www.youtube.com/shorts/' + videoId,
    'https://www.youtube.com/embed/' + videoId]) {
    assert.equal(youtubeVideoId(reference), videoId); assert.equal(mobileVideoId(reference), videoId);
  }
  for (const reference of [null, {}, 'bad', 'https://youtube.com.evil.test/watch?v=' + videoId,
    'https://user:password@youtube.com/watch?v=' + videoId, 'file:///youtube.com/' + videoId, videoId + ';echo injected']) {
    assert.equal(youtubeVideoId(reference), null); assert.equal(mobileVideoId(reference), null);
  }
});

test('audio extraction uses audio-only formats, deduplicates concurrent requests and caches descriptors', async () => {
  const calls = [];
  let complete;
  const service = createYouTubeService({ run: (command, args) => {
    calls.push({ command, args }); return new Promise((resolve) => { complete = () => resolve(output(descriptor())); });
  } });
  const first = service.resolve(videoId);
  const second = service.resolve(videoId);
  assert.equal(calls.length, 1);
  complete();
  const [a, b] = await Promise.all([first, second]);
  assert.deepEqual(a, b); assert.equal(a.mimeType, 'audio/mp4'); assert.equal(a.duration, 19);
  assert.equal((await service.resolve(videoId)).url, a.url); assert.equal(calls.length, 1);
  assert.ok(calls[0].args.includes('bestaudio[ext=m4a][protocol=https]/bestaudio[protocol=https]'));
  assert.ok(calls[0].args.includes('--check-formats'));
  assert.equal(calls[0].args.at(-1), 'https://www.youtube.com/watch?v=' + videoId);
  assert.ok(calls[0].args.includes('--ignore-config'));
});

test('extractor rejects video formats, unsafe media URLs and redirects outside the media CDN', async () => {
  for (const info of [descriptor({ vcodec: 'avc1' }), descriptor({ protocol: 'm3u8_native' }), descriptor({ url: 'http://127.0.0.1/private' }),
    descriptor({ url: 'https://googlevideo.com.evil.test/file' }), descriptor({ url: 'https://r.googlevideo.com:8443/file' })]) {
    const service = createYouTubeService({ run: async () => output(info) });
    await assert.rejects(service.resolve(videoId), (error) => [422, 502].includes(error.status));
  }
  let fetches = 0;
  const service = createYouTubeService({ run: async () => output(descriptor()), fetchResponse: async () => {
    fetches++; return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } });
  } });
  await assert.rejects(service.open(videoId), (error) => error.status === 502);
  assert.equal(fetches, 1);
});

test('expired or denied CDN URLs are refreshed once and audio byte ranges are retained', async () => {
  let extractions = 0, fetches = 0;
  const service = createYouTubeService({ run: async () => { extractions++; return output(descriptor()); }, fetchResponse: async (_url, options) => {
    assert.equal(options.headers.Range, 'bytes=10-15');
    assert.equal(options.headers['Accept-Encoding'], 'identity');
    fetches++;
    return fetches === 1 ? new Response(null, { status: 403 }) :
      new Response('123456', { status: 206, headers: { 'content-type': 'audio/mp4', 'content-range': 'bytes 10-15/100', 'content-length': '6' } });
  } });
  const { response } = await service.open(videoId, { range: 'bytes=10-15' });
  assert.equal(response.status, 206); assert.equal(await response.text(), '123456'); assert.equal(extractions, 2);
  let clock = 1000000, runs = 0;
  const cached = createYouTubeService({ now: () => clock, run: async () => { runs++; return output(descriptor()); } });
  await cached.resolve(videoId); clock += 11 * 60000; await cached.resolve(videoId); assert.equal(runs, 2);
});

test('missing extractor, timeout and invalid provider output produce safe actionable failures', async () => {
  for (const [code, status] of [['ENOENT', 503], ['ETIMEDOUT', 504], ['OTHER', 422]]) {
    const service = createYouTubeService({ run: async () => { throw Object.assign(new Error('private-cookie-and-path'), { code }); } });
    await assert.rejects(service.resolve(videoId), (error) => error.status === status && !error.message.includes('private-cookie'));
  }
  const service = createYouTubeService({ run: async () => ({ stdout: '{bad-json' }) });
  await assert.rejects(service.resolve(videoId), (error) => error.status === 502);
  const offline = createYouTubeService({ run: async () => output(descriptor()), fetchResponse: async () => { throw new TypeError('private network details'); } });
  await assert.rejects(offline.open(videoId), (error) => error.status === 502 && !error.message.includes('private'));
});

test('audio tickets are scoped to a video and session, expire and cannot be altered', async () => {
  const account = await env.createUser('youtube-ticket@example.test');
  const now = Date.now();
  const ticket = createAudioTicket(videoId, account.user, tokenDigest(account.token), now);
  assert.equal(verifyAudioTicket(ticket, videoId, now).userId, String(account.user._id));
  for (const [value, id, time] of [[ticket + 'a', videoId, now], [ticket, secondId, now], [ticket, videoId, now + 6 * 60 * 60 * 1000], ['broken', videoId, now]]) {
    assert.throws(() => verifyAudioTicket(value, id, time), (error) => error.status === 401);
  }
  assert.equal((await env.request('/userprofile', { token: ticket })).status, 401);
});

test('YouTube resolution requires authentication and validates the queue before extracting', async () => {
  const account = await env.createUser('youtube-validation@example.test');
  assert.equal((await env.request('/youtube/resolve', { method: 'POST', body: { videoIds: [videoId] } })).status, 401);
  for (const body of [{ videoIds: [] }, { videoIds: ['bad'] }, { videoIds: [videoId], selectedVideoId: secondId }, { videoIds: Array(101).fill(videoId) }]) {
    assert.equal((await env.request('/youtube/resolve', { method: 'POST', body, token: account.token })).status, 400);
  }
  assert.equal((await env.request('/youtube/audio/' + videoId)).status, 401);
});

test('authenticated audio endpoint relays range/HEAD responses and logout revokes new stream requests', async () => {
  const account = await env.createUser('youtube-stream@example.test');
  let requestedRange;
  env.services.youtube = { resolve: async () => ({ duration: 19 }), open: async (_id, { range }) => {
    requestedRange = range;
    return { mimeType: 'audio/mp4', response: new Response('123456', { status: range ? 206 : 200,
      headers: { 'content-length': '6', ...(range ? { 'content-range': 'bytes 10-15/100' } : {}) } }) };
  } };
  try {
    const prepared = await env.request('/youtube/resolve', { method: 'POST', token: account.token,
      body: { videoIds: [videoId, videoId, secondId], selectedVideoId: videoId } });
    assert.equal(prepared.status, 200); assert.equal(prepared.data.sources.length, 2);
    const source = prepared.data.sources[0];
    assert.equal(source.duration, 19);
    const audio = await fetch(env.base + source.url, { headers: { Range: 'bytes=10-15' } });
    assert.equal(audio.status, 206); assert.deepEqual(Buffer.from(await audio.arrayBuffer()), Buffer.from('123456')); assert.equal(requestedRange, 'bytes=10-15');
    assert.equal(audio.headers.get('content-type'), 'audio/mp4'); assert.equal(audio.headers.get('content-range'), 'bytes 10-15/100');
    assert.equal(audio.headers.get('accept-ranges'), 'bytes'); assert.match(audio.headers.get('cache-control'), /no-store/);
    const head = await env.request(source.url, { method: 'HEAD' });
    assert.equal(head.status, 200); assert.equal(head.data, ''); assert.equal(head.headers.get('content-length'), '6');
    assert.equal((await env.request(source.url, { headers: { Range: 'bytes=0-1,3-4' } })).status, 416);
    await env.request('/logout', { method: 'POST', token: account.token });
    assert.equal((await env.request(source.url)).status, 401);
  } finally { delete env.services.youtube; }
});

test('password changes invalidate tickets and provider errors reach clients without process details', async () => {
  const account = await env.createUser('youtube-reset@example.test');
  const ticket = createAudioTicket(videoId, account.user, tokenDigest(account.token));
  await User.updateOne({ _id: account.user._id }, { $inc: { tokenVersion: 1 } });
  assert.equal((await env.request(`/youtube/audio/${videoId}?ticket=${ticket}`)).status, 401);
  const listener = await env.createUser('youtube-error@example.test');
  env.services.youtube = { resolve: async () => { throw new HttpError(503, 'YouTube audio is unavailable on this server.'); } };
  try {
    const result = await env.request('/youtube/resolve', { method: 'POST', token: listener.token, body: { videoIds: [videoId], selectedVideoId: videoId } });
    assert.equal(result.status, 503); assert.match(result.data.message, /YouTube audio is unavailable/);
    assert.doesNotMatch(JSON.stringify(result.data), /JWT_SECRET|cookie|\.tools|stack/);
  } finally { delete env.services.youtube; }
});

test('YouTube favorites, recent history and playlists store durable references rather than playback tickets', async () => {
  const account = await env.createUser('youtube-persist@example.test');
  const song = { songId: 'youtube_' + videoId, name: 'YouTube Song', artist: 'Artist', image: 'https://image.example.test/cover.jpg',
    url: env.base + `/youtube/audio/${videoId}?ticket=temporary-ticket`, len: 19 };
  assert.equal((await env.request('/favorite', { method: 'POST', token: account.token, body: song })).status, 200);
  assert.equal((await env.request('/get-favorite', { token: account.token })).data.arr[0].songUrl, 'youtube:' + videoId);
  await env.request('/updateRecently', { method: 'POST', token: account.token, body: song });
  assert.equal((await env.request('/updateRecently', { token: account.token })).data.arr[0].songUrl, 'youtube:' + videoId);
  await env.request('/playlistname', { method: 'POST', token: account.token, body: { name: 'YouTube Mix' } });
  const saved = await env.request('/songinfo', { method: 'POST', token: account.token,
    body: { ...song, pname: 'YouTube Mix', songName: song.name, songUrl: song.url, url: song.image } });
  assert.equal(saved.status, 200);
  const playlist = await env.request('/librarySongs', { method: 'POST', token: account.token, body: { pname: 'YouTube Mix' } });
  assert.equal(playlist.data.arr[0].songUrl, 'youtube:' + videoId);
});

test('direct YouTube links fetch video metadata and related searches use the title rather than the ID', async () => {
  const original = env.services.fetchJson;
  const oldKey = process.env.YOUTUBE_API_KEY;
  process.env.YOUTUBE_API_KEY = 'isolated-youtube-test-key';
  const calls = [];
  env.services.fetchJson = async (url) => {
    calls.push(new URL(url));
    return { items: [{ id: videoId, snippet: { title: 'A Music Title', channelTitle: 'Artist' }, contentDetails: { duration: 'PT19S' } }] };
  };
  try {
    const result = await env.request('/search?type=youtube&query=' + encodeURIComponent('https://youtu.be/' + videoId));
    assert.equal(result.status, 200); assert.equal(calls[0].pathname, '/youtube/v3/videos');
    assert.equal(calls[0].searchParams.get('id'), videoId);
    calls.length = 0;
    assert.equal((await env.request('/search?type=youtube_related&query=' + videoId)).status, 200);
    assert.equal(calls[1].pathname, '/youtube/v3/search'); assert.equal(calls[1].searchParams.get('q'), 'A Music Title');
  } finally { env.services.fetchJson = original; if (oldKey === undefined) delete process.env.YOUTUBE_API_KEY; else process.env.YOUTUBE_API_KEY = oldKey; }
});
