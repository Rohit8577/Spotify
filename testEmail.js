import 'dotenv/config';
import { randomInt, randomUUID } from 'node:crypto';
import { sendVerificationEmail } from './services/email.js';

const email = process.argv[2];
if (!email) {
  console.error('Usage: npm run email:start -- recipient@example.com');
  process.exitCode = 1;
} else {
  try {
    const result = await sendVerificationEmail({ email, code: String(randomInt(1000, 10000)), purpose: 'test' },
      { idempotencyKey: 'email-test-' + randomUUID() });
    console.log(JSON.stringify({ accepted: true, id: result.id, to: email, from: process.env.RESEND_FROM || 'SangeetX <no-reply@sangeetx.online>' }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
