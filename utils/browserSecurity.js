import cors from 'cors';

export function trustedOrigins(value = process.env.TRUSTED_ORIGINS || '') {
  return new Set(value.split(',').map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const url = new URL(entry);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== entry) throw new Error('TRUSTED_ORIGINS must contain exact http(s) origins without trailing slashes');
    return url.origin;
  }));
}

export function originAllowed(req, origins) {
  const origin = req.headers.origin;
  if (!origin) return true; // Native apps and server clients do not send Origin.
  if (typeof origin !== 'string' || origin === 'null') return false;
  const forwarded = Number(process.env.TRUST_PROXY) > 0 ? req.headers['x-forwarded-proto']?.split(',')[0].trim() : undefined;
  const protocol = req.protocol || forwarded || (req.socket.encrypted ? 'https' : 'http');
  if (origin === `${protocol}://${req.headers.host}` || origins.has(origin)) return true;
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    if (['http:', 'https:'].includes(url.protocol)) {
      if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1') return true;
      if (/^192\.168\.\d+\.\d+$/.test(host) || /^10\.\d+\.\d+\.\d+$/.test(host) || /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host)) return true;
    }
  } catch {}
  return false;
}

export function browserSecurity(origins) {
  const crossOrigin = cors((req, callback) => callback(null, {
    origin: req.headers.origin || false, credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Auth-Token'],
  }));
  return (req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
    });
    if (process.env.NODE_ENV === 'production' && req.secure) res.set('Strict-Transport-Security', 'max-age=31536000');
    const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    const site = req.headers['sec-fetch-site'];
    let valid = originAllowed(req, origins);
    if (unsafe && !req.headers.origin) {
      if (req.headers.referer) {
        try { valid = originAllowed({ ...req, protocol: req.protocol, headers: { ...req.headers, origin: new URL(req.headers.referer).origin } }, origins); }
        catch { valid = false; }
      } else if (site && site !== 'same-origin') valid = false;
      else if (!site && (req.headers.cookie || req.is('application/x-www-form-urlencoded')) &&
        !req.headers.authorization && !req.headers['x-auth-token']) valid = false;
    }
    if (!valid) return res.status(403).json({ message: 'Browser origin is not allowed' });
    crossOrigin(req, res, next);
  };
}
