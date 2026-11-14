import 'dotenv/config';
import http from 'node:http';
import mongoose from 'mongoose';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { createApp } from './app.js';
import { attachSockets } from './sockets.js';

async function start() {
  for (const name of ['DATABASE_URL', 'JWT_SECRET']) {
    if (!process.env[name]) throw new Error(name + ' is required');
  }
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && !getApps().length) {
    initializeApp({ credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }) });
  }
  await mongoose.connect(process.env.DATABASE_URL, { serverSelectionTimeoutMS: 10000 });
  const server = http.createServer(createApp());
  const io = attachSockets(server);
  const port = Number(process.env.PORT || 5000);
  server.listen(port, '0.0.0.0', () => console.log('SangeetX listening on port ' + port));
  server.on('error', async (error) => { console.error('Server failed:', error.message); await mongoose.disconnect(); process.exitCode = 1; });
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    io.close(async () => { await mongoose.disconnect(); });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
start().catch((error) => { console.error('Startup failed:', error.message); process.exitCode = 1; });
