import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { testServer } from './helpers.js';
import PushDevice from '../models/PushDevice.js';
import PushJob from '../models/PushJob.js';
import User from '../models/User.js';
import { io as connect } from 'socket.io-client';
import { once } from 'node:events';
import { enqueuePush, processPushJob } from '../services/push.js';

let env, owner, other;
const pushToken = 'ExpoPushToken[test_device_token_1234]';
const payload = { title: 'New song', body: 'Listen together', data: { type: 'song', songId: 'one' } };
before(async () => { env = await testServer(); });
after(async () => { await env?.close(); });
beforeEach(async () => {
  await Promise.all([PushDevice.deleteMany({}), PushJob.deleteMany({})]);
  owner = await env.createUser(`owner-${Date.now()}@example.test`);
  other = await env.createUser(`other-${Date.now()}@example.test`);
});
const register = (account = owner, token = pushToken) => env.request('/notifications/devices', {
  method: 'POST', token: account.token, body: { token, platform: 'android', user: String(other.user._id) },
});
async function queuedJob() {
  await enqueuePush(owner.user._id, payload);
  return PushJob.findOne().lean();
}
test('device registration requires auth and validates token/platform, ignores supplied user', async () => {
  assert.equal((await env.request('/notifications/devices', { method: 'POST', body: {} })).status, 401);
  assert.equal((await register(owner, 'arbitrary-token')).status, 400);
  assert.equal((await register()).status, 201);
  await register();
  assert.equal(await PushDevice.countDocuments(), 1);
  const device = await PushDevice.findOne().lean();
  assert.equal(String(device.user), String(owner.user._id));
  assert.equal(device.token, undefined);
  const profile = await env.request('/userprofile', { token: owner.token });
  assert.ok(!JSON.stringify(profile.data).includes(pushToken));
});
test('one account cannot unregister another account device', async () => {
  await register();
  await env.request('/notifications/devices', { method: 'DELETE', token: other.token, body: { token: pushToken } });
  assert.equal(await PushDevice.countDocuments(), 1);
  await env.request('/notifications/devices', { method: 'DELETE', token: owner.token, body: { token: pushToken } });
  assert.equal(await PushDevice.countDocuments(), 0);
});
test('successful delivery persists a ticket, checks receipts and removes invalid devices', async () => {
  await register();
  const job = await queuedJob();
  await processPushJob(job, async (path, messages) => {
    assert.equal(path, 'send'); assert.equal(messages[0].to, pushToken);
    assert.equal(messages[0].channelId, 'social'); return [{ status: 'ok', id: 'ticket-1' }];
  });
  const receiptJob = await PushJob.findById(job._id).lean();
  assert.equal(receiptJob.ticket, 'ticket-1');
  assert.ok(receiptJob.dueAt.getTime() > Date.now() + 14 * 60000);
  await processPushJob(receiptJob, async (path, body) => {
    assert.equal(path, 'getReceipts'); assert.deepEqual(body.ids, ['ticket-1']);
    return { 'ticket-1': { status: 'error', details: { error: 'DeviceNotRegistered' } } };
  });
  assert.equal(await PushDevice.countDocuments(), 0);
  assert.equal(await PushJob.countDocuments(), 0);
});
test('account switching cancels an old account notification before sending', async () => {
  await register(); const job = await queuedJob(); await register(other);
  await processPushJob(job, () => assert.fail('Old notification must not be sent'));
  assert.equal(await PushJob.countDocuments(), 0);
});
test('logout and password changes prevent push delivery for old sessions', async () => {
  await register(); let job = await queuedJob();
  await env.request('/logout', { method: 'POST', token: owner.token, body: {} });
  await processPushJob(job, () => assert.fail('Revoked session must not receive push'));
  assert.equal(await PushJob.countDocuments(), 0);
  await register(other); await enqueuePush(other.user._id, payload); job = await PushJob.findOne().lean();
  await User.updateOne({ _id: other.user._id }, { $inc: { tokenVersion: 1 } });
  await processPushJob(job, () => assert.fail('Old password session must not receive push'));
  assert.equal(await PushJob.countDocuments(), 0);
});
test('temporary push failures retry with backoff without losing the job', async () => {
  await register(); const job = await queuedJob();
  await processPushJob({ ...job, attempts: 2 }, async () => { throw new Error('Network unavailable'); });
  const retry = await PushJob.findById(job._id).lean();
  assert.ok(retry.dueAt > new Date()); assert.equal(retry.ticket, undefined);
  await processPushJob({ ...retry, attempts: 6 }, async () => { throw new Error('Network unavailable'); });
  assert.equal(await PushJob.countDocuments(), 0);
});

test('friend-only chat and song events queue targeted push alerts, repeated friend requests do not spam', async () => {
  await register(other);
  const friendRequest = () => env.request('/friends/send-request', { method: 'POST', token: owner.token, body: { to: other.user.email } });
  assert.equal((await friendRequest()).status, 200);
  await friendRequest();
  assert.equal(await PushJob.countDocuments(), 1);
  assert.equal((await PushJob.findOne()).payload.data.type, 'friend-request');
  await PushJob.deleteMany({});
  await User.updateOne({ _id: owner.user._id }, { $push: { friends: { id: String(other.user._id), email: other.user.email } } });
  const socket = connect(env.base, { auth: { token: owner.token }, transports: ['websocket'], forceNew: true });
  try {
    await once(socket, 'connect');
    const chat = await socket.timeout(3000).emitWithAck('send-chat-message', { to: other.user.email, content: 'Hello from a friend' });
    assert.equal(chat.success, true);
    const song = await socket.timeout(3000).emitWithAck('share-song', { to: other.user.email, song: { id: 'song-one', title: 'One' } });
    assert.equal(song.success, true);
    const jobs = await PushJob.find().lean();
    assert.equal(jobs.length, 2);
    assert.ok(jobs.every((job) => job.payload.data.recipientId === String(other.user._id)));
    assert.deepEqual(jobs.map((job) => job.payload.data.type).sort(), ['chat', 'song']);
    const stranger = await env.createUser('stranger@example.test');
    const denied = await socket.timeout(3000).emitWithAck('send-chat-message', { to: stranger.user.email, content: 'No friendship' });
    assert.equal(denied.success, false); assert.equal(await PushJob.countDocuments(), 2);
  } finally { socket.disconnect(); }
});
