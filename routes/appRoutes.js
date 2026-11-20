import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from '../utils/http.js';

const directory = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const downloadPaths = ['/download/sangeetx-latest.apk', '/download/app.apk'];
export const publishedApk = Object.freeze({ version: '1.1.0', versionCode: 5,
  url: 'https://expo.dev/artifacts/eas/JuirtOASe3xwS4GwGbI1Bp4RbzLWxpbkQ_DKhnvdoG4.apk' });
const validVersion = (value) => typeof value === 'string' && /^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(value);
const validCode = (value) => (typeof value === 'number' || (typeof value === 'string' && /^[1-9]\d*$/.test(value))) &&
  Number.isSafeInteger(Number(value)) && Number(value) > 0 && Number(value) <= 2147483647;
const validUrl = (value) => {
  if (downloadPaths.includes(value)) return true;
  try {
    const url = new URL(value);
    return typeof value === 'string' && value.length < 3000 && url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
};
const compareVersion = (one, two) => {
  const a = one.split('.').map(Number), b = two.split('.').map(Number);
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
};

function resolveFullUrl(req, value) {
  return new URL(value, `${req.protocol}://${req.get('host')}`).toString();
}

export function createAppRoutes({ environment = process.env, rootDirectory = directory } = {}) {
  const router = Router();
  let versionState = {
    version: environment.LATEST_APP_VERSION || publishedApk.version,
    versionCode: Number(environment.LATEST_APP_VERSION_CODE || publishedApk.versionCode),
    minSupportedVersion: environment.MIN_SUPPORTED_APP_VERSION || '1.0.0',
    apkUrl: environment.LATEST_APP_APK_URL || downloadPaths[0],
    downloadUrl: environment.LATEST_APP_DOWNLOAD_URL || environment.LATEST_APP_APK_URL || downloadPaths[0],
    releaseNotes: environment.LATEST_APP_RELEASE_NOTES || 'Published Android APK with background playback, notifications and OTA support.',
    forceUpdate: environment.LATEST_APP_FORCE_UPDATE === 'true',
    publishedAt: new Date().toISOString(),
  };
  const validMetadata = (data) => validVersion(data.version) && validCode(data.versionCode) &&
    validVersion(data.minSupportedVersion) && compareVersion(data.minSupportedVersion, data.version) <= 0 &&
    validUrl(data.apkUrl) && validUrl(data.downloadUrl) && typeof data.releaseNotes === 'string' &&
    data.releaseNotes.length <= 8000 && typeof data.forceUpdate === 'boolean';
  const source = (req) => {
    for (const url of [versionState.apkUrl, versionState.downloadUrl]) {
      if (url.startsWith('https://')) {
        const parsed = new URL(url);
        if (parsed.host === (req.get('host') || '').toLowerCase() && downloadPaths.includes(parsed.pathname)) continue;
        return { url };
      }
    }
    if (!validVersion(versionState.version)) return null;
    const candidate = path.join(rootDirectory, 'mobile', 'artifacts', `SangeetX-preview-${versionState.version}.apk`);
    if (versionState.version !== publishedApk.version || versionState.versionCode === publishedApk.versionCode) {
      try { if (fs.statSync(candidate).isFile()) return { file: candidate }; } catch { /* No local published artifact. */ }
    }
    if (versionState.version === publishedApk.version && versionState.versionCode === publishedApk.versionCode) return { url: publishedApk.url };
    return null;
  };

  router.get('/api/app/version', (req, res) => {
    if (!validMetadata(versionState)) return res.status(503).json({ message: 'App release metadata is not configured correctly.' });
    const available = Boolean(source(req));
    res.set('Cache-Control', 'no-store').json({ ...versionState, apkAvailable: available,
      forceUpdate: available && versionState.forceUpdate,
      apkUrl: resolveFullUrl(req, versionState.apkUrl), downloadUrl: resolveFullUrl(req, versionState.downloadUrl) });
  });

  router.get(downloadPaths, (req, res) => {
    const target = validMetadata(versionState) ? source(req) : null;
    if (!target) return res.status(503).json({ message: 'The APK for this version has not been published yet.' });
    res.set('Cache-Control', 'no-store');
    if (target.url) return res.redirect(302, target.url);
    res.set({ 'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': `attachment; filename="sangeetx-v${versionState.version}.apk"` });
    return res.sendFile(target.file);
  });

  router.post('/api/app/version', (req, res) => {
    const adminSecret = environment.ADMIN_SECRET;
    if (!adminSecret || req.headers.authorization !== `Bearer ${adminSecret}`) return res.status(401).json({ message: 'Unauthorized' });
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ message: 'Provide release metadata as an object.' });
    const next = { ...versionState };
    for (const key of ['version', 'versionCode', 'apkUrl', 'downloadUrl', 'releaseNotes', 'forceUpdate', 'minSupportedVersion']) {
      if (req.body[key] !== undefined) next[key] = typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key];
    }
    if (req.body.apkUrl !== undefined && req.body.downloadUrl === undefined) next.downloadUrl = next.apkUrl;
    if (!validMetadata(next)) return res.status(400).json({ message: 'Provide a valid release version, build code and HTTPS APK URL.' });
    next.versionCode = Number(next.versionCode);
    next.publishedAt = new Date().toISOString();
    versionState = next;
    return res.json({ success: true, versionState: { ...versionState } });
  });
  return router;
}

export default createAppRoutes();
