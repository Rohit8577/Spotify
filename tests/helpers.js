import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import http from 'node:http';
import { createApp } from '../app.js';
import { attachSockets } from '../sockets.js';
import User from '../models/User.js';
import Verification from '../models/Verification.js';
import RevokedToken from '../models/RevokedToken.js';
import { hashPassword } from '../utils/password.js';
import { issueToken } from '../utils/tokens.js';

// Six seconds of generated PCM audio keeps playback tests independent of CDNs.
export const testAudio = Buffer.alloc(44 + 8000 * 2 * 6);
testAudio.write('RIFF', 0); testAudio.writeUInt32LE(testAudio.length - 8, 4);
testAudio.write('WAVEfmt ', 8); testAudio.writeUInt32LE(16, 16);
testAudio.writeUInt16LE(1, 20); testAudio.writeUInt16LE(1, 22);
testAudio.writeUInt32LE(8000, 24); testAudio.writeUInt32LE(16000, 28);
testAudio.writeUInt16LE(2, 32); testAudio.writeUInt16LE(16, 34);
testAudio.write('data', 36); testAudio.writeUInt32LE(testAudio.length - 44, 40);
for (let i = 0; i < 48000; i++) testAudio.writeInt16LE(Math.round(Math.sin(i * Math.PI * 2 * 220 / 8000) * 1000), 44 + i * 2);

export const fixtureSong = (id = 'track-1') => ({
  id, name: 'Test Song', type: 'song', subtitle: 'Test Artist', duration: 120,
  image: [150, 250, 500].map((size) => ({ quality: `${size}x${size}`, link: '/css/logo.png' })),
  download_url: ['12', '48', '96', '160', '320'].map((quality) => ({ quality: `${quality}kbps`, link: 'https://audio.example.test/song.mp3' })),
  artist_map: { artists: [{ name: 'Test Artist' }], primary_artists: [{ name: 'Test Artist' }] },
});

export async function testServer() {
  // Never read .env or connect tests to the configured application database.
  process.env.JWT_SECRET = 'isolated-test-secret-not-for-production';
  process.env.SAVAN_URL = 'https://music.example.test';
  process.env.NODE_ENV = 'test';
  delete process.env.TRUST_PROXY;
  delete process.env.TRUSTED_ORIGINS;
  const database = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  await mongoose.connect(database.getUri());
  await Promise.all([User.init(), Verification.init(), RevokedToken.init()]);
  const outbox = [];
  const calls = [];
  const services = {
    sendOtp: async (message) => { outbox.push(message); },
    generateText: async () => 'Test Song - Test Artist, Test Song - Test Artist',
    fetchJson: async (url) => {
      calls.push(String(url));
      const path = new URL(url).pathname;
      if (path === '/api/generate') return { response: '{"vibeCheck":"Test mix","tracks":[{"title":"Test Song","artist":"Test Artist"}]}' };
      if (path === '/modules') return { data: { trending: { data: [fixtureSong()] }, artist_recos: { data: [] }, charts: { data: [] }, albums: { data: [] }, playlists: { data: [] } } };
      if (path === '/artist') return { data: { id: 'artist-1', name: 'Test Artist', top_songs: [fixtureSong()], top_albums: [{ id: 'album-1', name: 'Test Album', image: fixtureSong().image }], image: fixtureSong().image } };
      if (path === '/album' || path === '/playlist') return { data: { id: 'album-1', name: 'Test Album', songs: [fixtureSong()], image: fixtureSong().image } };
      if (path === '/get/trending' || path === '/song/recommend') return { data: [fixtureSong(), fixtureSong('track-2')] };
      if (path === '/song') return { data: { songs: [fixtureSong()] } };
      if (path === '/get/lyrics') return { data: { lyrics: 'Test lyrics' } };
      return { status: 'Success', data: { results: [fixtureSong()] } };
    },
  };
  const app = createApp({ services });
  const server = http.createServer(app);
  const io = attachSockets(server, { origins: app.locals.trustedOrigins });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, { method = 'GET', body, token, headers = {} } = {}) => {
    const response = await fetch(base + path, { method, headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers,
    }, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    const raw = await response.text();
    let data; try { data = JSON.parse(raw); } catch { data = raw; }
    return { status: response.status, data, headers: response.headers };
  };
  const createUser = async (email = 'listener@example.test', extra = {}) => {
    const user = await User.create({ email, name: email.split('@')[0], password: await hashPassword('password123'), ...extra });
    return { user, token: issueToken(user) };
  };
  return { app, server, io, base, request, createUser, services, outbox, calls,
    close: async () => { await new Promise((resolve) => io.close(resolve)); await mongoose.disconnect(); await database.stop(); },
  };
}
