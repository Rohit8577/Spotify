import PushDevice from '../models/PushDevice.js';
import PushJob from '../models/PushJob.js';
import User from '../models/User.js';
import RevokedToken from '../models/RevokedToken.js';

// A durable outbox keeps chat success independent of Expo/FCM availability.
export async function enqueuePush(userId, { title, body, data }) {
  const devices = await PushDevice.find({ user: userId, expiresAt: { $gt: new Date() } }).lean();
  if (!devices.length) return;
  await PushJob.insertMany(devices.map((device) => ({
    device: device._id, sessionDigest: device.sessionDigest,
    payload: { title: title.slice(0, 120), body: body.slice(0, 180), data, sound: 'default', channelId: 'social', ttl: 3600 },
  })));
}

async function expoRequest(path, body) {
  const response = await fetch(`https://exp.host/--/api/v2/push/${path}`, {
    method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/json', ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Push HTTP ${response.status}`);
  const result = await response.json();
  if (result.errors?.length || !result.data) throw new Error('Push provider rejected request');
  return result.data;
}

export async function processPushJob(job, send = expoRequest) {
  const device = await PushDevice.findById(job.device).select('+token').lean();
  const user = device && await User.findById(device.user).select('tokenVersion').lean();
  if (!device || !user || device.sessionDigest !== job.sessionDigest || device.expiresAt <= new Date() ||
      device.tokenVersion !== (user.tokenVersion || 0) || await RevokedToken.exists({ _id: device.sessionDigest })) {
    await PushJob.deleteOne({ _id: job._id }); return;
  }
  try {
    if (job.ticket) {
      const receipts = await send('getReceipts', { ids: [job.ticket] });
      const receipt = receipts[job.ticket];
      if (!receipt) throw new Error('Receipt not ready');
      if (receipt.details?.error === 'DeviceNotRegistered') {
        await PushDevice.deleteOne({ _id: device._id, sessionDigest: job.sessionDigest });
      } else if (receipt.status === 'error') console.warn('Push receipt error:', receipt.details?.error || 'unknown');
      await PushJob.deleteOne({ _id: job._id });
      return;
    }
    // A queued notification must not jump to a new account on the same device.
    const tickets = await send('send', [{ ...job.payload, to: device.token }]);
    const ticket = tickets[0];
    if (ticket?.status === 'ok' && ticket.id) {
      await PushJob.updateOne({ _id: job._id }, { $set: { ticket: ticket.id, attempts: 0, dueAt: new Date(Date.now() + 15 * 60000) } });
    } else if (ticket?.details?.error === 'DeviceNotRegistered') {
      await PushDevice.deleteOne({ _id: device._id, sessionDigest: job.sessionDigest });
      await PushJob.deleteOne({ _id: job._id });
    } else throw new Error(ticket?.details?.error || 'Push ticket unavailable');
  } catch {
    if (job.attempts >= 6) {
      console.warn('Push delivery exhausted retries');
      await PushJob.deleteOne({ _id: job._id });
    } else {
      await PushJob.updateOne({ _id: job._id }, { $set: { dueAt: new Date(Date.now() + Math.min(30 * 60000, 30000 * 2 ** job.attempts)) } });
    }
  }
}

export function startPushWorker() {
  let stopped = false;
  let working = false;
  const run = async () => {
    if (working || stopped) return;
    working = true;
    try {
      for (let i = 0; i < 50 && !stopped; i++) {
        // Lease atomically so multiple backend instances cannot send the same job together.
        const job = await PushJob.findOneAndUpdate({ dueAt: { $lte: new Date() }, expiresAt: { $gt: new Date() } }, {
          $set: { dueAt: new Date(Date.now() + 60000) }, $inc: { attempts: 1 },
        }, { new: true }).lean();
        if (!job) break;
        await processPushJob(job);
      }
    } catch { console.warn('Push worker temporarily unavailable'); }
    finally { working = false; }
  };
  const timer = setInterval(run, 15000); timer.unref();
  void run();
  return async () => { stopped = true; clearInterval(timer); while (working) await new Promise((resolve) => setTimeout(resolve, 100)); };
}
