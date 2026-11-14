import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { io as connect } from 'socket.io-client';
import { testServer } from './helpers.js';
import User from '../models/User.js';
import Verification from '../models/Verification.js';
import RevokedToken from '../models/RevokedToken.js';
import jwt from 'jsonwebtoken';
import { issueToken, tokenDigest } from '../utils/tokens.js';
import { googleProfileUser } from '../services/google.js';

let env;
before(async () => { env = await testServer(); });
after(async () => { await env?.close(); });
const post = (path, body, options = {}) => env.request(path, { method: 'POST', body, ...options });

async function socketFor(token, extra = {}) {
  const socket = connect(env.base, { auth: { token }, reconnection: false, timeout: 3000, ...extra });
  await once(socket, 'connect');
  return socket;
}

test('untrusted browser origins cannot change a cookie-authenticated profile', async () => {
  const account = await env.createUser('csrf@example.test');
  const response = await fetch(env.base + '/profile', {
    method: 'POST', headers: { Origin: 'https://untrusted.example.test', Cookie: 'token=' + account.token,
      'Content-Type': 'application/x-www-form-urlencoded' }, body: 'name=Attacker',
  });
  assert.equal(response.status, 403);
  assert.equal((await User.findById(account.user._id)).name, 'csrf');
});

test('WebSocket upgrades reject untrusted browser origins even with a valid cookie', async () => {
  const account = await env.createUser('ws-origin@example.test');
  const socket = connect(env.base, { transports: ['websocket'], reconnection: false, timeout: 3000,
    extraHeaders: { Origin: 'https://untrusted.example.test', Cookie: 'token=' + account.token } });
  try {
    const result = await new Promise((resolve) => { socket.once('connect', () => resolve('connected')); socket.once('connect_error', () => resolve('rejected')); });
    assert.equal(result, 'rejected');
  } finally { socket.close(); }
});

test('logout revokes the presented token without revoking a separate login', async () => {
  const account = await env.createUser('logout@example.test');
  const other = await post('/login', { email: account.user.email, password: 'password123' });
  const response = await post('/logout', {}, { token: account.token });
  assert.equal(response.status, 200);
  assert.equal((await env.request('/userprofile', { token: account.token })).status, 401);
  assert.equal((await env.request('/userprofile', { token: other.data.token })).status, 200);
  const stored = await RevokedToken.findById(tokenDigest(account.token)).lean();
  assert.equal(stored.token, undefined);
  assert.ok(stored.expiresAt > new Date());
  assert.equal((await post('/logout', {}, { token: account.token })).status, 200);
});

test('same-origin cookies, allowlisted browser origins and native bearer clients remain usable', async () => {
  const account = await env.createUser('origin-allowed@example.test');
  const trusted = 'https://web.example.test';
  env.app.locals.trustedOrigins.add(trusted);
  try {
    for (const headers of [
      { Origin: env.base, Cookie: 'token=' + account.token },
      { Origin: trusted, Authorization: 'Bearer ' + account.token },
      { Authorization: 'Bearer ' + account.token },
    ]) assert.equal((await post('/profile', { name: 'Allowed' }, { headers })).status, 200);
    const preflight = await env.request('/profile', { method: 'OPTIONS', headers: {
      Origin: trusted, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type',
    } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), trusted);
    assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
    const socket = await socketFor(account.token, { transports: ['websocket'], extraHeaders: { Origin: trusted } });
    socket.close();
  } finally { env.app.locals.trustedOrigins.delete(trusted); }
});

test('null origins, deceptive subdomains, fetch metadata and hostile preflights are rejected', async () => {
  const account = await env.createUser('origin-denied@example.test');
  for (const headers of [
    { Origin: 'null' }, { Origin: env.base + '.attacker.test' },
    { Origin: 'https://untrusted.example.test', 'X-Forwarded-Host': 'untrusted.example.test', 'X-Forwarded-Proto': 'https' },
    { 'Sec-Fetch-Site': 'cross-site' }, { 'Sec-Fetch-Site': 'same-site' },
    {},
    { Referer: 'https://untrusted.example.test/form' },
  ]) assert.equal((await post('/profile', { name: 'Attacker' }, { headers: { Cookie: 'token=' + account.token, ...headers } })).status, 403);
  const preflight = await env.request('/profile', { method: 'OPTIONS', headers: { Origin: 'https://untrusted.example.test', 'Access-Control-Request-Method': 'POST' } });
  assert.equal(preflight.status, 403);
  assert.equal(preflight.headers.get('access-control-allow-origin'), null);
  assert.equal((await post('/profile', { name: 'Same origin' }, { headers: { Cookie: 'token=' + account.token, Referer: env.base + '/profile' } })).status, 200);
});

test('login CSRF and GET logout cannot replace or terminate a browser session', async () => {
  const account = await env.createUser('login-csrf@example.test');
  const response = await post('/login', { email: account.user.email, password: 'password123' }, { headers: { Origin: 'https://attacker.example.test' } });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal((await env.request('/logout', { headers: { Cookie: 'token=' + account.token } })).status, 405);
  assert.equal((await env.request('/userprofile', { token: account.token })).status, 200);
});

test('expired, forged, unsigned, wrong-algorithm and nonexpiring JWTs are rejected', async () => {
  const account = await env.createUser('jwt@example.test');
  const claims = { id: String(account.user._id), v: 0 };
  const invalid = [
    jwt.sign(claims, process.env.JWT_SECRET, { expiresIn: -1 }),
    jwt.sign(claims, 'wrong-secret', { expiresIn: '1h' }),
    jwt.sign(claims, '', { algorithm: 'none', expiresIn: '1h' }),
    jwt.sign(claims, process.env.JWT_SECRET, { algorithm: 'HS384', expiresIn: '1h' }),
    jwt.sign(claims, process.env.JWT_SECRET),
    jwt.sign({ ...claims, id: { $ne: null } }, process.env.JWT_SECRET, { expiresIn: '1h' }),
    jwt.sign({ ...claims, v: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' }),
  ];
  for (const token of invalid) assert.equal((await env.request('/userprofile', { token })).status, 401);
  assert.notEqual(issueToken(account.user), issueToken(account.user));
  assert.equal((await env.request('/userprofile', { token: 'invalid', headers: { Cookie: 'token=' + account.token } })).status, 401);
});

test('OTP resend and verification are atomic; proofs are email-bound, purpose-bound and single-use', async () => {
  const account = await env.createUser('otp-concurrent@example.test');
  const email = account.user.email;
  const other = await env.createUser('otp-other@example.test');
  const before = env.outbox.length;
  const sends = await Promise.all(Array.from({ length: 4 }, () => post('/send-otp', { email, purpose: 'reset' })));
  assert.deepEqual(sends.map((r) => r.status).sort(), [200, 429, 429, 429]);
  assert.equal(env.outbox.length - before, 1);
  const otp = env.outbox.at(-1).code;
  const checks = await Promise.all(Array.from({ length: 3 }, () => post('/verify-otp', { email, purpose: 'reset', otp })));
  assert.equal(checks.filter((r) => r.status === 200).length, 1);
  const verificationToken = checks.find((r) => r.status === 200).data.verificationToken;
  const record = await Verification.findOne({ email }).lean();
  assert.notEqual(record.codeHash, otp);
  assert.notEqual(record.proofHash, verificationToken);
  assert.equal((await post('/updtpass', { email: other.user.email, newpassword: 'changed123', verificationToken })).status, 403);
  assert.equal((await post('/signup', { email: 'new-otp@example.test', globalPassword: 'changed123', userdata: { name: 'New' }, verificationToken })).status, 403);
  // Even a signup proof for this same email must not authorize password reset.
  await Verification.updateOne({ email }, { $set: { purpose: 'signup' } });
  assert.equal((await post('/updtpass', { email, newpassword: 'changed123', verificationToken })).status, 403);
  await Verification.updateOne({ email }, { $set: { purpose: 'reset' } });
  const resets = await Promise.all(Array.from({ length: 2 }, () => post('/updtpass', { email, newpassword: 'changed123', verificationToken })));
  assert.deepEqual(resets.map((r) => r.status).sort(), [200, 403]);
  assert.equal((await env.request('/userprofile', { token: account.token })).status, 401);
});

test('concurrent wrong OTP guesses cannot exceed the five-attempt budget', async () => {
  const email = 'otp-budget@example.test';
  assert.equal((await post('/send-otp', { email })).status, 200);
  const otp = env.outbox.at(-1).code;
  const wrong = otp === '1111' ? '2222' : '1111';
  const guesses = await Promise.all(Array.from({ length: 6 }, () => post('/verify-otp', { email, otp: wrong })));
  assert.ok(guesses.every((r) => r.status === 400));
  assert.equal((await Verification.findOne({ email })).attempts, 5);
  assert.equal((await post('/verify-otp', { email, otp })).status, 400);
});

test('expired OTP proofs are rejected without waiting for database TTL cleanup', async () => {
  const email = 'expired-proof@example.test';
  await post('/send-otp', { email });
  const verified = await post('/verify-otp', { email, otp: env.outbox.at(-1).code });
  assert.equal(verified.status, 200);
  await Verification.updateOne({ email }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await post('/signup', { email, globalPassword: 'password123', userdata: { name: 'Expired' }, verificationToken: verified.data.verificationToken })).status, 403);
});

test('profile cannot mass-assign account ownership, credentials, friends or token version', async () => {
  const account = await env.createUser('assignment@example.test');
  const victim = await env.createUser('assignment-victim@example.test');
  const result = await post('/profile', { name: 'Safe', email: victim.user.email, _id: victim.user._id,
    password: 'attacker', tokenVersion: 99, friends: [{ email: victim.user.email }] }, { token: account.token });
  assert.equal(result.status, 200);
  const saved = await User.findById(account.user._id);
  assert.equal(saved.email, account.user.email);
  assert.equal(saved.tokenVersion, 0);
  assert.equal(saved.friends.length, 0);
  assert.notEqual(saved.password, 'attacker');
  assert.equal((await User.findById(victim.user._id)).name, 'assignment-victim');
});

test('foreign playlists and chat history reject object-reference manipulation', async () => {
  const victim = await env.createUser('idor-victim@example.test');
  const attacker = await env.createUser('idor-attacker@example.test');
  await post('/playlistname', { name: 'Private' }, { token: victim.token });
  const payloads = [
    ['/librarySongs', { pname: 'Private' }], ['/save', { pname: 'Private', songList: [] }],
    ['/deleteSong', { playlistName: 'Private', songId: 'one' }],
    ['/deletePlaylist', { playlistName: 'Private' }], ['/renamePlaylist', { oldName: 'Private', newName: 'Stolen' }],
  ];
  for (const [path, body] of payloads) assert.equal((await post(path, { ...body, email: victim.user.email, userId: victim.user._id }, { token: attacker.token })).status, 404);
  assert.equal((await env.request('/chat/history/' + victim.user._id, { token: attacker.token })).status, 403);
  assert.equal((await User.findById(victim.user._id)).library[0].name, 'Private');
});

test('password guessing is bounded per account and simultaneous password changes cannot overwrite each other', async () => {
  const account = await env.createUser('guessing@example.test');
  for (let i = 0; i < 10; i++) assert.equal((await post('/profile', { name: 'Guess', currentPassword: 'wrong', newPassword: 'changed123' }, { token: account.token })).status, 401);
  const limited = await post('/profile', { name: 'Guess', currentPassword: 'wrong', newPassword: 'changed123' }, { token: account.token });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  const other = await env.createUser('password-race@example.test');
  const results = await Promise.all(['changed123', 'another123'].map((newPassword) => post('/profile', { name: 'Race', currentPassword: 'password123', newPassword }, { token: other.token })));
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  assert.ok(results.every((r) => [200, 401, 409].includes(r.status)));
  assert.equal((await User.findById(other.user._id)).tokenVersion, 1);
});

test('private responses are not cacheable; pages block framing and MIME sniffing', async () => {
  const account = await env.createUser('headers@example.test');
  for (const path of ['/', '/profile', '/userprofile', '/fetchplaylist', '/chat/history/not-a-friend']) {
    const result = await env.request(path, { token: account.token, headers: { Cookie: 'token=' + account.token } });
    assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.equal(result.headers.get('x-frame-options'), 'DENY');
    assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
    assert.match(result.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(result.headers.get('x-powered-by'), null);
  }
  const response = await post('/login', { email: account.user.email, password: 'password123' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('set-cookie'), /HttpOnly.*SameSite=Lax/);
});

test('production HTTPS behind a configured proxy keeps same-origin login and secure cookies', async () => {
  const account = await env.createUser('https-security@example.test');
  const previousMode = process.env.NODE_ENV;
  const previousTrust = env.app.get('trust proxy');
  process.env.NODE_ENV = 'production';
  env.app.set('trust proxy', 1);
  try {
    const result = await post('/login', { email: account.user.email, password: 'password123' }, { headers: {
      Origin: env.base.replace('http:', 'https:'), 'X-Forwarded-Proto': 'https',
    } });
    assert.equal(result.status, 200);
    assert.match(result.headers.get('set-cookie'), /Secure/);
    assert.equal(result.headers.get('strict-transport-security'), 'max-age=31536000');
  } finally { process.env.NODE_ENV = previousMode; env.app.set('trust proxy', previousTrust); }
});

test('root config, private keys, source files and traversal paths are not served', async () => {
  for (const path of ['/.env', '/.git/config', '/firebase-admin.json', '/package.json', '/main.js', '/url',
    '/%2eenv', '/css/%2e%2e%2f%2e%2e%2f.env', '/vendor/../.env', '/..%5c.env']) {
    const result = await env.request(path);
    assert.ok([400, 403, 404].includes(result.status), path);
    assert.doesNotMatch(JSON.stringify(result.data), /PRIVATE KEY|DATABASE_URL|JWT_SECRET|RESEND_API_KEY/);
  }
});

test('query operators, prototype payloads and oversized JSON cannot mutate unrelated users', async () => {
  const account = await env.createUser('injection@example.test');
  assert.equal((await post('/login', { email: { $ne: null }, password: { $ne: null } })).status, 400);
  assert.equal((await post('/deletePlaylist', { playlistName: { $ne: null } }, { token: account.token })).status, 400);
  const body = JSON.parse('{"name":"Safe","__proto__":{"isAdmin":true},"constructor":{"prototype":{"isAdmin":true}}}');
  assert.equal((await post('/profile', body, { token: account.token })).status, 200);
  assert.equal({}.isAdmin, undefined);
  assert.equal((await post('/profile', { name: 'x'.repeat(1024 * 1024 + 1) }, { token: account.token })).status, 413);
  assert.equal((await env.request('/health')).status, 200);
});

test('Google login requires verified email before linking an existing account', async () => {
  const account = await env.createUser('google-security@example.test');
  for (const verified of [false, undefined, 'false']) {
    await assert.rejects(googleProfileUser({ emails: [{ value: account.user.email, verified }], displayName: 'Imposter' }), { status: 401 });
  }
  const matched = await googleProfileUser({ emails: [{ value: account.user.email, verified: true }], displayName: 'Google' });
  assert.equal(String(matched._id), String(account.user._id));
  env.services.verifyGoogleToken = async () => ({ email: account.user.email, email_verified: false });
  try {
    const denied = await post('/google-login', { token: 'mock-provider-token' });
    assert.equal(denied.status, 401);
    assert.equal(denied.data.token, undefined);
    env.services.verifyGoogleToken = async () => { throw new Error('Invalid signature'); };
    assert.equal((await post('/google-login', { token: 'mock-provider-token' })).status, 401);
    env.services.verifyGoogleToken = async () => ({ email: account.user.email, email_verified: true, name: 'Google' });
    const accepted = await post('/google-login', { token: 'mock-provider-token' });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.data.user.id, String(account.user._id));
    assert.equal((await env.request('/userprofile', { token: accepted.data.token })).status, 200);
  } finally { delete env.services.verifyGoogleToken; }
  assert.equal((await post('/google-login', { token: 'mock-provider-token' })).status, 503);
});

test('user-supplied provider IDs stay query parameters and cannot choose an internal host', async () => {
  const id = 'http://127.0.0.1:27017/private?x=1&api_key=changed#fragment';
  const result = await env.request('/search?type=songID&query=' + encodeURIComponent(id));
  assert.equal(result.status, 200);
  const called = new URL(env.calls.at(-1));
  assert.equal(called.origin, 'https://music.example.test');
  assert.equal(called.pathname, '/song');
  assert.equal(called.searchParams.get('id'), id);
  assert.equal(called.searchParams.has('api_key'), false);
});

test('logged-out sockets cannot receive song shares or friend listening activity', async () => {
  const sender = await env.createUser('event-sender@example.test');
  const recipient = await env.createUser('event-recipient@example.test');
  await User.updateOne({ _id: sender.user._id }, { $push: { friends: { id: String(recipient.user._id), email: recipient.user.email } } });
  const one = await socketFor(sender.token);
  try {
    for (const [event, payload] of [
      ['share-song', { to: recipient.user.email, song: { id: 'track', title: 'Private' } }],
      ['now-playing', { id: 'track', title: 'Private' }],
    ]) {
      const token = issueToken(recipient.user);
      const two = await socketFor(token);
      const serverRecipient = env.io.sockets.sockets.get(two.id);
      try {
        assert.equal((await post('/logout', {}, { token })).status, 200);
        const ack = await one.timeout(3000).emitWithAck(event, payload);
        assert.equal(ack.success, true);
        assert.equal(serverRecipient.connected, false);
      } finally { two.close(); }
    }
  } finally { one.close(); }
});

test('revoked chat recipients are disconnected before receiving private events', async () => {
  const sender = await env.createUser('secure-sender@example.test');
  const recipient = await env.createUser('secure-recipient@example.test');
  await User.updateOne({ _id: sender.user._id }, { $push: { friends: { id: String(recipient.user._id), email: recipient.user.email } } });
  await User.updateOne({ _id: recipient.user._id }, { $push: { friends: { id: String(sender.user._id), email: sender.user.email } } });
  const one = await socketFor(sender.token);
  const two = await socketFor(recipient.token);
  const serverRecipient = env.io.sockets.sockets.get(two.id);
  try {
    assert.equal((await post('/profile', { name: 'Recipient', currentPassword: 'password123', newPassword: 'changed123' }, { token: recipient.token })).status, 200);
    const result = await one.timeout(3000).emitWithAck('send-chat-message', { to: recipient.user.email, content: 'Private after reset' });
    assert.equal(result.success, true);
    assert.equal(serverRecipient.connected, false);
  } finally { one.close(); two.close(); }
});
