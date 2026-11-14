import { randomInt, randomBytes, createHash } from 'node:crypto';
import { sendVerificationEmail } from '../services/email.js';
import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import User from '../models/User.js';
import Verification from '../models/Verification.js';
import { Router, HttpError, emailAddress, passwordValue, text, rateLimit } from '../utils/http.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { sendSession, cookieOptions, requestToken, revokeToken } from '../utils/tokens.js';

const router = Router();
const digest = (value) => createHash('sha256').update(value).digest('hex');
const purposeOf = (value = 'signup') => {
  if (!['signup', 'reset'].includes(value)) throw new HttpError(400, 'Invalid verification purpose');
  return value;
};
router.use(['/login', '/signup', '/send-otp', '/verify-otp', '/updtpass', '/forgetpass', '/emailCheck', '/google-login'], rateLimit({ limit: 40 }));

function proofFilter(email, purpose, proof) {
  if (typeof proof !== 'string' || !/^[a-f0-9]{64}$/.test(proof)) throw new HttpError(403, 'Verify your email first');
  return {
    email, purpose, verified: true, proofHash: digest(proof), expiresAt: { $gt: new Date() },
  };
}
async function checkProof(email, purpose, proof) {
  if (!await Verification.exists(proofFilter(email, purpose, proof))) throw new HttpError(403, 'Verification expired or already used. Request a new code.');
}
async function consumeProof(email, purpose, proof) {
  const verification = await Verification.findOneAndDelete(proofFilter(email, purpose, proof));
  if (!verification) throw new HttpError(403, 'Verification expired or already used. Request a new code.');
}

router.post('/signup', async (req, res) => {
  const email = emailAddress(req.body.email);
  const password = passwordValue(req.body.globalPassword);
  const name = text(req.body.userdata?.name, 'Name', 100);
  const gender = req.body.userdata?.gender;
  const dobValue = req.body.userdata?.dob;
  const dob = dobValue ? new Date(dobValue) : undefined;
  if (dob && (!Number.isFinite(dob.getTime()) || dob > new Date() || dob.getFullYear() < 1900)) throw new HttpError(400, 'Invalid date of birth');
  if (gender !== undefined && (typeof gender !== 'string' || gender.length > 40)) throw new HttpError(400, 'Invalid gender');
  if (await User.exists({ email })) throw new HttpError(400, 'Email already exists');
  await checkProof(email, 'signup', req.body.verificationToken);
  const hashed = await hashPassword(password);
  await consumeProof(email, 'signup', req.body.verificationToken);
  const user = await User.create({ email, password: hashed, name, gender, dob });
  sendSession(res, user, 201, 'Signup successful');
});

router.post('/emailCheck', async (req, res) => {
  const email = emailAddress(req.body.email);
  if (await User.exists({ email })) throw new HttpError(400, 'Email already exists');
  res.json({ msg: 'New Email' });
});

router.post('/login', async (req, res) => {
  const email = emailAddress(req.body.email);
  text(req.body.password, 'Password', 256);
  const user = await User.findOne({ email });
  if (!user || !await verifyPassword(req.body.password, user.password)) throw new HttpError(401, 'Invalid email or password');
  // Upgrade existing accounts after a successful login, without a forced reset.
  if (!user.password.startsWith('scrypt$')) {
    await User.updateOne({ _id: user._id, password: user.password }, { $set: { password: await hashPassword(req.body.password) } });
  }
  sendSession(res, user);
});

router.get('/logout', (req, res) => res.status(405).set('Allow', 'POST').json({ message: 'Use POST to log out' }));
router.post('/logout', async (req, res) => {
  await revokeToken(requestToken(req));
  res.clearCookie('token', cookieOptions());
  req.logout?.(() => req.session?.destroy(() => {}));
  if (req.is('application/json')) return res.json({ message: 'Logged out' });
  res.redirect(303, '/');
});

router.post('/google-login', async (req, res) => {
  const token = text(req.body.token, 'Token', 10000);
  if (!getApps().length && !req.app.locals.services.verifyGoogleToken) throw new HttpError(503, 'Google login is not configured');
  let decoded;
  try { decoded = await (req.app.locals.services.verifyGoogleToken || ((value) => getAuth().verifyIdToken(value)))(token); }
  catch { throw new HttpError(401, 'Invalid Google token'); }
  if (decoded?.email_verified !== true) throw new HttpError(401, 'Google email is not verified');
  const email = emailAddress(decoded.email);
  const user = await User.findOneAndUpdate({ email }, { $setOnInsert: { email, name: decoded.name } }, { upsert: true, new: true });
  sendSession(res, user);
});

router.post('/send-otp', async (req, res) => {
  const email = emailAddress(req.body.email);
  const purpose = purposeOf(req.body.purpose);
  const exists = await User.exists({ email });
  if (purpose === 'signup' && exists) throw new HttpError(400, 'Email already exists');
  if (purpose === 'reset' && !exists) throw new HttpError(400, 'Email not found');
  const now = new Date();
  if (await Verification.exists({ email, purpose, sentAt: { $gt: new Date(Date.now() - 60000) } })) {
    throw new HttpError(429, 'Please wait a minute before requesting another code');
  }
  const code = String(randomInt(1000, 10000));
  const codeHash = digest(email + ':' + purpose + ':' + code + ':' + process.env.JWT_SECRET);
  // The unique index also prevents concurrent sends bypassing the cooldown.
  let record;
  try {
    record = await Verification.findOneAndUpdate({ email, purpose, sentAt: { $lte: new Date(Date.now() - 60000) } }, {
      $set: { codeHash, sentAt: now, expiresAt: new Date(Date.now() + 300000), attempts: 0, verified: false },
      $unset: { proofHash: 1 },
    }, { upsert: true, new: true });
  } catch (error) {
    if (error.code === 11000) throw new HttpError(429, 'Please wait before requesting another code');
    throw error;
  }
  try {
    if (req.app.locals.services.sendOtp) await req.app.locals.services.sendOtp({ email, code, purpose });
    else await sendVerificationEmail({ email, code, purpose }, { idempotencyKey: `otp-${record._id}-${now.getTime()}` });
  } catch {
    await Verification.deleteOne({ _id: record._id, codeHash });
    throw new HttpError(503, 'Unable to send verification email');
  }
  res.json({ success: true, message: 'Verification code sent', expiresIn: 300 });
});

router.post('/verify-otp', async (req, res) => {
  const email = emailAddress(req.body.email);
  const purpose = purposeOf(req.body.purpose);
  const code = text(req.body.otp, 'Code', 4);
  if (!/^\d{4}$/.test(code)) throw new HttpError(400, 'Enter the 4-digit code');
  const record = await Verification.findOneAndUpdate({
    email, purpose, verified: false, attempts: { $lt: 5 }, expiresAt: { $gt: new Date() },
  }, { $inc: { attempts: 1 } }, { new: true });
  if (!record || record.codeHash !== digest(email + ':' + purpose + ':' + code + ':' + process.env.JWT_SECRET)) {
    throw new HttpError(400, 'Invalid or expired verification code');
  }
  const proof = randomBytes(32).toString('hex');
  const result = await Verification.updateOne({ _id: record._id, codeHash: record.codeHash, verified: false }, {
    $set: { verified: true, proofHash: digest(proof), expiresAt: new Date(Date.now() + 600000) },
  });
  if (!result.modifiedCount) throw new HttpError(400, 'Code already used');
  res.json({ success: true, verificationToken: proof });
});

router.post('/forgetpass', async (req, res) => {
  const email = emailAddress(req.body.forgetemail);
  if (!await User.exists({ email })) throw new HttpError(400, 'Email not found');
  res.json({ ischeck: true, message: 'Request a verification code to reset your password' });
});

router.post('/updtpass', async (req, res) => {
  const email = emailAddress(req.body.email);
  const password = passwordValue(req.body.newpassword);
  if (!await User.exists({ email })) throw new HttpError(400, 'Email not found');
  await checkProof(email, 'reset', req.body.verificationToken);
  const hashed = await hashPassword(password);
  await consumeProof(email, 'reset', req.body.verificationToken);
  await User.updateOne({ email }, { $set: { password: hashed }, $inc: { tokenVersion: 1 } });
  res.clearCookie('token', cookieOptions());
  res.json({ message: 'Password Updated' });
});
export default router;
