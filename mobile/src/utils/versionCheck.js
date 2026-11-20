/**
 * Version parser and comparison helpers for SangeetX mobile app.
 */

export function parseVersion(versionStr) {
  if (!versionStr || typeof versionStr !== 'string') return [0, 0, 0];
  const clean = versionStr.replace(/^v/i, '').split('-')[0].trim();
  const parts = clean.split('.').map((p) => {
    const num = parseInt(p, 10);
    return Number.isSafeInteger(num) ? num : 0;
  });
  while (parts.length < 3) parts.push(0);
  return parts;
}

/**
 * Returns true if the remote version/versionCode represents an upgrade over the local version.
 */
export function isNewerVersion(remoteVer, localVer, remoteCode, localCode) {
  const rCode = Number(remoteCode);
  const lCode = Number(localCode);

  // If both versionCodes are safe positive integers, check build number first
  if (Number.isSafeInteger(rCode) && Number.isSafeInteger(lCode) && rCode > 0 && lCode > 0) {
    if (rCode > lCode) return true;
    if (rCode < lCode) return false;
  }

  // Compare semantic version triples [major, minor, patch]
  const [rMajor, rMinor, rPatch] = parseVersion(remoteVer);
  const [lMajor, lMinor, lPatch] = parseVersion(localVer);

  if (rMajor !== lMajor) return rMajor > lMajor;
  if (rMinor !== lMinor) return rMinor > lMinor;
  if (rPatch !== lPatch) return rPatch > lPatch;

  return false;
}

/**
 * Fetches latest version metadata from backend endpoint /api/app/version.
 */
export async function fetchRemoteVersion(baseUrl) {
  if (!baseUrl) throw new Error('Base URL is required to check app version');
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const url = `${normalizedBase}/api/app/version`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
    const data = await response.json();
    return data;
  } finally {
    clearTimeout(timer);
  }
}
