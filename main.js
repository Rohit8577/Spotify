import 'dotenv/config';
import http from 'node:http';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { attachSockets } from './sockets.js';
import { startPushWorker } from './services/push.js';

async function start() {
  for (const name of ['DATABASE_URL', 'JWT_SECRET']) {
    if (!process.env[name]) throw new Error(name + ' is required');
  }
  await mongoose.connect(process.env.DATABASE_URL, { serverSelectionTimeoutMS: 10000 });
  const server = http.createServer(createApp());
  const io = attachSockets(server);
  const stopPushWorker = startPushWorker();
  const port = Number(process.env.PORT || 5000);
  server.listen(port, '0.0.0.0', () => console.log('SangeetX listening on port ' + server.address().port));
  server.on('error', async (error) => { console.error('Server failed:', error.message); await mongoose.disconnect(); process.exitCode = 1; });
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    io.close(async () => { await stopPushWorker(); await mongoose.disconnect(); });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
start().catch((error) => { console.error('Startup failed:', error.message); process.exitCode = 1; });
