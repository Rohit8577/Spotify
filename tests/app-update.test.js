import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import appRoutes, { createAppRoutes, publishedApk } from '../routes/appRoutes.js';

test('app update endpoints report latest version metadata and handle APK downloads', async () => {
  const app = express();
  app.use(express.json());
  app.use(appRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  try {
    // 1. GET /api/app/version returns valid JSON with version, apkUrl, and releaseNotes
    const versionRes = await fetch(`${base}/api/app/version`, { headers: { connection: 'close' } });
    assert.equal(versionRes.status, 200);
    const data = await versionRes.json();
    assert.equal(typeof data.version, 'string');
    assert.equal(typeof data.versionCode, 'number');
    assert.ok(data.apkUrl.includes('/download/'));
    assert.equal(typeof data.releaseNotes, 'string');
    assert.equal(data.version, publishedApk.version);
    assert.equal(data.versionCode, publishedApk.versionCode);
    assert.equal(data.apkAvailable, true);

    // 2. GET /download/sangeetx-latest.apk serves file or redirects
    const downloadRes = await fetch(`${base}/download/sangeetx-latest.apk`, { redirect: 'manual', headers: { connection: 'close' } });
    assert.ok([200, 302].includes(downloadRes.status));
    await downloadRes.body?.cancel();

    // 3. POST /api/app/version rejects unauthorized requests
    const unauthorizedRes = await fetch(`${base}/api/app/version`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', connection: 'close' },
      body: JSON.stringify({ version: '9.9.9' }),
    });
    assert.equal(unauthorizedRes.status, 401);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

async function isolatedRelease(environment, check, files = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sangeetx-release-'));
  await mkdir(path.join(root, 'mobile/artifacts'), { recursive: true });
  for (const [name, bytes] of Object.entries(files)) await writeFile(path.join(root, 'mobile/artifacts', name), bytes);
  const app = express(); app.use(express.json()); app.use(createAppRoutes({ environment, rootDirectory: root }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (pathname, { body, token } = {}) => {
    const response = await fetch(base + pathname, { redirect: 'manual', method: body === undefined ? 'GET' : 'POST',
      headers: { Connection: 'close', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body) });
    const raw = await response.text();
    let data; try { data = JSON.parse(raw); } catch { data = raw; }
    return { status: response.status, data, headers: response.headers };
  };
  try { await check(request); }
  finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); await rm(root, { recursive: true, force: true }); }
}

test('published version defaults match the verified APK and cloud redirect', async () => {
  await isolatedRelease({}, async (request) => {
    const metadata = (await request('/api/app/version')).data;
    assert.equal(metadata.version, '1.1.0'); assert.equal(metadata.versionCode, 5);
    const download = await request('/download/app.apk');
    assert.equal(download.status, 302); assert.equal(download.headers.get('location'), publishedApk.url);
    assert.equal(metadata.apkAvailable, true);
  });
});

test('an unpublished version cannot serve an older APK under its new filename', async () => {
  await isolatedRelease({ LATEST_APP_VERSION: '1.1.1', LATEST_APP_VERSION_CODE: '6', LATEST_APP_FORCE_UPDATE: 'true' }, async (request) => {
    const metadata = (await request('/api/app/version')).data;
    assert.equal(metadata.apkAvailable, false); assert.equal(metadata.forceUpdate, false);
    assert.equal((await request('/download/sangeetx-latest.apk')).status, 503);
  }, { 'SangeetX-preview-1.1.0.apk': 'old APK' });
});

test('a newer build code cannot reuse the verified older build of the same version', async () => {
  await isolatedRelease({ LATEST_APP_VERSION: '1.1.0', LATEST_APP_VERSION_CODE: '6' }, async (request) => {
    assert.equal((await request('/api/app/version')).data.apkAvailable, false);
    assert.equal((await request('/download/app.apk')).status, 503);
  }, { 'SangeetX-preview-1.1.0.apk': 'verified build 5' });
});

test('an exact local version is served with matching filename and media type', async () => {
  await isolatedRelease({ LATEST_APP_VERSION: '1.1.1', LATEST_APP_VERSION_CODE: '6' }, async (request) => {
    const download = await request('/download/app.apk');
    assert.equal(download.status, 200); assert.equal(download.data, 'matching APK');
    assert.match(download.headers.get('content-disposition'), /sangeetx-v1\.1\.1\.apk/);
    assert.equal(download.headers.get('content-type'), 'application/vnd.android.package-archive');
  }, { 'SangeetX-preview-1.1.0.apk': 'old APK', 'SangeetX-preview-1.1.1.apk': 'matching APK' });
});

test('release updates require a separate admin secret and redirect to the new artifact', async () => {
  const admin = 'isolated-release-admin';
  const url = 'https://downloads.example.test/sangeetx-1.1.1.apk';
  await isolatedRelease({ ADMIN_SECRET: admin, JWT_SECRET: 'login-signing-secret' }, async (request) => {
    const body = { version: '1.1.1', versionCode: 6, apkUrl: url, releaseNotes: 'New release' };
    assert.equal((await request('/api/app/version', { body, token: 'login-signing-secret' })).status, 401);
    assert.equal((await request('/api/app/version', { body, token: admin })).status, 200);
    const metadata = (await request('/api/app/version')).data;
    assert.equal(metadata.versionCode, 6); assert.equal(metadata.apkUrl, url); assert.equal(metadata.downloadUrl, url);
    assert.equal((await request('/download/app.apk')).headers.get('location'), url);
  });
});

test('invalid release edits are rejected atomically without changing published metadata', async () => {
  const admin = 'isolated-release-admin';
  await isolatedRelease({ ADMIN_SECRET: admin }, async (request) => {
    for (const body of [{ version: '../.env' }, { versionCode: -1 }, { versionCode: 1.5 }, { versionCode: [6] },
      { apkUrl: 'javascript:alert(1)' }, { apkUrl: 'https://user:pass@example.test/app.apk' }, { minSupportedVersion: '9.0.0' }, [],
      { version: '2.0.0', releaseNotes: ['bad'] }]) {
      assert.equal((await request('/api/app/version', { body, token: admin })).status, 400);
      assert.equal((await request('/api/app/version')).data.version, '1.1.0');
    }
  });
});
