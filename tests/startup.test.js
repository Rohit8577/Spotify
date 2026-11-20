import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { MongoMemoryServer } from 'mongodb-memory-server';

test('Render entry point starts without Firebase credentials and ignores obsolete invalid keys', { timeout: 90000 }, async () => {
  const database = await MongoMemoryServer.create();
  try {
    for (const obsoleteKey of [undefined, 'obsolete-invalid-private-key']) {
      const env = { ...process.env, DATABASE_URL: database.getUri(), JWT_SECRET: 'startup-test-secret', PORT: '0', NODE_ENV: 'test',
        DOTENV_CONFIG_PATH: 'tests/nonexistent-startup.env', SAVAN_URL: 'https://music.example.test' };
      for (const name of ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_TOKEN',
        'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'CALLBACK_URL', 'SESSION_SECRET', 'TRUST_PROXY']) delete env[name];
      if (obsoleteKey) Object.assign(env, { FIREBASE_PROJECT_ID: 'unused', FIREBASE_CLIENT_EMAIL: 'unused@example.test', FIREBASE_PRIVATE_KEY: obsoleteKey });
      const child = spawn(process.execPath, ['main.js'], { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
      const exited = once(child, 'exit');
      try {
        const port = await new Promise((resolve, reject) => {
          let output = '';
          const timer = setTimeout(() => reject(new Error('Server did not become ready')), 30000);
          child.on('error', (error) => { clearTimeout(timer); reject(error); });
          child.on('exit', () => { clearTimeout(timer); reject(new Error('Server exited before becoming ready')); });
          child.stdout.on('data', (chunk) => {
            output += chunk;
            const match = output.match(/SangeetX listening on port (\d+)/);
            if (match) { clearTimeout(timer); resolve(Number(match[1])); }
          });
        });
        const base = `http://127.0.0.1:${port}`;
        const health = await fetch(base + '/health');
        assert.equal(health.status, 200);
        assert.equal((await health.json()).database, 'connected');
        const login = await fetch(base + '/google-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'legacy-token' }) });
        assert.equal(login.status, 503);
        assert.equal((await fetch(base + '/health')).status, 200);
      } finally { child.kill(); await exited; }
    }
  } finally { await database.stop(); }
});
