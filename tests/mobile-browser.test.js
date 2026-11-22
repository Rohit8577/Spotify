import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import { testServer, fixtureSong, fixtureYouTubeSong, fixtureYouTubeAudio } from './helpers.js';
import { HttpError } from '../utils/http.js';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const reportDirectory = path.resolve(projectRoot, process.env.TEST_REPORT_DIR || 'reports/mobile-repair-2026-11-18');
const mobileDist = path.join(projectRoot, 'mobile/dist');

let env, browser, frontend, mobileUrl;
before(async () => {
  await mkdir(reportDirectory, { recursive: true });
  env = await testServer();
  const app = express();
  app.use(express.static(mobileDist));
  app.get('*', (req, res) => res.sendFile(path.join(mobileDist, 'index.html')));
  frontend = await new Promise((resolve) => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  mobileUrl = `http://127.0.0.1:${frontend.address().port}`;
  env.app.locals.trustedOrigins.add(mobileUrl);
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); await new Promise((resolve) => frontend?.close(resolve)); await env?.close(); });

async function mobilePage(account) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const audioFixture = fixtureYouTubeAudio();
  await context.addInitScript(({ backend, account }) => {
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { window.testAudioElement = this; return originalPlay.call(this); };
    localStorage.setItem('@sangeetx_server_url', backend);
    if (account) {
      localStorage.setItem('@sangeetx_token', account.token);
      localStorage.setItem('@sangeetx_user', JSON.stringify(account.user));
    }
  }, { backend: env.base, account: account ? { token: account.token, user: { id: String(account.user._id), email: account.user.email, name: account.user.name } } : null });
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.includes('audio.example.test')) {
      const { response, mimeType } = await audioFixture.open('catalog', { range: route.request().headers().range });
      return route.fulfill({ status: response.status, body: Buffer.from(await response.arrayBuffer()), contentType: mimeType,
        headers: { ...Object.fromEntries(response.headers), 'Access-Control-Allow-Origin': '*', 'Accept-Ranges': 'bytes' } });
    }
    return url.startsWith(env.base) || url.startsWith(mobileUrl) ? route.continue() : route.fulfill({ status: 200, body: '' });
  });
  const page = await context.newPage();
  const errors = [];
  const dialogs = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.accept().catch(() => {});
  });
  return { page, errors, dialogs, close: () => context.close() };
}

function youtubeFixture() {
  const originalFetch = env.services.fetchJson;
  const originalAudio = env.services.youtube;
  const originalKey = process.env.YOUTUBE_API_KEY;
  process.env.YOUTUBE_API_KEY = 'isolated-youtube-test-key';
  const tracks = [fixtureYouTubeSong('jNQXAC9IVRw', 'YouTube Song &amp; Melody'), fixtureYouTubeSong('8tagabEHM3g', 'YouTube Song 2')];
  const audio = fixtureYouTubeAudio();
  env.services.youtube = audio;
  env.services.fetchJson = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname === '/youtube/v3/search') return { items: tracks };
    if (parsed.pathname === '/youtube/v3/videos') return { items: tracks.filter((item) => item.id.videoId === parsed.searchParams.get('id'))
      .map((item) => ({ ...item, id: item.id.videoId, contentDetails: { duration: 'PT6S' } })) };
    return originalFetch(url);
  };
  return { audio, restore: () => {
    env.services.fetchJson = originalFetch;
    if (originalAudio) env.services.youtube = originalAudio; else delete env.services.youtube;
    if (originalKey === undefined) delete process.env.YOUTUBE_API_KEY; else process.env.YOUTUBE_API_KEY = originalKey;
  } };
}

async function settleBrowser(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function dragSlider(page, label, fraction) {
  const slider = page.getByLabel(label, { exact: true });
  await slider.scrollIntoViewIfNeeded();
  await settleBrowser(page);
  const box = await slider.boundingBox();
  const thumb = await slider.locator(':scope > div').nth(1).boundingBox();
  assert.ok(box, `${label} must be visible`);
  assert.ok(thumb, `${label} thumb must be visible`);
  const x = box.x + box.width * fraction;
  const y = thumb.y + thumb.height / 2;
  await page.mouse.move(thumb.x + thumb.width / 2, y);
  await page.mouse.down(); await page.mouse.move(x, y, { steps: 12 }); await page.mouse.up();
}

async function verifyIconFont(page, minimumIcons) {
  const result = await page.evaluate(() => ({
    loaded: Array.from(document.fonts).some((font) => font.family.replace(/["']/g, '') === 'ionicons' && font.status === 'loaded'),
    icons: Array.from(document.querySelectorAll('[style*="font-family: ionicons"]')).filter((icon) => {
      const box = icon.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && icon.textContent.codePointAt(0) >= 0xe000;
    }).length,
  }));
  assert.equal(result.loaded, true, 'The icon font file must be loaded by the browser');
  assert.ok(result.icons >= minimumIcons, `Expected at least ${minimumIcons} visible icons, found ${result.icons}`);
}

test('mobile waits for the icon font before showing login controls', async () => {
  const session = await mobilePage();
  let releaseFont;
  const fontReady = new Promise((resolve) => { releaseFont = resolve; });
  const fontRequested = session.page.waitForRequest(/Ionicons[^/]*\.ttf/);
  await session.page.route(/Ionicons[^/]*\.ttf/, async (route) => {
    await fontReady;
    await route.continue();
  });
  try {
    await session.page.goto(mobileUrl + '/Login', { waitUntil: 'domcontentloaded' });
    await fontRequested;
    await expect(session.page.getByLabel('Loading SangeetX')).toBeVisible();
    await expect(session.page.getByPlaceholder('Email address')).toBeHidden();
    releaseFont();
    await session.page.getByPlaceholder('Email address').waitFor();
    await verifyIconFont(session.page, 5);
    assert.deepEqual(session.errors, []);
    await session.page.screenshot({ path: path.join(reportDirectory, 'icons-login.png') });
  } finally { releaseFont(); await session.close(); }
});

test('mobile recovers from a failed icon font request through retry', async () => {
  const session = await mobilePage();
  let requests = 0;
  await session.page.route(/Ionicons[^/]*\.ttf/, (route) => ++requests === 1 ? route.abort('failed') : route.continue());
  try {
    await session.page.goto(mobileUrl + '/Login');
    await session.page.getByText("SangeetX couldn't finish loading. Please try again.").waitFor();
    await expect(session.page.getByPlaceholder('Email address')).toBeHidden();
    await session.page.getByRole('button', { name: 'Try again', exact: true }).click();
    await session.page.getByPlaceholder('Email address').waitFor();
    await verifyIconFont(session.page, 5);
    assert.ok(requests >= 2, 'Retry must fetch the failed font again');
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); }
});

test('Expo mobile web boots and email login navigates to home', async () => {
  await env.createUser('mobile-login@example.test');
  const session = await mobilePage();
  try {
    await session.page.goto(mobileUrl + '/Login');
    await session.page.getByPlaceholder('Email address').fill('mobile-login@example.test');
    await session.page.getByPlaceholder('Password', { exact: true }).fill('password123');
    await session.page.getByText('Log In', { exact: true }).click();
    await session.page.waitForURL('**/Home');
    await session.page.getByText('Test Song', { exact: true }).first().waitFor();
    await session.page.getByText('Test Song', { exact: true }).first().click();
    await session.page.waitForFunction(() => window.testAudioElement?.currentTime > 0.1);
    await verifyIconFont(session.page, 9);
    assert.deepEqual(session.errors, []);
    await session.page.screenshot({ path: path.join(reportDirectory, 'expo-mobile-home.png') });
  } finally { await session.close(); }
});

test('mobile song search renders catalog images and router back restores artist parameters', async () => {
  const account = await env.createUser('mobile-browser@example.test');
  const session = await mobilePage(account);
  try {
    await session.page.goto(mobileUrl + '/ArtistDetail?artistId=123&name=Test%20Artist');
    await session.page.getByText('Test Album', { exact: true }).click();
    await session.page.waitForURL('**/AlbumDetail?**');
    await session.page.getByText('Test Song', { exact: true }).first().waitFor();
    await session.page.goBack();
    assert.match(session.page.url(), /artistId=123/);
    await session.page.getByText('Test Album', { exact: true }).waitFor();
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); }
});

test('invalid cached mobile token returns to login instead of remaining signed in', async () => {
  const session = await mobilePage({ token: 'expired', user: { _id: 'invalid', email: 'expired@example.test', name: 'Expired' } });
  try {
    await session.page.goto(mobileUrl + '/Home');
    await session.page.waitForURL('**/Login');
    await session.page.getByPlaceholder('Email address').waitFor();
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); }
});

test('mobile native-playlist API advances through five songs with current media metadata', async () => {
  const originalFetch = env.services.fetchJson;
  const tracks = Array.from({ length: 5 }, (_, index) => ({ ...fixtureSong(`queue-${index}`), name: `Queue Song ${index + 1}` }));
  env.services.fetchJson = async (url) => {
    if (new URL(url).pathname === '/modules') return { data: { trending: { data: tracks }, artist_recos: { data: [] }, charts: { data: [] }, albums: { data: [] }, playlists: { data: [] } } };
    if (new URL(url).pathname === '/song/recommend') return { data: [] };
    return originalFetch(url);
  };
  const session = await mobilePage(await env.createUser('queue-test@example.test'));
  try {
    await session.page.goto(mobileUrl + '/Home');
    await session.page.getByText('Queue Song 1', { exact: true }).first().click();
    for (let index = 1; index <= 5; index++) {
      await session.page.waitForFunction((title) => navigator.mediaSession?.metadata?.title === title && window.testAudioElement?.currentTime > 0, `Queue Song ${index}`);
      const media = await session.page.evaluate(() => ({ title: navigator.mediaSession.metadata.title, duration: window.testAudioElement.duration, paused: window.testAudioElement.paused }));
      assert.equal(media.paused, false); assert.equal(media.duration, 6);
      if (index < 5) await session.page.evaluate(() => { window.testAudioElement.currentTime = 5.8; });
    }
    assert.deepEqual(session.errors, []);
  } finally { env.services.fetchJson = originalFetch; await session.close(); }
});

test('mobile signup verifies email, creates a real account and restores the session', async () => {
  const session = await mobilePage();
  const email = 'mobile-signup@example.test';
  try {
    await session.page.goto(mobileUrl + '/Signup');
    await session.page.getByPlaceholder('Enter email').fill(email);
    const sent = session.page.waitForResponse((response) => response.url() === env.base + '/send-otp');
    await session.page.getByText('Send Verification Code', { exact: true }).click();
    assert.equal((await sent).status(), 200);
    await session.page.getByPlaceholder('1234').fill(env.outbox.findLast((message) => message.email === email).code);
    await session.page.getByText('Verify Code & Continue', { exact: true }).click();
    await session.page.getByPlaceholder('Your Name').fill('Mobile Signup');
    await session.page.getByPlaceholder('At least 6 characters').fill('signup-password123');
    await session.page.getByText('Finish & Start Listening', { exact: true }).click();
    await session.page.waitForURL('**/Home');
    await session.page.reload();
    await session.page.getByText('Test Song', { exact: true }).first().waitFor();
    const token = await session.page.evaluate(() => localStorage.getItem('@sangeetx_token'));
    assert.equal((await env.request('/userprofile', { token })).data.email, email);
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); }
});

test('mobile artist follow survives reload and unfollow removes it from the profile', async () => {
  const account = await env.createUser('mobile-follow@example.test');
  const session = await mobilePage(account);
  try {
    await session.page.goto(mobileUrl + '/ArtistDetail?artistId=123&name=Test%20Artist');
    await session.page.getByText('Follow', { exact: true }).click();
    await session.page.getByText('Following', { exact: true }).waitFor();
    await session.page.reload();
    await session.page.getByText('Following', { exact: true }).click();
    await session.page.getByText('Follow', { exact: true }).waitFor();
    assert.deepEqual((await env.request('/userprofile', { token: account.token })).data.artist, []);
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); }
});

test('mobile password reset returns to login and revokes the previous session', async () => {
  const account = await env.createUser('mobile-reset@example.test');
  const session = await mobilePage();
  try {
    await session.page.goto(mobileUrl + '/ForgotPassword');
    await session.page.getByPlaceholder('Registered email').fill(account.user.email);
    await session.page.getByText('Find Account', { exact: true }).click();
    await session.page.getByPlaceholder('4-digit email code').waitFor();
    await session.page.getByPlaceholder('4-digit email code').fill(env.outbox.findLast((message) => message.email === account.user.email).code);
    await session.page.getByPlaceholder('New password', { exact: true }).fill('reset-password123');
    await session.page.getByPlaceholder('Confirm new password').fill('reset-password123');
    await session.page.getByText('Update Password', { exact: true }).click();
    await session.page.waitForURL('**/Login');
    assert.equal((await env.request('/userprofile', { token: account.token })).status, 401);
    await session.page.getByPlaceholder('Email address').fill(account.user.email);
    await session.page.getByPlaceholder('Password', { exact: true }).fill('reset-password123');
    await session.page.getByText('Log In', { exact: true }).click();
    await session.page.waitForURL('**/Home');
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); }
});

test('mobile search, shared Like controls and playlist save persist through the backend', async () => {
  const account = await env.createUser('mobile-library@example.test');
  const session = await mobilePage(account);
  try {
    await session.page.goto(mobileUrl + '/Library');
    await session.page.getByLabel('Create playlist', { exact: true }).click();
    await session.page.getByPlaceholder('My Playlist #1').fill('Mobile Favorites');
    await session.page.getByText('Create', { exact: true }).click();
    await session.page.getByText('Mobile Favorites', { exact: true }).waitFor();
    await session.page.getByText('Search', { exact: true }).click();
    await session.page.getByPlaceholder('What do you want to listen to?').fill('Test Song');
    await session.page.getByText('Test Song', { exact: true }).first().click();
    await session.page.getByLabel('Like song', { exact: true }).click();
    await session.page.getByLabel('Unlike song', { exact: true }).waitFor();
    await session.page.getByLabel('Open player', { exact: true }).click();
    await session.page.getByLabel('Unlike song', { exact: true }).last().click();
    await session.page.getByLabel('Like song', { exact: true }).last().waitFor();
    await session.page.getByText('Save', { exact: true }).click();
    await session.page.getByText('Mobile Favorites', { exact: true }).click();
    await session.page.getByLabel('Open player', { exact: true }).click();
    await session.page.getByLabel('Close player', { exact: true }).click();
    await session.page.getByText('Library', { exact: true }).click();
    await session.page.getByText('Mobile Favorites', { exact: true }).click();
    await session.page.getByText('Test Song', { exact: true }).first().waitFor();
    const saved = await env.request('/librarySongs', { method: 'POST', body: { pname: 'Mobile Favorites' }, token: account.token });
    assert.equal(saved.data.arr[0].songId, 'track-1');
    assert.equal((await env.request('/get-favorite', { token: account.token })).data.arr.length, 0);
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); }
});

test('mobile accepts a friend request and chat sends acknowledged persistent messages', async () => {
  const sender = await env.createUser('mobile-chat-sender@example.test');
  const recipient = await env.createUser('mobile-chat-recipient@example.test');
  await env.request('/sendFriendRequest', { method: 'POST', body: { friendId: sender.user.email }, token: recipient.token });
  const session = await mobilePage(sender);
  let friendSession;
  try {
    await session.page.goto(mobileUrl + '/Social');
    await session.page.getByText('Accept', { exact: true }).click();
    await session.page.getByText('My Friends (1)', { exact: true }).click();
    await session.page.getByText(recipient.user.email, { exact: true }).click();
    await session.page.waitForURL('**/Chat?**');
    await session.page.getByPlaceholder('Type a message...').fill('Hello from the Expo app');
    await session.page.getByLabel('Send message', { exact: true }).click();
    await expect(session.page.getByPlaceholder('Type a message...')).toHaveValue('');
    await session.page.getByText('Hello from the Expo app', { exact: true }).waitFor();
    const history = await env.request('/chat/history/' + sender.user.email, { token: recipient.token });
    assert.equal(history.data.at(-1).content, 'Hello from the Expo app');
    friendSession = await mobilePage(recipient);
    await friendSession.page.goto(mobileUrl + '/Home');
    await friendSession.page.getByText('Test Song', { exact: true }).first().waitFor();
    await session.page.getByText('Home', { exact: true }).click();
    await session.page.getByText('Test Song', { exact: true }).first().click();
    await session.page.getByLabel('Open player', { exact: true }).click();
    await session.page.getByText('Friend', { exact: true }).click();
    await session.page.getByText(recipient.user.email, { exact: true }).click();
    await friendSession.page.getByText(/shared a song with you!/).waitFor();
    await expect.poll(() => session.dialogs.some((message) => message.startsWith('Song Shared'))).toBe(true);
    assert.deepEqual(session.errors, []);
    assert.deepEqual(friendSession.errors, []);
  } finally { await friendSession?.close(); await session.close(); }
});

test('mobile AI mix generates playable tracks and saves the complete mix in the library', async () => {
  const account = await env.createUser('mobile-ai@example.test');
  const session = await mobilePage(account);
  try {
    await session.page.goto(mobileUrl + '/AiDj');
    await session.page.getByPlaceholder('Describe your vibe (e.g. Chill Punjabi lofi for study)').fill('Evening chill');
    await session.page.getByLabel('Generate playlist', { exact: true }).click();
    await session.page.getByText('Test Song', { exact: true }).first().waitFor();
    await session.page.getByText('Play All', { exact: true }).click();
    await session.page.waitForFunction(() => window.testAudioElement?.currentTime > 0);
    const saved = session.page.waitForResponse((response) => response.url() === env.base + '/songinfo');
    await session.page.getByText('Save', { exact: true }).click();
    assert.equal((await saved).status(), 200);
    await session.page.getByText('Library', { exact: true }).click();
    await session.page.getByText('AI Mix: Evening chill', { exact: true }).click();
    await session.page.getByText('Test Song', { exact: true }).first().waitFor();
    await session.page.goto(mobileUrl + '/AskAi');
    await session.page.getByPlaceholder('Ask about music, trivia, recommendations...').fill('Suggest a song');
    await session.page.getByLabel('Send to AI', { exact: true }).click();
    await session.page.getByText(/"vibeCheck":"Test mix"/).waitFor();
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); }
});

test('mobile logout confirms, stops playback, clears credentials and revokes the session', async () => {
  const account = await env.createUser('mobile-logout@example.test');
  const session = await mobilePage(account);
  try {
    await session.page.goto(mobileUrl + '/Home');
    await session.page.getByText('Test Song', { exact: true }).first().click();
    await session.page.waitForFunction(() => window.testAudioElement?.currentTime > 0);
    await session.page.getByText('Library', { exact: true }).click();
    await session.page.getByLabel('Open profile', { exact: true }).click();
    await session.page.getByText('Log Out', { exact: true }).click();
    await session.page.waitForURL('**/Login');
    assert.equal(await session.page.evaluate(() => localStorage.getItem('@sangeetx_token')), null);
    assert.equal((await env.request('/userprofile', { token: account.token })).status, 401);
    assert.equal(await session.page.evaluate(() => window.testAudioElement.paused), true);
    assert.ok(session.dialogs.some((message) => message.includes('Are you sure')));
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); }
});

test('YouTube search plays an audio queue inside the app with no video or external navigation', async () => {
  const fixture = youtubeFixture();
  const session = await mobilePage(await env.createUser('youtube-mobile@example.test'));
  const popups = [];
  session.page.on('popup', (popup) => popups.push(popup.url()));
  try {
    await session.page.goto(mobileUrl + '/Search');
    await session.page.getByText('YouTube', { exact: true }).click();
    await session.page.getByPlaceholder('What do you want to listen to?').fill('music');
    const first = session.page.getByText('YouTube Song & Melody', { exact: true }).first();
    await first.waitFor();
    const prepared = session.page.waitForRequest((request) => request.url() === env.base + '/youtube/resolve');
    await first.click();
    const body = (await prepared).postDataJSON();
    assert.deepEqual(body.videoIds, ['jNQXAC9IVRw', '8tagabEHM3g']);
    await session.page.waitForFunction(() => window.testAudioElement?.currentTime > 0.2 && navigator.mediaSession?.metadata?.title === 'YouTube Song & Melody');
    await session.page.getByLabel('Open player', { exact: true }).click();
    await session.page.getByText('YOUTUBE', { exact: true }).waitFor();
    await session.page.getByLabel('Next song', { exact: true }).last().click();
    await session.page.waitForFunction(() => window.testAudioElement?.currentTime > 0.1 && navigator.mediaSession?.metadata?.title === 'YouTube Song 2');
    const liked = session.page.waitForResponse((response) => response.url() === env.base + '/favorite');
    await session.page.getByLabel('Like song', { exact: true }).last().click(); await liked;
    const favorites = (await env.request('/get-favorite', { token: (await session.page.evaluate(() => localStorage.getItem('@sangeetx_token'))) })).data.arr;
    assert.equal(favorites[0].songId, 'youtube_8tagabEHM3g'); assert.equal(favorites[0].len, 6);
    await session.page.getByLabel('Previous song', { exact: true }).click();
    await session.page.waitForFunction(() => navigator.mediaSession?.metadata?.title === 'YouTube Song & Melody');
    assert.match(await session.page.evaluate(() => window.testAudioElement.src), /\/youtube\/audio\//);
    assert.equal(await session.page.locator('video, iframe[src*="youtube"]').count(), 0);
    assert.match(session.page.url(), /\/Search$/); assert.deepEqual(popups, []);
    assert.ok(fixture.audio.requests.some((request) => request.id === '8tagabEHM3g'));
    assert.deepEqual(session.errors, []);
    await session.page.screenshot({ path: path.join(reportDirectory, 'youtube-audio-player.png') });
  } finally { await session.close(); fixture.restore(); }
});

test('YouTube likes and playlist saves replay with fresh tickets after navigation and reload', async () => {
  const fixture = youtubeFixture();
  const account = await env.createUser('youtube-library@example.test');
  await env.request('/playlistname', { method: 'POST', token: account.token, body: { name: 'YouTube Mix' } });
  const session = await mobilePage(account);
  let resolutions = 0;
  fixture.audio.resolve = async () => { resolutions++; return { duration: 6 }; };
  try {
    await session.page.goto(mobileUrl + '/Search');
    await session.page.getByText('YouTube', { exact: true }).click();
    await session.page.getByPlaceholder('What do you want to listen to?').fill('music');
    await session.page.getByText('YouTube Song & Melody', { exact: true }).first().click();
    await session.page.waitForFunction(() => window.testAudioElement?.currentTime > 0.1);
    await session.page.getByLabel('Pause', { exact: true }).first().click();
    const liked = session.page.waitForResponse((response) => response.url() === env.base + '/favorite');
    await session.page.getByLabel('Like song', { exact: true }).first().click();
    assert.equal((await liked).status(), 200);
    await session.page.getByLabel('Open player', { exact: true }).click();
    await session.page.getByText('Save', { exact: true }).click();
    const saved = session.page.waitForResponse((response) => response.url() === env.base + '/songinfo');
    await session.page.getByText('YouTube Mix', { exact: true }).click();
    assert.equal((await saved).status(), 200);
    const favorites = (await env.request('/get-favorite', { token: account.token })).data.arr;
    assert.equal(favorites[0].songUrl, 'youtube:jNQXAC9IVRw');
    await session.page.getByText('Library', { exact: true }).click();
    await session.page.getByText('YouTube Mix', { exact: true }).click();
    await session.page.getByLabel('Play YouTube Song & Melody', { exact: true }).click();
    await session.page.waitForFunction(() => window.testAudioElement?.currentTime > 0.1 && !window.testAudioElement.paused);
    await session.page.goto(mobileUrl + '/LikedSongs');
    await session.page.getByLabel('Play YouTube Song & Melody', { exact: true }).click();
    await session.page.waitForFunction(() => window.testAudioElement?.currentTime > 0.1);
    assert.ok(resolutions >= 3); assert.deepEqual(session.errors, []);
  } finally { await session.close(); fixture.restore(); }
});

test('a slow YouTube resolution cannot replace a more recently selected song', async () => {
  const fixture = youtubeFixture();
  const session = await mobilePage(await env.createUser('youtube-race@example.test'));
  let completeFirst;
  fixture.audio.resolve = async (id) => id === 'jNQXAC9IVRw' ? new Promise((resolve) => { completeFirst = () => resolve({ duration: 6 }); }) : { duration: 6 };
  try {
    await session.page.goto(mobileUrl + '/Search');
    await session.page.getByText('YouTube', { exact: true }).click();
    await session.page.getByPlaceholder('What do you want to listen to?').fill('music');
    const firstResponse = session.page.waitForResponse((response) => response.url() === env.base + '/youtube/resolve' && response.request().postDataJSON().selectedVideoId === 'jNQXAC9IVRw');
    const firstRequest = session.page.waitForRequest((request) => request.url() === env.base + '/youtube/resolve');
    await session.page.getByText('YouTube Song & Melody', { exact: true }).first().click();
    await firstRequest;
    await session.page.getByText('YouTube Song 2', { exact: true }).first().click();
    await session.page.waitForFunction(() => window.testAudioElement?.currentTime > 0.1 && navigator.mediaSession?.metadata?.title === 'YouTube Song 2');
    completeFirst();
    await (await firstResponse).finished(); await settleBrowser(session.page);
    assert.equal(await session.page.evaluate(() => navigator.mediaSession.metadata.title), 'YouTube Song 2');
    assert.deepEqual(session.dialogs, []); assert.deepEqual(session.errors, []);
  } finally { completeFirst?.(); await session.close(); fixture.restore(); }
});

test('unavailable YouTube audio gives an in-app error and direct links retain valid metadata', async () => {
  const fixture = youtubeFixture();
  const session = await mobilePage(await env.createUser('youtube-unavailable@example.test'));
  fixture.audio.resolve = async () => { throw new HttpError(503, 'YouTube audio is unavailable on this server.'); };
  const popups = [];
  session.page.on('popup', () => popups.push(true));
  try {
    await session.page.goto(mobileUrl + '/Search');
    await session.page.getByText('YouTube', { exact: true }).click();
    await session.page.getByPlaceholder('What do you want to listen to?').fill('https://youtu.be/jNQXAC9IVRw');
    const dialog = session.page.waitForEvent('dialog');
    await session.page.getByText('YouTube Song & Melody', { exact: true }).first().click();
    assert.match((await dialog).message(), /YouTube audio is unavailable/);
    assert.equal(await session.page.evaluate(() => Boolean(window.testAudioElement)), false);
    assert.deepEqual(popups, []); assert.deepEqual(session.errors, []);
  } finally { await session.close(); fixture.restore(); }
});

test('failed search offers a working retry and changing the category clears previous results', async () => {
  const originalFetch = env.services.fetchJson;
  let attempts = 0;
  env.services.fetchJson = async (url) => {
    if (new URL(url).pathname === '/search/songs' && ++attempts === 1) throw new HttpError(502, 'Provider unavailable');
    return originalFetch(url);
  };
  const session = await mobilePage(await env.createUser('search-retry@example.test'));
  try {
    await session.page.goto(mobileUrl + '/Search');
    await session.page.getByPlaceholder('What do you want to listen to?').fill('retry');
    await session.page.getByText('Search could not load. Check your connection and try again.', { exact: true }).waitFor();
    await session.page.getByLabel('Retry search', { exact: true }).click();
    await session.page.getByText('Test Song', { exact: true }).first().waitFor();
    await session.page.getByText('Albums', { exact: true }).click();
    await expect(session.page.getByText('Test Song', { exact: true })).toHaveCount(0);
    assert.equal(attempts, 2); assert.deepEqual(session.errors, []);
  } finally { await session.close(); env.services.fetchJson = originalFetch; }
});

test('late search responses cannot replace a new query or repopulate a cleared search', async () => {
  const originalFetch = env.services.fetchJson;
  let releaseOld;
  env.services.fetchJson = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname === '/search/songs' && parsed.searchParams.get('q') === 'slow') return new Promise((resolve) => {
      releaseOld = () => resolve({ data: { results: [{ ...fixtureSong('old'), name: 'Old Query Song' }] } });
    });
    return originalFetch(url);
  };
  const session = await mobilePage(await env.createUser('search-race@example.test'));
  try {
    await session.page.goto(mobileUrl + '/Search');
    const input = session.page.getByPlaceholder('What do you want to listen to?');
    const request = session.page.waitForRequest((request) => request.url().includes('query=slow'));
    const response = session.page.waitForResponse((response) => response.url().includes('query=slow'));
    await input.fill('slow'); await request; await input.fill('current');
    await session.page.getByText('Test Song', { exact: true }).first().waitFor();
    releaseOld(); await (await response).finished(); await settleBrowser(session.page);
    assert.equal(await session.page.getByText('Old Query Song', { exact: true }).count(), 0);
    await input.fill('');
    await session.page.getByText('Browse All Genres', { exact: true }).waitFor();
    assert.equal(await session.page.getByText('Test Song', { exact: true }).count(), 0);
    assert.deepEqual(session.errors, []);
  } finally { releaseOld?.(); await session.close(); env.services.fetchJson = originalFetch; }
});

test('valid lyrics render even when the provider omits a status field', async () => {
  const session = await mobilePage(await env.createUser('lyrics-mobile@example.test'));
  try {
    await session.page.goto(mobileUrl + '/Home');
    await session.page.getByText('Test Song', { exact: true }).first().click();
    await session.page.waitForFunction(() => window.testAudioElement?.currentTime > 0.1);
    await session.page.getByLabel('Open player', { exact: true }).click();
    await session.page.getByText('Lyrics', { exact: true }).click();
    await session.page.getByText('Test lyrics', { exact: true }).waitFor({ timeout: 5000 });
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); }
});

test('closing and reopening lyrics ignores an earlier response that arrives late', async () => {
  const originalFetch = env.services.fetchJson;
  let releaseFirst, requests = 0;
  env.services.fetchJson = async (url) => {
    if (new URL(url).pathname === '/get/lyrics') {
      if (++requests === 1) return new Promise((resolve) => { releaseFirst = () => resolve({ data: { lyrics: 'Old lyrics' } }); });
      return { data: { lyrics: 'Current lyrics' } };
    }
    return originalFetch(url);
  };
  const session = await mobilePage(await env.createUser('lyrics-race@example.test'));
  try {
    await session.page.goto(mobileUrl + '/Home');
    await session.page.getByText('Test Song', { exact: true }).first().click();
    await session.page.waitForFunction(() => window.testAudioElement?.currentTime > 0.1);
    await session.page.getByLabel('Pause', { exact: true }).first().click();
    await session.page.getByLabel('Open player', { exact: true }).click();
    const request = session.page.waitForRequest((request) => request.url().includes('type=lyrics'));
    const response = session.page.waitForResponse((response) => response.url().includes('type=lyrics'));
    await session.page.getByText('Lyrics', { exact: true }).click(); await request;
    await session.page.getByLabel('Close lyrics', { exact: true }).click();
    await session.page.getByLabel('Open player', { exact: true }).click();
    await session.page.getByText('Lyrics', { exact: true }).click();
    await session.page.getByText('Current lyrics', { exact: true }).waitFor();
    releaseFirst(); await (await response).finished(); await settleBrowser(session.page);
    assert.equal(await session.page.getByText('Old lyrics', { exact: true }).count(), 0);
    assert.deepEqual(session.errors, []);
  } finally { releaseFirst?.(); await session.close(); env.services.fetchJson = originalFetch; }
});

test('player buttons and sliders preserve volume, seek, queue order and repeat state', async () => {
  const originalFetch = env.services.fetchJson;
  const tracks = Array.from({ length: 3 }, (_, index) => ({ ...fixtureSong(`controls-${index}`), name: `Player Track ${index + 1}` }));
  env.services.fetchJson = async (url) => {
    if (new URL(url).pathname === '/modules') return { data: { trending: { data: tracks } } };
    if (new URL(url).pathname === '/song/recommend') return { data: [] };
    return originalFetch(url);
  };
  const session = await mobilePage(await env.createUser('player-controls@example.test'));
  try {
    await session.page.goto(mobileUrl + '/Home');
    await session.page.getByText('Player Track 1', { exact: true }).first().click();
    await session.page.waitForFunction(() => window.testAudioElement?.currentTime > 0.1);
    await session.page.getByLabel('Open player', { exact: true }).click();
    await session.page.getByLabel('Pause', { exact: true }).last().click();
    await session.page.waitForFunction(() => window.testAudioElement.paused);
    await session.page.getByLabel('Shuffle off', { exact: true }).click();
    await session.page.getByLabel('Shuffle on', { exact: true }).waitFor();
    await verifyIconFont(session.page, 14);
    await session.page.screenshot({ path: path.join(reportDirectory, 'icons-full-player.png') });
    assert.equal(await session.page.evaluate(() => navigator.mediaSession.metadata.title), 'Player Track 1');
    await session.page.getByLabel('Shuffle on', { exact: true }).click();
    await dragSlider(session.page, 'Volume', 0.3);
    await session.page.waitForFunction(() => window.testAudioElement.volume > 0.15 && window.testAudioElement.volume < 0.45);
    await dragSlider(session.page, 'Seek position', 0.5);
    await session.page.waitForFunction(() => window.testAudioElement.currentTime > 2 && window.testAudioElement.currentTime < 4);
    await session.page.getByLabel('Play', { exact: true }).last().click();
    await session.page.waitForFunction(() => !window.testAudioElement.paused);
    await session.page.getByLabel('Next song', { exact: true }).last().click();
    await session.page.waitForFunction(() => navigator.mediaSession.metadata.title === 'Player Track 2' && window.testAudioElement.currentTime > 0.1);
    assert.ok(await session.page.evaluate(() => window.testAudioElement.volume > 0.15 && window.testAudioElement.volume < 0.45));
    await session.page.getByLabel('Pause', { exact: true }).last().click();
    await session.page.getByLabel('Previous song', { exact: true }).click();
    await session.page.waitForFunction(() => navigator.mediaSession.metadata.title === 'Player Track 1');
    await session.page.getByLabel('Repeat: off', { exact: true }).click();
    await session.page.getByLabel('Repeat: all', { exact: true }).click();
    await session.page.getByLabel('Repeat: one', { exact: true }).click();
    await session.page.getByLabel('Repeat: off', { exact: true }).waitFor();
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); env.services.fetchJson = originalFetch; }
});

test('catalog webpage selections load actual song details before starting audio', async () => {
  const originalFetch = env.services.fetchJson;
  env.services.fetchJson = async (url) => {
    if (new URL(url).pathname === '/search/songs') return { data: { results: [{ id: 'preview', name: 'Preview Song', type: 'song', url: 'https://www.jiosaavn.com/song/preview/id' }] } };
    return originalFetch(url);
  };
  const session = await mobilePage(await env.createUser('song-preview@example.test'));
  try {
    await session.page.goto(mobileUrl + '/Search');
    await session.page.getByPlaceholder('What do you want to listen to?').fill('preview');
    const details = session.page.waitForRequest((request) => request.url().includes('type=songID&query=preview'));
    await session.page.getByText('Preview Song', { exact: true }).first().click();
    await details;
    await session.page.waitForFunction(() => window.testAudioElement?.currentTime > 0.1 && navigator.mediaSession?.metadata?.title === 'Test Song');
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); env.services.fetchJson = originalFetch; }
});

test('playlist rename survives reload and song removal and deletion persist', async () => {
  const account = await env.createUser('playlist-management@example.test', { library: [{ name: 'Before Rename', songs: [{
    songId: 'managed-song', songName: 'Managed Song', artist: 'Artist', songUrl: 'https://audio.example.test/song.mp3', image: '', len: 6,
  }] }] });
  const session = await mobilePage(account);
  try {
    await session.page.goto(mobileUrl + '/Library');
    await session.page.getByText('Before Rename', { exact: true }).click();
    await session.page.getByLabel('Play Managed Song', { exact: true }).waitFor();
    await session.page.getByLabel('Rename playlist', { exact: true }).click();
    await session.page.getByLabel('Playlist name', { exact: true }).fill('After Rename');
    await session.page.getByText('Save', { exact: true }).click();
    await session.page.getByText('After Rename', { exact: true }).first().waitFor();
    await session.page.reload();
    await session.page.getByLabel('Play Managed Song', { exact: true }).waitFor({ timeout: 5000 });
    await session.page.getByLabel('Song options for Managed Song', { exact: true }).click();
    await session.page.getByText('No songs in this playlist yet.', { exact: true }).waitFor();
    const removed = await env.request('/librarySongs', { method: 'POST', token: account.token, body: { pname: 'After Rename' } });
    assert.deepEqual(removed.data.arr, []);
    await session.page.getByLabel('Delete playlist', { exact: true }).click();
    await session.page.waitForURL(/\/(Library|Home)$/);
    assert.deepEqual((await env.request('/fetchplaylist', { token: account.token })).data.array, []);
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); }
});

test('mobile Ask AI receives a Gemini fallback reply when the local model is unavailable', async () => {
  const originalFetch = env.services.fetchJson;
  const originalGenerate = env.services.generateText;
  env.services.fetchJson = async (url, ...args) => {
    if (new URL(url).pathname === '/api/generate') throw new HttpError(502, 'Local model unavailable');
    return originalFetch(url, ...args);
  };
  env.services.generateText = async () => 'Arijit Singh is a playback singer.';
  const session = await mobilePage(await env.createUser('ai-fallback-mobile@example.test'));
  try {
    await session.page.goto(mobileUrl + '/AskAi');
    await session.page.getByPlaceholder('Ask about music, trivia, recommendations...').fill('Name a singer');
    await session.page.getByLabel('Send to AI', { exact: true }).click();
    await session.page.getByText('Arijit Singh is a playback singer.', { exact: true }).waitFor();
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); env.services.fetchJson = originalFetch; env.services.generateText = originalGenerate; }
});
