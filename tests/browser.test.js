import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { testServer, testAudio, fixtureSong, fixtureYouTubeAudio } from './helpers.js';

let env, browser;
before(async () => { env = await testServer(); browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); await env?.close(); });

async function pageFor({ token, viewport = { width: 1365, height: 900 }, corruptedStorage = false } = {}) {
  const context = await browser.newContext({ viewport });
  const audioFixture = fixtureYouTubeAudio();
  if (token) await context.addCookies([{ name: 'token', value: token, url: env.base }]);
  // Keep test runs offline apart from the local app. Providers are replaced at the app boundary.
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.includes('audio.example.test')) {
      const { response, mimeType } = await audioFixture.open('catalog', { range: route.request().headers().range });
      return route.fulfill({ status: response.status, body: Buffer.from(await response.arrayBuffer()), contentType: mimeType,
        headers: { ...Object.fromEntries(response.headers), 'Access-Control-Allow-Origin': '*', 'Accept-Ranges': 'bytes' } });
    }
    return url.startsWith(env.base) ? route.continue() : route.fulfill({ status: 200, body: '', contentType: 'text/plain' });
  });
  if (corruptedStorage) await context.addInitScript(() => { localStorage.setItem('recentActivity', '{broken'); localStorage.setItem('searchHistory', 'null'); });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', (dialog) => dialog.dismiss());
  return { page, errors, close: () => context.close() };
}

test('desktop and mobile guest pages initialize with corrupt saved history and failed providers', async () => {
  for (const viewport of [{ width: 1365, height: 900 }, { width: 390, height: 844 }]) {
    const session = await pageFor({ viewport, corruptedStorage: true });
    try {
      await session.page.goto(env.base, { waitUntil: 'networkidle' });
      assert.equal(await session.page.locator('#player').count(), 1);
      assert.deepEqual(session.errors, []);
      await session.page.screenshot({ path: `${process.env.TEST_REPORT_DIR || 'reports/deep-testing-2026-11-13'}/web-${viewport.width}.png` });
    } finally { await session.close(); }
  }
});

test('web login sets a session and navigates to the authenticated home', async () => {
  await env.createUser('browser@example.test');
  const session = await pageFor();
  try {
    await session.page.goto(env.base + '/login');
    await session.page.locator('#email').fill('browser@example.test');
    await session.page.locator('#password').fill('password123');
    await session.page.locator('#loginform').evaluate((form) => form.requestSubmit());
    await session.page.waitForURL(env.base + '/');
    await session.page.waitForLoadState('networkidle');
    assert.equal(await session.page.evaluate(() => sess), true);
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); }
});

test('signup verifies OTP on server and opens the password form without script errors', async () => {
  const session = await pageFor();
  try {
    await session.page.goto(env.base + '/signup');
    await session.page.locator('#email').fill('websignup@example.test');
    await session.page.locator('#signup').evaluate((form) => form.requestSubmit());
    await session.page.waitForFunction(() => document.querySelector('.OTP').style.display === 'block');
    const code = env.outbox.at(-1).code;
    for (let i = 0; i < code.length; i++) await session.page.locator('.otp-input').nth(i).fill(code[i]);
    await session.page.locator('#getOTP').evaluate((form) => form.requestSubmit());
    await session.page.locator('#passwordForm').waitFor();
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); }
});

test('inline search debounces requests and treats remote song metadata as text', async () => {
  const session = await pageFor();
  const original = env.services.fetchJson;
  env.services.fetchJson = async (url, ...args) => {
    if (new URL(url).pathname === '/search/songs') return { data: { results: [{ ...fixtureSong(), name: '<img src=x onerror="window.injected=true">' }] } };
    return original(url, ...args);
  };
  try {
    await session.page.goto(env.base, { waitUntil: 'networkidle' });
    let requests = 0;
    session.page.on('request', (request) => { if (request.url().includes('type=song&')) requests++; });
    await session.page.locator('#search').pressSequentially('test', { delay: 40 });
    await session.page.locator('#results li').first().waitFor();
    assert.equal(await session.page.evaluate(() => window.injected), undefined);
    assert.equal(requests, 1);
    assert.deepEqual(session.errors, []);
  } finally { env.services.fetchJson = original; await session.close(); }
});

test('playlist creation works offline and stored names cannot execute HTML', async () => {
  const { token } = await env.createUser('playlist-browser@example.test');
  const session = await pageFor({ token });
  try {
    await session.page.goto(env.base, { waitUntil: 'networkidle' });
    const created = session.page.waitForResponse((response) => response.url().endsWith('/playlistname') && response.request().method() === 'POST');
    await session.page.evaluate(() => {
      document.getElementById('playlistName').value = '<img src=x onerror="window.injected=true">';
      document.getElementById('playlistForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await created;
    await session.page.evaluate(async () => { const { fetchPlaylist } = await import('/JS/modules/playlist.js'); await fetchPlaylist(); });
    assert.equal(await session.page.evaluate(() => window.injected), undefined);
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); }
});

test('web player loads audio, pauses and seeks without unhandled errors', async () => {
  const session = await pageFor();
  try {
    await session.page.goto(env.base, { waitUntil: 'networkidle' });
    await session.page.evaluate(async (audioUrl) => {
      const { playsong } = await import('/JS/modules/player.js');
      await playsong('/css/logo.png', 'Playback Test', 'Test Artist', 'playback-test', audioUrl, 6, 'search');
    }, 'data:audio/wav;base64,' + testAudio.toString('base64'));
    await session.page.waitForFunction(() => document.getElementById('player').currentTime > 0.1);
    await session.page.locator('#pause-svg').click();
    assert.equal(await session.page.locator('#player').evaluate((audio) => audio.paused), true);
    await session.page.locator('#player').evaluate((audio) => new Promise((resolve) => {
      audio.addEventListener('seeked', resolve, { once: true }); audio.currentTime = 3;
    }));
    const position = await session.page.locator('#player').evaluate((audio) => audio.currentTime);
    assert.ok(position >= 2.99, 'Seeked audio position: ' + position);
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); }
});

test('browser logout submits POST, clears the cookie and revokes token replay', async () => {
  const { token } = await env.createUser('logout-browser@example.test');
  const session = await pageFor({ token });
  try {
    await session.page.goto(env.base, { waitUntil: 'networkidle' });
    const response = session.page.waitForResponse((r) => r.url().endsWith('/logout') && r.request().method() === 'POST');
    await session.page.locator('form[action="/logout"]').evaluate((form) => form.requestSubmit());
    assert.equal((await response).status(), 303);
    await session.page.waitForFunction(() => sess === false);
    assert.equal((await session.page.context().cookies()).some((cookie) => cookie.name === 'token'), false);
    assert.equal((await env.request('/userprofile', { token })).status, 401);
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); }
});

test('artist profile and favorite lookup use the backend without exposing provider config', async () => {
  const { token } = await env.createUser('provider-browser@example.test');
  await env.request('/addArtist', { method: 'POST', body: { id: 123 }, token });
  const session = await pageFor({ token });
  try {
    await session.page.goto(env.base, { waitUntil: 'networkidle' });
    await session.page.evaluate(async () => {
      const { openProfilePage } = await import('/JS/modules/social.js');
      await openProfilePage();
      const { addSearchSongFavorite } = await import('/JS/modules/favorites.js');
      await addSearchSongFavorite(new Event('click'), 0, 'track-1');
    });
    await session.page.locator('#profilePageArtist').getByText('Test Artist', { exact: true }).waitFor();
    const favorites = await env.request('/get-favorite', { token });
    assert.equal(favorites.data.arr[0].songId, 'track-1');
    assert.equal((await env.request('/url')).status, 404);
    assert.deepEqual(session.errors, []);
  } finally { await session.close(); }
});
