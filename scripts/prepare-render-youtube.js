import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const runFile = promisify(execFile);
const installer = fileURLToPath(new URL('./install-youtube-extractor.js', import.meta.url));
const bundledExtractor = fileURLToPath(new URL(`../.tools/${process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'}`, import.meta.url));

export async function prepareRenderYouTube({ environment = process.env, run = runFile } = {}) {
  if (environment.RENDER !== 'true' || environment.YOUTUBE_AUDIO_ENABLED === 'false') return { enabled: false };
  try {
    if (!environment.YT_DLP_PATH) {
      await run(process.execPath, [installer], { env: environment, timeout: 150000, maxBuffer: 100000 });
    }
    const { stdout } = await run(environment.YT_DLP_PATH || bundledExtractor, ['--version'], {
      env: environment, timeout: 10000, maxBuffer: 10000,
    });
    const version = stdout.trim();
    if (!/^\d{4}\.\d{2}\.\d{2}(?:\.\d+)?$/.test(version)) throw new Error('Invalid extractor version');
    return { enabled: true, version };
  } catch {
    throw new Error('YouTube setup failed. The backend needs Python 3, Node.js and access to the yt-dlp release. Configure YT_DLP_PATH or retry deployment.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = await prepareRenderYouTube();
    if (result.enabled) console.log(`YouTube audio extractor ${result.version} is ready on Render.`);
  } catch (error) {
    console.warn(error.message);
    if (process.env.YOUTUBE_AUDIO_REQUIRED === 'true') {
      process.exitCode = 1;
    } else {
      console.warn('Continuing deployment: YouTube audio extractor is skipped (set YOUTUBE_AUDIO_REQUIRED=true to enforce).');
    }
  }
}
