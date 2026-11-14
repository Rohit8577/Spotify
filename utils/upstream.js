import { HttpError } from './http.js';

export async function fetchJson(url, options = {}, timeout = 10000) {
  try {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeout) });
    if (!response.ok) throw new HttpError(502, 'Music provider returned an error');
    return await response.json();
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') throw new HttpError(504, 'Provider timed out');
    if (error.status) throw error;
    throw new HttpError(502, 'Provider unavailable');
  }
}

export function saavnUrl(path, params = {}) {
  if (!process.env.SAVAN_URL) throw new HttpError(503, 'Music provider is not configured');
  const url = new URL(process.env.SAVAN_URL.replace(/\/$/, '') + path);
  url.search = new URLSearchParams(params).toString();
  return url.toString();
}

export async function mapLimit(items, limit, action) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) { const index = cursor++; results[index] = await action(items[index], index); }
  }));
  return results;
}
