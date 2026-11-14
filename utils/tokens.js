import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'node:crypto';
import RevokedToken from '../models/RevokedToken.js';

export const tokenDigest = (token) => createHash('sha256').update(token).digest('hex');
export const requestToken = (req) => req.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1] || req.headers['x-auth-token'] || req.cookies?.token;

export async function revokeToken(token) {
  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { return; }
  if (!Number.isFinite(decoded.exp)) return;
  await RevokedToken.updateOne({ _id: tokenDigest(token) }, { $set: { expiresAt: new Date(decoded.exp * 1000) } }, { upsert: true });
}

export function issueToken(user) {
  return jwt.sign({ id: user._id, email: user.email, v: user.tokenVersion || 0 }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '30d', jwtid: randomUUID() });
}
export const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
export function sendSession(res, user, status = 200, message = 'Login successful') {
  const token = issueToken(user);
  res.cookie('token', token, { ...cookieOptions(), maxAge: 30 * 86400000 });
  return res.status(status).json({ message, token, user: { id: user._id, email: user.email, name: user.name } });
}
