import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSong, queueIndexAfter } from '../mobile/src/utils/song.js';
import { formatTime } from '../mobile/src/utils/time.js';
import { createTokenStore } from '../mobile/src/utils/tokenStore.js';

test('mobile normalization prefers stream URL over catalog webpage and handles AI artwork', () => {
  const song = normalizeSong({ id: '1', url: 'https://saavn.com/song/one', download_url: [{ quality: '320kbps', link: 'https://audio.test/one.mp3' }], image: [{ quality: '500x500', link: 'https://image.test/one.jpg' }], artist_map: { artists: [{ name: 'Artist' }] } });
  assert.equal(song.url, 'https://audio.test/one.mp3');
  assert.equal(song.image, 'https://image.test/one.jpg');
  assert.equal(song.artist, 'Artist');
  assert.equal(normalizeSong({ id: '2', image_url: 'cover.jpg', audio_url: 'song.mp3' }).image, 'cover.jpg');
  assert.equal(normalizeSong({}), null);
});

test('queue end, repeat and shuffle do not repeat the current song accidentally', () => {
  assert.equal(queueIndexAfter(1, 2, false, 'off'), -1);
  assert.equal(queueIndexAfter(1, 2, false, 'all'), 0);
  for (const random of [0, 0.3, 0.999]) assert.notEqual(queueIndexAfter(2, 4, true, 'off', () => random), 2);
  assert.equal(queueIndexAfter(-1, 0, true, 'all'), -1);
  assert.equal(formatTime(Infinity), '0:00');
  assert.equal(formatTime(125), '2:05');
});

function tokenFixture(native = true) {
  const plainValues = new Map();
  const secureValues = new Map();
  const plain = {
    getItem: async (key) => plainValues.get(key) || null,
    setItem: async (key, value) => { plainValues.set(key, value); },
    removeItem: async (key) => { plainValues.delete(key); },
  };
  const secure = {
    getItemAsync: async (key) => secureValues.get(key) || null,
    setItemAsync: async (key, value) => { secureValues.set(key, value); },
    deleteItemAsync: async (key) => { secureValues.delete(key); },
  };
  return { plainValues, secureValues, secure, store: createTokenStore({ native, plain, secure }) };
}

test('native token migration removes the plaintext copy and logout removes both stores', async () => {
  const fixture = tokenFixture();
  fixture.plainValues.set('@sangeetx_token', 'legacy-credential');
  assert.equal(await fixture.store.get(), 'legacy-credential');
  assert.equal(fixture.plainValues.has('@sangeetx_token'), false);
  assert.equal(fixture.secureValues.get('sangeetx.token'), 'legacy-credential');
  await fixture.store.set('new-credential');
  assert.equal(fixture.plainValues.size, 0);
  assert.equal(await fixture.store.get(), 'new-credential');
  await fixture.store.set(null);
  assert.equal(await fixture.store.get(), null);
  assert.equal(fixture.secureValues.size, 0);
});

test('secure storage failure never falls back to writing a new plaintext credential', async () => {
  const fixture = tokenFixture();
  fixture.secure.setItemAsync = async () => { throw new Error('Keychain unavailable'); };
  await assert.rejects(fixture.store.set('new-credential'), /Keychain unavailable/);
  assert.equal(fixture.plainValues.size, 0);
  fixture.plainValues.set('@sangeetx_token', 'legacy-credential');
  await assert.rejects(fixture.store.get(), /Keychain unavailable/);
  assert.equal(fixture.plainValues.get('@sangeetx_token'), 'legacy-credential');
});

test('web token storage works without invoking native secure-store APIs', async () => {
  const fixture = tokenFixture(false);
  fixture.secure.getItemAsync = async () => { throw new Error('Native API on web'); };
  fixture.secure.setItemAsync = async () => { throw new Error('Native API on web'); };
  await fixture.store.set('web-credential');
  assert.equal(await fixture.store.get(), 'web-credential');
  await fixture.store.set(null);
  assert.equal(await fixture.store.get(), null);
});
