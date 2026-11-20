import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareRenderYouTube } from '../scripts/prepare-render-youtube.js';
import { createApp } from '../app.js';

test('Render uses its trusted ingress and respects an explicit proxy override', () => {
  const oldRender = process.env.RENDER, oldProxy = process.env.TRUST_PROXY;
  try {
    for (const [render, proxy, expected] of [['true', undefined, 1], ['true', '0', 0], ['true', '2', 2], ['false', undefined, false]]) {
      process.env.RENDER = render;
      if (proxy === undefined) delete process.env.TRUST_PROXY; else process.env.TRUST_PROXY = proxy;
      assert.equal(createApp().get('trust proxy'), expected);
    }
  } finally {
    if (oldRender === undefined) delete process.env.RENDER; else process.env.RENDER = oldRender;
    if (oldProxy === undefined) delete process.env.TRUST_PROXY; else process.env.TRUST_PROXY = oldProxy;
  }
});

test('local installs and disabled YouTube skip Render setup', async () => {
  for (const environment of [{}, { RENDER: 'false' }, { RENDER: 'true', YOUTUBE_AUDIO_ENABLED: 'false' }]) {
    const result = await prepareRenderYouTube({ environment, run: async () => assert.fail('Extractor must not run') });
    assert.deepEqual(result, { enabled: false });
  }
});

test('Render installs and verifies the executable before accepting the deployment', async () => {
  const calls = [];
  const result = await prepareRenderYouTube({ environment: { RENDER: 'true' }, run: async (command, args, options) => {
    calls.push({ command, args, options }); return { stdout: args[0] === '--version' ? '2026.10.26\n' : '' };
  } });
  assert.deepEqual(result, { enabled: true, version: '2026.10.26' });
  assert.equal(calls.length, 2); assert.equal(calls[0].command, process.execPath);
  assert.match(calls[0].args[0], /install-youtube-extractor\.js$/);
  assert.deepEqual(calls[1].args, ['--version']);
});

test('a configured Render extractor is verified without replacing it', async () => {
  const calls = [];
  await prepareRenderYouTube({ environment: { RENDER: 'true', YT_DLP_PATH: '/custom/yt-dlp' }, run: async (command, args) => {
    calls.push({ command, args }); return { stdout: '2026.10.26\n' };
  } });
  assert.deepEqual(calls, [{ command: '/custom/yt-dlp', args: ['--version'] }]);
});

test('failed downloads and missing Python stop Render setup without leaking details', async () => {
  for (const failAt of [1, 2]) {
    let calls = 0;
    await assert.rejects(prepareRenderYouTube({ environment: { RENDER: 'true' }, run: async () => {
      if (++calls === failAt) throw new Error('private environment details');
      return { stdout: '' };
    } }), (error) => /Python 3/.test(error.message) && !error.message.includes('private'));
  }
});

test('invalid executable output cannot pass the Render readiness check', async () => {
  await assert.rejects(prepareRenderYouTube({ environment: { RENDER: 'true', YT_DLP_PATH: 'yt-dlp' },
    run: async () => ({ stdout: 'unexpected private output' }) }), /YouTube setup failed/);
});
