import jwt from 'jsonwebtoken';
import { Router, HttpError, rateLimit } from '../utils/http.js';
import authMiddleware from '../middlewares/auth.js';
import { requestToken, tokenDigest } from '../utils/tokens.js';
import PushDevice from '../models/PushDevice.js';

const router = Router();
const limit = rateLimit({ limit: 20, keyOf: (req) => String(req.user._id) });
export function validPushToken(token) {
  return typeof token === 'string' && /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,200}\]$/.test(token);
}
router.post('/notifications/devices', authMiddleware, limit, async (req, res) => {
  const { token, platform } = req.body;
  if (!validPushToken(token) || !['android', 'ios'].includes(platform)) throw new HttpError(400, 'Invalid notification device');
  const session = requestToken(req);
  const decoded = jwt.decode(session);
  await PushDevice.findOneAndUpdate({ token }, { $set: {
    user: req.user._id, platform, sessionDigest: tokenDigest(session), tokenVersion: req.user.tokenVersion || 0,
    expiresAt: new Date(decoded.exp * 1000),
  } }, { upsert: true, runValidators: true });
  res.status(201).json({ registered: true });
});
router.delete('/notifications/devices', authMiddleware, limit, async (req, res) => {
  if (!validPushToken(req.body.token)) throw new HttpError(400, 'Invalid notification device');
  await PushDevice.deleteOne({ token: req.body.token, user: req.user._id, sessionDigest: tokenDigest(requestToken(req)) });
  res.json({ registered: false });
});
export default router;
