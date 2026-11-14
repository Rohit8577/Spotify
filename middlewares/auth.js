import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import RevokedToken from '../models/RevokedToken.js';
import { requestToken, tokenDigest } from '../utils/tokens.js';

export async function authenticateToken(token) {
  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { return null; }
  if (!decoded || !mongoose.isObjectIdOrHexString(decoded.id) || !Number.isFinite(decoded.exp)) return null;
  const [user, revoked] = await Promise.all([
    User.findById(decoded.id).select('-password'), RevokedToken.exists({ _id: tokenDigest(token) }),
  ]);
  if (!user || revoked || (decoded.v || 0) !== (user.tokenVersion || 0)) return null;
  return user;
}

export default async function authMiddleware(req, res, next) {
  const token = requestToken(req);
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });
  try {
    req.user = await authenticateToken(token);
    if (!req.user) return res.status(401).json({ message: 'Invalid or expired token.' });
    next();
  } catch (error) { next(error); }
}
