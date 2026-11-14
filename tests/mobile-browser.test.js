import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { testServer, testAudio } from './helpers.js';

let env, browser, frontend, mobileUrl;
before(async () => {
  env = await testServer();
  const app = express();
  app.use(express.static(path.resolve('mobile/dist')));
  app.get('*', (req, res) => res.sendFile(path.resolve('mobile/dist/index.html')));
  frontend = await new Promise((resolve) => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  mobileUrl = `http://127.0.0.1:${frontend.address().port}`;
  env.app.locals.trustedOrigins.add(mobileUrl);
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); await new Promise((resolve) => frontend?.close(resolve)); await env?.close(); });

async function mobilePage(account) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(({ backend, account }) => {
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { window.testAudioElement = this; return originalPlay.call(this); };
    localStorage.setItem('@sangeetx_server_url', backend);
    if (account) {
      localStorage.setItem('@sangeetx_token', account.token);
      localStorage.setItem('@sangeetx_user', JSON.stringify(account.user));
    }
  }, { backend: env.base, account: account ? { token: account.token, user: { id: String(account.user._id), email: account.user.email, name: account.user.name } } : null });
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes('audio.example.test')) return route.fulfill({ status: 200, body: testAudio, contentType: 'audio/wav', headers: { 'Access-Control-Allow-Origin': '*' } });
    return url.startsWith(env.base) || url.startsWith(mobileUrl) ? route.continue() : route.fulfill({ status: 200, body: '' });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return { page, errors, close: () => context.close() };
}

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
    assert.deepEqual(session.errors, []);
    await session.page.screenshot({ path: 'reports/deep-testing-2026-11-13/expo-mobile-home.png' });
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
