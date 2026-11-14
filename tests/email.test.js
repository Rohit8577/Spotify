import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verificationEmail, sendVerificationEmail } from '../services/email.js';

test('OTP email uses verified SangeetX domain and includes plain text and HTML', () => {
  const payload = verificationEmail({ email: 'USER@example.test', code: '1234', purpose: 'reset' });
  assert.equal(payload.from, 'SangeetX <no-reply@sangeetx.online>');
  assert.equal(payload.to, 'user@example.test');
  assert.match(payload.text, /reset your password/);
  assert.match(payload.html, /1234/);
  assert.throws(() => verificationEmail({ email: 'bad', code: '1234' }));
  assert.throws(() => verificationEmail({ email: 'user@example.test', code: '<script>' }));
});

test('Resend acceptance and errors are handled without exposing OTP to the client', async () => {
  let options;
  const client = { emails: { send: async (payload, opts) => { options = opts; return { data: { id: 'email-test-id' } }; } } };
  assert.deepEqual(await sendVerificationEmail({ email: 'user@example.test', code: '1234' }, { client, idempotencyKey: 'test-send' }), { id: 'email-test-id' });
  assert.equal(options.idempotencyKey, 'test-send');
  client.emails.send = async () => ({ error: { name: 'validation_error', message: 'Unverified domain' } });
  await assert.rejects(sendVerificationEmail({ email: 'user@example.test', code: '1234' }, { client }), /Unverified domain/);
});
