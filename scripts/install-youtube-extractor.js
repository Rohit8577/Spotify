import { mkdir, writeFile, rename, chmod, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const version = process.env.YT_DLP_VERSION || '2026.10.26';
if (!/^\d{4}\.\d{2}\.\d{2}(?:\.\d+)?$/.test(version)) throw new Error('YT_DLP_VERSION must be a release version such as 2026.10.26');
const asset = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const base = `https://github.com/yt-dlp/yt-dlp/releases/download/${version}/`;
const directory = fileURLToPath(new URL('../.tools/', import.meta.url));
const destination = directory + asset;
const temporary = destination + '.download';

async function download(name, limit) {
  const response = await fetch(base + name, { signal: AbortSignal.timeout(60000) });
  if (!response.ok || Number(response.headers.get('content-length')) > limit) throw new Error(`Could not download ${name}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > limit) throw new Error(`${name} exceeds the download limit`);
  return bytes;
}

try {
  const sums = (await download('SHA2-256SUMS', 100000)).toString('utf8');
  const checksum = sums.split(/\r?\n/).find((line) => line.trim().split(/\s+/)[1]?.replace(/^\*/, '') === asset)?.trim().split(/\s+/)[0];
  if (!/^[a-f0-9]{64}$/.test(checksum || '')) throw new Error('Release checksum is missing');
  const bytes = await download(asset, 40 * 1024 * 1024);
  if (createHash('sha256').update(bytes).digest('hex') !== checksum) throw new Error('YouTube extractor checksum does not match');
  await mkdir(directory, { recursive: true });
  await writeFile(temporary, bytes, { mode: 0o755 });
  await rename(temporary, destination);
  if (process.platform !== 'win32') await chmod(destination, 0o755);
  console.log(`Verified yt-dlp ${version} installed in .tools/${asset}. Python 3 and Node.js are required on the backend.`);
} catch (error) {
  await rm(temporary, { force: true });
  console.error(error.message);
  process.exitCode = 1;
}
