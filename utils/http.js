import express from 'express';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve().then(() => handler(req, res, next)).catch(next);

// Express 4 does not forward rejected async route handlers to error middleware.
export function Router() {
  const router = express.Router();
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const register = router[method].bind(router);
    router[method] = (path, ...handlers) => register(path, ...handlers.flat().map(asyncHandler));
  }
  return router;
}

export function text(value, label, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new HttpError(400, `${label} is required (maximum ${max} characters)`);
  }
  return value.trim();
}

export function emailAddress(value) {
  const email = text(value, 'Email', 254).toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new HttpError(400, 'Invalid email address');
  return email;
}

export function passwordValue(value) {
  if (typeof value !== 'string' || value.length < 6 || value.length > 256) throw new HttpError(400, 'Password must contain 6 to 256 characters');
  return value;
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  if (['ValidationError', 'CastError'].includes(error.name)) status = 400;
  if (error.code === 11000) status = 409;
  if (/Mongo.*(Selection|Network|Timeout)/.test(error.name)) status = 503;
  const message = status >= 500 ? 'Service temporarily unavailable. Please try again.' :
    error.code === 11000 ? 'This record already exists' : error.message;
  if (status >= 500) console.error(`${req.method} ${req.path}: ${error.name}`);
  res.status(status).json({ success: false, message, error: message, msg: message });
}

export function rateLimit({ limit = 20, windowMs = 60000, keyOf = (req) => req.ip } = {}) {
  const applications = new WeakMap();
  return (req, res, next) => {
    const now = Date.now();
    let state = applications.get(req.app);
    if (!state) { state = { clients: new Map(), sweepAt: 0 }; applications.set(req.app, state); }
    const { clients } = state;
    if (now >= state.sweepAt) {
      for (const [key, value] of clients) if (value.reset <= now) clients.delete(key);
      state.sweepAt = now + Math.min(windowMs, 60000);
    }
    const key = keyOf(req);
    let entry = clients.get(key);
    if (!entry && clients.size >= 10000) return res.status(429).set('Retry-After', '60').json({ message: 'Too many requests. Please try again shortly.' });
    if (!entry || entry.reset <= now) entry = { count: 0, reset: now + windowMs };
    entry.count++;
    clients.set(key, entry);
    if (entry.count > limit) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ message: 'Too many requests. Please try again shortly.' });
    }
    next();
  };
}
