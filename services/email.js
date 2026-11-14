import { Resend } from 'resend';
import { emailAddress } from '../utils/http.js';

export const DEFAULT_FROM = 'SangeetX <no-reply@sangeetx.online>';

export function verificationEmail({ email, code, purpose = 'signup' }) {
  const to = emailAddress(email);
  if (!/^\d{4}$/.test(code)) throw new Error('A four-digit verification code is required');
  const action = purpose === 'reset' ? 'reset your password' : purpose === 'test' ? 'test email delivery' : 'verify your email';
  return {
    from: process.env.RESEND_FROM || DEFAULT_FROM,
    to,
    subject: `${code} - SangeetX verification code`,
    text: `Your SangeetX code is ${code}. Use it to ${action}. This code expires in 5 minutes. If you did not request it, ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:28px;background:#121212;color:#ffffff;border-radius:12px">
      <h1 style="color:#1ed760;font-size:26px">SangeetX</h1>
      <p>Use this code to ${action}:</p>
      <p style="font-size:36px;font-weight:bold;letter-spacing:8px;padding:20px;background:#242424;border-radius:8px;text-align:center">${code}</p>
      <p>This code expires in 5 minutes.</p>
      <p style="color:#b3b3b3;font-size:13px">If you did not request this code, you can ignore this email. Never share this code with anyone.</p>
    </div>`,
  };
}

export async function sendVerificationEmail(message, { client, idempotencyKey } = {}) {
  if (!client && !process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');
  const resend = client || new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send(verificationEmail(message), idempotencyKey ? { idempotencyKey } : undefined);
  if (error) throw new Error(`Resend ${error.name || 'error'}: ${error.message}`);
  if (!data?.id) throw new Error('Resend did not return an email ID');
  return data;
}
