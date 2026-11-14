import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { Passport } from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import mongoose from 'mongoose';
import { authenticateToken } from './middlewares/auth.js';
import { asyncHandler, errorHandler, emailAddress, HttpError, text } from './utils/http.js';
import { issueToken, cookieOptions } from './utils/tokens.js';
import authRoutes from './routes/authRoutes.js';
import playlistRoutes from './routes/playlistRoutes.js';
import songRoutes from './routes/songRoutes.js';
import userRoutes from './routes/userRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { browserSecurity, trustedOrigins } from './utils/browserSecurity.js';
import { googleProfileUser } from './services/google.js';

const directory = path.dirname(fileURLToPath(import.meta.url));

export function createApp({ services = {} } = {}) {
  const app = express();
  app.locals.services = services;
  app.locals.trustedOrigins = trustedOrigins();
  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(directory, 'views'));
  // Set this only to the number of trusted reverse proxies in your deployment.
  if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY);
    if (!Number.isSafeInteger(hops) || hops < 0) throw new Error('TRUST_PROXY must be a nonnegative proxy hop count');
    app.set('trust proxy', hops);
  }
  app.use(browserSecurity(app.locals.trustedOrigins));
  app.get('/vendor/purify.js', (req, res) => res.sendFile(path.join(directory, 'node_modules/dompurify/dist/purify.es.mjs')));
  app.use(express.static(path.join(directory, 'public')));
  app.use(express.static(path.join(directory, 'assets')));
  app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '16kb' }));
  app.use(cookieParser());
  app.use((req, res, next) => { req.body ??= {}; next(); });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.CALLBACK_URL && process.env.SESSION_SECRET) {
    const passport = new Passport();
    app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false,
      cookie: { ...cookieOptions(), maxAge: 600000 } }));
    app.use(passport.initialize());
    passport.use(new GoogleStrategy({ clientID: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL, state: true }, async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await googleProfileUser(profile);
        done(null, user);
      } catch (error) { done(error); }
    }));
    app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
    app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login', session: false }), (req, res) => {
      res.cookie('token', issueToken(req.user), { ...cookieOptions(), maxAge: 30 * 86400000 });
      res.redirect('/');
    });
  } else app.get(['/auth/google', '/auth/google/callback'], (req, res) => res.status(503).send('Google login is not configured. Please use email login.'));

  app.get('/', asyncHandler(async (req, res) => {
    const user = req.cookies.token ? await authenticateToken(req.cookies.token) : null;
    res.render('sangeetX', { sess: Boolean(user), message: user ? 'Session Active' : 'No active session' });
  }));
  app.get('/login', (req, res) => res.render('sangeetX_login'));
  app.get('/signup', (req, res) => res.render('sangeetX_signup'));
  app.get('/download', (req, res) => res.render('download'));
  app.get('/profile', asyncHandler(async (req, res) => {
    if (!await authenticateToken(req.cookies.token)) return res.redirect('/login');
    res.render('profile');
  }));
  app.post('/pass', asyncHandler(async (req, res) => {
    const email = emailAddress(req.body.email);
    const verificationToken = text(req.body.verificationToken, 'Verification token', 64);
    if (!/^[a-f0-9]{64}$/.test(verificationToken)) throw new HttpError(403, 'Verify your email first');
    res.render('signup_pass', { email, verificationToken });
  }));
  app.get(['/health', '/healthz', '/api/health'], (req, res) => {
    const connected = mongoose.connection.readyState === 1;
    res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'degraded', database: connected ? 'connected' : 'disconnected', uptime: Math.floor(process.uptime()), timestamp: new Date().toISOString() });
  });

  app.use(authRoutes, playlistRoutes, songRoutes, userRoutes, aiRoutes);
  app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
  app.use(errorHandler);
  return app;
}
