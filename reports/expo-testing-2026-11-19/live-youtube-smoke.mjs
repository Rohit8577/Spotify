// Explicit opt-in live check. Application accounts/data stay in temporary MongoDB.
// Catalog/YouTube metadata and audio use the configured external providers.
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import { testServer } from '../../tests/helpers.js';
import { createYouTubeService } from '../../services/youtube.js';
import { fetchJson } from '../../utils/upstream.js';
import { decodeMusicText } from '../../mobile/src/utils/youtube.js';
import { normalizeSong } from '../../mobile/src/utils/song.js';

const project = fileURLToPath(new URL('../../', import.meta.url));
const directory = fileURLToPath(new URL('./', import.meta.url));
const config = dotenv.parse(await fs.readFile(path.join(project, '.env')));
if (!config.YOUTUBE_API_KEY) throw new Error('YouTube search is not configured');
process.env.YOUTUBE_API_KEY = config.YOUTUBE_API_KEY;
const videoId = process.env.TEST_YOUTUBE_VIDEO_ID || '8tagabEHM3g';
const result = { videoId, passed: false };
const streamResponses = [], audioResponses = [], requestFailures = [];
let env, frontend, browser, page;
try {
  env = await testServer();
  const originalFetch = env.services.fetchJson;
  if (config.SAVAN_URL) process.env.SAVAN_URL = config.SAVAN_URL;
  const musicHost = config.SAVAN_URL ? new URL(config.SAVAN_URL).hostname : null;
  env.services.fetchJson = (url, ...options) => ['www.googleapis.com', musicHost].includes(new URL(url).hostname) ? fetchJson(url, ...options) : originalFetch(url);
  const service = createYouTubeService();
  env.services.youtube = { resolve: service.resolve, open: async (id, options) => {
    const response = await service.open(id, options);
    streamResponses.push({ status: response.response.status, mimeType: response.mimeType, range: options.range || null });
    return response;
  } };
  const app = express();
  app.use(express.static(path.join(project, 'mobile/dist')));
  app.get('*', (_req, res) => res.sendFile(path.join(project, 'mobile/dist/index.html')));
  frontend = await new Promise((resolve) => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  const mobileUrl = `http://127.0.0.1:${frontend.address().port}`;
  env.app.locals.trustedOrigins.add(mobileUrl);
  const account = await env.createUser('youtube-live-isolated@example.test');
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(({ backend, token, user }) => {
    localStorage.setItem('@sangeetx_server_url', backend);
    localStorage.setItem('@sangeetx_token', token);
    localStorage.setItem('@sangeetx_user', JSON.stringify(user));
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { window.testAudioElement = this; return play.call(this); };
  }, { backend: env.base, token: account.token, user: { id: String(account.user._id), email: account.user.email, name: account.user.name } });
  await context.route('**/*', (route) => {
    const url = route.request().url();
    const host = new URL(url).hostname;
    if (url.startsWith(env.base) || url.startsWith(mobileUrl) || url.startsWith('https://i.ytimg.com/') || host === 'saavncdn.com' || host.endsWith('.saavncdn.com')) return route.continue();
    return route.fulfill({ status: 200, body: '' });
  });
  page = await context.newPage();
  const errors = [], popups = [];
  page.on('pageerror', (error) => errors.push(error.name));
  page.on('popup', () => popups.push(true));
  page.on('dialog', (dialog) => dialog.accept());
  page.on('response', (response) => {
    if (response.url().includes('/youtube/audio/')) audioResponses.push({ status: response.status(), contentType: response.headers()['content-type'] });
  });
  page.on('requestfailed', (request) => {
    if (request.url().includes('/youtube/audio/')) requestFailures.push(request.failure()?.errorText);
  });
  await page.goto(mobileUrl + '/Search');
  if (musicHost) {
    result.catalog = { passed: false };
    try {
      const response = page.waitForResponse((response) => response.url().includes('type=song&query=Tum%20Hi%20Ho'));
      await page.getByPlaceholder('What do you want to listen to?').fill('Tum Hi Ho');
      const search = await response;
      const data = await search.json();
      const items = data.data?.data?.results || data.data?.results || [];
      const song = normalizeSong(items[0]);
      if (!song) throw new Error('Catalog search did not return a song');
      await page.getByLabel('Play ' + song.title, { exact: true }).first().click();
      await page.waitForFunction(() => window.testAudioElement?.currentTime > 1.5 && !window.testAudioElement.paused, null, { timeout: 30000 });
      result.catalog = { passed: true, ...(await page.evaluate(() => ({ title: navigator.mediaSession?.metadata?.title,
        seconds: window.testAudioElement.currentTime, duration: window.testAudioElement.duration, audioHost: new URL(window.testAudioElement.src).hostname }))) };
      await page.getByLabel('Pause', { exact: true }).first().click();
    } catch (error) { result.catalog.error = error.name; }
  }
  await page.getByText('YouTube', { exact: true }).click();
  const metadataResponse = page.waitForResponse((response) => response.url().includes('type=youtube&query=' + encodeURIComponent('https://youtu.be/' + videoId)));
  await page.getByPlaceholder('What do you want to listen to?').fill('https://youtu.be/' + videoId);
  const metadata = await metadataResponse;
  result.metadataStatus = metadata.status();
  const data = await metadata.json();
  const title = decodeMusicText(data.data?.items?.[0]?.snippet?.title);
  if (!title) throw new Error('YouTube metadata did not return the song');
  const resolutionResponse = page.waitForResponse((response) => response.url() === env.base + '/youtube/resolve');
  await page.getByText(title, { exact: true }).first().click();
  const resolved = await resolutionResponse;
  result.resolutionStatus = resolved.status();
  if (resolved.status() !== 200) throw new Error('YouTube audio resolution failed');
  await page.waitForFunction(() => window.testAudioElement?.currentTime > 2 && window.testAudioElement.readyState >= 2, null, { timeout: 60000 });
  const playback = await page.evaluate(() => ({ seconds: window.testAudioElement.currentTime,
    duration: window.testAudioElement.duration, mediaTitle: navigator.mediaSession?.metadata?.title }));
  result.playback = playback;
  await page.getByLabel('Open player', { exact: true }).click();
  await page.getByLabel('Pause', { exact: true }).last().click();
  await page.waitForFunction(() => window.testAudioElement.paused);
  result.pauseSeconds = await page.evaluate(() => window.testAudioElement.currentTime);
  await page.getByLabel('Seek position', { exact: true }).scrollIntoViewIfNeeded();
  const seek = await page.getByLabel('Seek position', { exact: true }).boundingBox();
  const x = seek.x + seek.width * 0.3, y = seek.y + seek.height / 2;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 1, y); await page.mouse.up();
  const seekPosition = await page.evaluate(() => window.testAudioElement.currentTime);
  await page.getByLabel('Play', { exact: true }).last().click();
  await page.waitForFunction(({ duration, seekPosition }) => window.testAudioElement.currentTime > duration * 0.2 &&
    window.testAudioElement.currentTime > seekPosition + 1.5 && window.testAudioElement.readyState >= 3 && !window.testAudioElement.paused,
  { duration: playback.duration, seekPosition }, { timeout: 30000 });
  result.seekSeconds = await page.evaluate(() => window.testAudioElement.currentTime);
  result.videoElements = await page.locator('video, iframe[src*="youtube"]').count();
  result.externalNavigation = popups.length;
  result.streamResponses = streamResponses;
  result.pageErrors = errors;
  result.passed = result.videoElements === 0 && popups.length === 0 && errors.length === 0 && playback.mediaTitle === title && (!musicHost || result.catalog?.passed);
  if (!result.passed) process.exitCode = 1;
  await page.screenshot({ path: path.join(directory, 'live-youtube-audio.png') });
  await context.close();
} catch (error) {
  result.error = error.message;
  result.streamResponses = streamResponses;
  result.audioResponses = audioResponses;
  result.requestFailures = requestFailures;
  if (page && !page.isClosed()) {
    result.audioState = await page.evaluate(() => {
      const audio = window.testAudioElement;
      return audio ? { time: audio.currentTime, duration: Number.isFinite(audio.duration) ? audio.duration : null,
        paused: audio.paused, readyState: audio.readyState, error: audio.error?.code, title: navigator.mediaSession?.metadata?.title,
        audioPath: audio.src ? new URL(audio.src).pathname : null } : null;
    }).catch(() => null);
    await page.screenshot({ path: path.join(directory, 'live-youtube-audio-failure.png') }).catch(() => {});
  }
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (frontend) await new Promise((resolve) => frontend.close(resolve));
  await env?.close();
  await fs.writeFile(path.join(directory, 'live-youtube-playback.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}
