import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSong, queueIndexAfter } from '../mobile/src/utils/song.js';
import { parseVersion, isNewerVersion } from '../mobile/src/utils/versionCheck.js';
import { formatTime } from '../mobile/src/utils/time.js';
import { createTokenStore } from '../mobile/src/utils/tokenStore.js';
import { isPlayable, playableQueue, preparePlaybackQueue, shuffledUpcoming } from '../mobile/src/utils/playbackQueue.js';
import { normalizeYouTubeSong, youtubePageUrl } from '../mobile/src/utils/youtube.js';
import { themeFromColor } from '../mobile/src/utils/artworkTheme.js';
import audioWakeLock from '../mobile/plugins/withAudioWakeLock.cjs';
import { readFileSync } from 'node:fs';
import { createOtaUpdater } from '../mobile/src/services/otaUpdater.js';
import { createApkDownloader } from '../mobile/src/services/apkDownloader.js';

function updateFixture(overrides = {}) {
  const calls = { check: 0, download: 0, reload: 0 };
  const updates = {
    checkForUpdateAsync: async () => { calls.check++; return { isAvailable: true }; },
    fetchUpdateAsync: async () => { calls.download++; return { isNew: true }; },
    reloadAsync: async () => { calls.reload++; },
    ...overrides,
  };
  return { updates, calls };
}

test('OTA update can restart immediately after download before the native hook catches up', async () => {
  const fixture = updateFixture();
  const updater = createOtaUpdater(fixture);
  assert.equal((await updater.checkAndDownload()).ready, true);
  updater.setNativePending(false);
  await updater.apply();
  assert.deepEqual(fixture.calls, { check: 1, download: 1, reload: 1 });
});

test('already downloaded OTA updates remain ready without another network download', async () => {
  const fixture = updateFixture();
  const updater = createOtaUpdater(fixture);
  updater.setNativePending(true);
  assert.equal((await updater.checkAndDownload()).ready, true);
  assert.deepEqual(fixture.calls, { check: 0, download: 0, reload: 0 });
});

test('OTA checks share one in-flight request and retry after network failure', async () => {
  let release;
  const waiting = new Promise((resolve) => { release = resolve; });
  let checks = 0;
  const fixture = updateFixture({ checkForUpdateAsync: async () => {
    checks++;
    await waiting;
    if (checks === 1) throw new Error('offline');
    return { isAvailable: true };
  } });
  const updater = createOtaUpdater(fixture);
  const first = updater.checkAndDownload();
  assert.equal(first, updater.checkAndDownload());
  release();
  await assert.rejects(first, /offline/);
  assert.equal((await updater.checkAndDownload()).ready, true);
  assert.equal(checks, 2);
});

test('failed OTA fetch results do not offer a restart and rollback downloads do', async () => {
  const failed = createOtaUpdater(updateFixture({ fetchUpdateAsync: async () => ({ isNew: false, isRollBackToEmbedded: false }) }));
  assert.equal((await failed.checkAndDownload()).ready, false);
  assert.equal(failed.isPending(), false);
  const rollback = createOtaUpdater(updateFixture({
    checkForUpdateAsync: async () => ({ isAvailable: false, isRollBackToEmbedded: true }),
    fetchUpdateAsync: async () => ({ isNew: false, isRollBackToEmbedded: true }),
  }));
  assert.equal((await rollback.checkAndDownload()).ready, true);
});

test('OTA downloads continue during playback and applying waits until music is paused', async () => {
  let playing = true;
  const fixture = updateFixture();
  const updater = createOtaUpdater({ ...fixture, isPlaybackActive: () => playing });
  await updater.checkAndDownload();
  await assert.rejects(updater.apply(), { name: 'PlaybackActiveError' });
  assert.equal(fixture.calls.reload, 0);
  playing = false;
  await updater.apply();
  assert.equal(fixture.calls.reload, 1);
});

function apkFixture(options = {}) {
  const files = new Map();
  const cacheDirectory = 'file:///cache/';
  let downloads = 0;
  const settings = { size: 12 * 1024 * 1024, signature: 'UEsDBA==', status: 200, ...options };
  const fileSystem = {
    cacheDirectory,
    EncodingType: { Base64: 'base64' },
    getInfoAsync: async (uri) => ({ exists: files.has(uri), isDirectory: false, size: files.get(uri)?.size || 0 }),
    readAsStringAsync: async (uri, options) => {
      if (!files.has(uri)) throw new Error('missing');
      return options?.encoding === 'base64' ? files.get(uri).signature : files.get(uri).text;
    },
    writeAsStringAsync: async (uri, text) => { files.set(uri, { text, size: Buffer.byteLength(text) }); },
    deleteAsync: async (uri) => { files.delete(uri); },
    readDirectoryAsync: async () => [...files.keys()].map((uri) => uri.slice(cacheDirectory.length)),
    moveAsync: async ({ from, to }) => { files.set(to, files.get(from)); files.delete(from); },
    createDownloadResumable: (url, uri, options, progress) => ({ downloadAsync: async () => {
      downloads++;
      files.set(uri, { size: settings.size, signature: settings.signature });
      progress({ totalBytesWritten: settings.size, totalBytesExpectedToWrite: settings.size });
      if (settings.wait) await settings.wait;
      return { uri, status: settings.status, headers: { 'Content-Length': String(settings.reportedBytes || settings.size) } };
    } }),
  };
  return { files, fileSystem, settings, downloads: () => downloads, downloader: createApkDownloader(fileSystem) };
}

const apkRelease = { version: '1.1.1', versionCode: 9, apkUrl: 'https://downloads.example.test/app-9.apk' };

test('an APK larger than 5 MB without a completion marker is never considered ready', async () => {
  const fixture = apkFixture();
  const uri = fixture.downloader.getLocalApkUri(apkRelease.version, apkRelease.versionCode);
  fixture.files.set(uri, { size: 8 * 1024 * 1024 });
  assert.equal((await fixture.downloader.isApkDownloaded(apkRelease.version, apkRelease.versionCode, apkRelease.apkUrl)).exists, false);
});

test('APK downloads become ready atomically and concurrent requests share one download', async () => {
  let finish;
  const waiting = new Promise((resolve) => { finish = resolve; });
  const fixture = apkFixture({ wait: waiting });
  const first = fixture.downloader.downloadApk(apkRelease);
  const second = fixture.downloader.downloadApk(apkRelease);
  assert.equal(first, second);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal((await fixture.downloader.isApkDownloaded(apkRelease.version, apkRelease.versionCode, apkRelease.apkUrl)).exists, false);
  finish();
  const result = await first;
  assert.equal(fixture.downloads(), 1);
  assert.equal((await fixture.downloader.downloadApk(apkRelease)).fromCache, true);
  assert.equal(fixture.downloads(), 1);
  assert.equal(result.size, fixture.settings.size);
});

test('a newer APK build of the same version cannot reuse the older downloaded binary', async () => {
  const fixture = apkFixture();
  const older = await fixture.downloader.downloadApk({ ...apkRelease, versionCode: 8, apkUrl: 'https://downloads.example.test/app-8.apk' });
  const newer = await fixture.downloader.downloadApk(apkRelease);
  assert.notEqual(newer.uri, older.uri);
  assert.equal(fixture.downloads(), 2);
  assert.equal((await fixture.downloader.isApkDownloaded(apkRelease.version, 9, apkRelease.apkUrl)).exists, true);
});

test('changed APK URLs and damaged cached files require a fresh verified download', async () => {
  const fixture = apkFixture();
  const result = await fixture.downloader.downloadApk(apkRelease);
  assert.equal((await fixture.downloader.isApkDownloaded(apkRelease.version, 9, 'https://downloads.example.test/replacement.apk')).exists, false);
  fixture.files.get(result.uri).size--;
  assert.equal((await fixture.downloader.isApkDownloaded(apkRelease.version, 9, apkRelease.apkUrl)).exists, false);
  await fixture.downloader.downloadApk(apkRelease);
  assert.equal(fixture.downloads(), 2);
});

test('incomplete and non-APK responses never produce an installable cache entry', async () => {
  for (const options of [{ reportedBytes: 24 * 1024 * 1024 }, { status: 403 }, { signature: 'PGh0bQ==' }]) {
    const fixture = apkFixture(options);
    await assert.rejects(fixture.downloader.downloadApk(apkRelease));
    assert.equal((await fixture.downloader.isApkDownloaded(apkRelease.version, 9, apkRelease.apkUrl)).exists, false);
    assert.equal([...fixture.files.keys()].some((name) => name.endsWith('.ready.json') || name.endsWith('.part')), false);
  }
});

test('background audio native patch applies once and fails clearly if SDK changes', () => {
  for (const file of ['AudioPlayer.kt', 'AudioPlaylist.kt']) {
    const source = readFileSync(new URL(`../mobile/node_modules/expo-audio/android/src/main/java/expo/modules/audio/${file}`, import.meta.url), 'utf8');
    const result = audioWakeLock.patchWakeMode(source);
    assert.equal(result.split('.setWakeMode(').length, 2);
    assert.equal(audioWakeLock.patchWakeMode(result), result);
  }
  assert.throws(() => audioWakeLock.patchWakeMode('changed builder'), /builder changed/);
});

test('native playback queue keeps the selection and excludes unplayable videos', () => {
  const selected = normalizeSong({ id: 'b', url: 'https://audio.test/b.mp3' });
  const { songs, index } = playableQueue([
    { id: 'a', url: 'https://audio.test/a.mp3' }, { id: 'bad' },
    { id: 'video', source: 'youtube', url: 'https://youtube.com/watch?v=1' }, selected,
  ], selected);
  assert.deepEqual(songs.map((song) => song.id), ['a', 'b']); assert.equal(index, 1);
  assert.equal(playableQueue([], selected).songs[0], selected);
});
test('shuffle preserves played and current tracks and keeps every future track once', () => {
  const original = ['a', 'b', 'c', 'd', 'e'];
  const shuffled = shuffledUpcoming(original, 1, () => 0);
  assert.deepEqual(shuffled.slice(0, 2), ['a', 'b']);
  assert.deepEqual(shuffled.slice(2).sort(), ['c', 'd', 'e']);
  assert.deepEqual(original, ['a', 'b', 'c', 'd', 'e']);
});

test('YouTube metadata decodes text, validates video IDs and restores saved references', () => {
  const song = normalizeYouTubeSong({ id: { videoId: 'jNQXAC9IVRw' }, snippet: { title: 'Music &amp; Melody &#39;Live&#39;', channelTitle: 'A &amp; B' }, contentDetails: { duration: 'PT1H2M3S' } });
  assert.equal(song.title, "Music & Melody 'Live'"); assert.equal(song.duration, 3723);
  assert.equal(song.artist, 'A & B'); assert.equal(song.url, 'youtube:jNQXAC9IVRw');
  assert.equal(normalizeYouTubeSong({ id: { channelId: 'invalid' } }), null);
  const stored = normalizeSong({ songId: song.id, songUrl: song.url, songName: song.title });
  assert.equal(stored.source, 'youtube'); assert.equal(isPlayable(stored), false);
  assert.equal(youtubePageUrl({ ...stored, url: 'https://server.test/youtube/audio/jNQXAC9IVRw?ticket=private' }), 'https://www.youtube.com/watch?v=jNQXAC9IVRw');
});

test('YouTube queues prepare every audio source, retain catalog tracks and keep the selected index', async () => {
  const first = normalizeSong(normalizeYouTubeSong({ id: 'jNQXAC9IVRw', title: 'First' }));
  const selected = normalizeSong(normalizeYouTubeSong({ id: '8tagabEHM3g', title: 'Second' }));
  const catalog = normalizeSong({ id: 'catalog', url: 'https://audio.test/song.mp3' });
  const prepared = await preparePlaybackQueue([first, catalog, selected, first], selected, async ({ videoIds, selectedVideoId }) => {
    assert.deepEqual(videoIds, ['jNQXAC9IVRw', '8tagabEHM3g']); assert.equal(selectedVideoId, '8tagabEHM3g');
    return videoIds.map((id) => ({ id: 'youtube_' + id, duration: 6, url: `https://server.test/youtube/audio/${id}?ticket=private` }));
  });
  assert.deepEqual(prepared.songs.map((song) => song.id), [first.id, catalog.id, selected.id]);
  assert.equal(prepared.index, 2); assert.equal(prepared.songs[2].title, 'Second');
  assert.ok(prepared.songs.every(isPlayable));
});

test('unavailable YouTube selections fail clearly while a catalog selection remains playable', async () => {
  const youtube = normalizeSong(normalizeYouTubeSong({ id: 'jNQXAC9IVRw', title: 'YouTube' }));
  const catalog = normalizeSong({ id: 'catalog', url: 'https://audio.test/song.mp3' });
  const unavailable = async () => { throw new Error('YouTube is unavailable'); };
  await assert.rejects(preparePlaybackQueue([youtube], youtube, unavailable), /YouTube is unavailable/);
  const prepared = await preparePlaybackQueue([youtube, catalog], catalog, unavailable);
  assert.deepEqual(prepared.songs.map((song) => song.id), ['catalog']);
  assert.equal(isPlayable({ ...youtube, url: 'https://youtube.com/watch?v=jNQXAC9IVRw' }), false);
  assert.equal(isPlayable({ ...youtube, url: 'https://evil.test/video.mp4' }), false);
  assert.equal(isPlayable({ id: 'catalog', url: 'https://www.jiosaavn.com/song/song/id' }), false);
  assert.equal(isPlayable({ id: 'invalid', url: 'javascript:alert(1)' }), false);
  assert.equal(isPlayable({ id: 'invalid', url: {} }), false);
});
test('artwork themes are bounded colors with readable surfaces and safe fallbacks', () => {
  for (const color of ['#000000', '#ffffff', '#fa231a', 'invalid', null]) {
    const theme = themeFromColor(color);
    for (const value of Object.values(theme)) assert.match(value, /^#[a-f0-9]{6}$/);
    assert.notEqual(theme.accent, theme.background);
  }
  assert.deepEqual(themeFromColor('invalid'), themeFromColor(null));
});

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

test('app version parser correctly parses semantic versions and normalizes missing segments', () => {
  assert.deepEqual(parseVersion('1.1.1'), [1, 1, 1]);
  assert.deepEqual(parseVersion('v2.0.5'), [2, 0, 5]);
  assert.deepEqual(parseVersion('1.2'), [1, 2, 0]);
  assert.deepEqual(parseVersion('3'), [3, 0, 0]);
  assert.deepEqual(parseVersion('v1.1.2-preview'), [1, 1, 2]);
  assert.deepEqual(parseVersion(''), [0, 0, 0]);
  assert.deepEqual(parseVersion(null), [0, 0, 0]);
});

test('version comparator detects newer native versions and build codes reliably', () => {
  // Major bump
  assert.equal(isNewerVersion('2.0.0', '1.1.1', 3, 2), true);
  // Minor bump
  assert.equal(isNewerVersion('1.2.0', '1.1.1', 3, 2), true);
  // Patch bump
  assert.equal(isNewerVersion('1.1.2', '1.1.1', 3, 2), true);
  // Same version but higher versionCode
  assert.equal(isNewerVersion('1.1.1', '1.1.1', 3, 2), true);
  // Equal version and code
  assert.equal(isNewerVersion('1.1.1', '1.1.1', 2, 2), false);
  // Lower version
  assert.equal(isNewerVersion('1.1.0', '1.1.1', 1, 2), false);
  assert.equal(isNewerVersion('1.0.5', '1.1.0', 1, 2), false);
  // Without version code provided
  assert.equal(isNewerVersion('1.1.2', '1.1.1'), true);
  assert.equal(isNewerVersion('1.1.1', '1.1.1'), false);
  assert.equal(isNewerVersion('1.1.0', '1.1.1'), false);
});
