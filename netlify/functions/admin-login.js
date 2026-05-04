// POST /.netlify/functions/admin-login
// Body: { password: string }
// Success: 200 { token: string } — JWT signed with ADMIN_JWT_SECRET, 24h expiry, role=admin
// Failure: 401 { error: string } | 429 { error: string } | 405 / 400
const crypto = require('crypto');
const { sign } = require('./_lib/auth');

const TOKEN_EXPIRY_SECONDS = 60 * 60 * 24; // 24h
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1h
const RATE_LIMIT_MAX = 5; // attempts per IP per window

// Module-scope map. Persists across warm invocations on the same container,
// not across cold starts or distinct lambda instances. Good enough as a
// throttle on a low-traffic admin endpoint; not a hard guarantee.
const attempts = new Map();

function ipFromEvent(event) {
  const headers = event.headers || {};
  const xff = headers['x-forwarded-for'] || headers['X-Forwarded-For'];
  if (xff) return String(xff).split(',')[0].trim();
  return headers['client-ip'] || headers['x-nf-client-connection-ip'] || 'unknown';
}

function pruneExpired(now) {
  for (const [ip, rec] of attempts) {
    if (rec.windowStart + RATE_LIMIT_WINDOW_MS < now) attempts.delete(ip);
  }
}

function recordAttempt(ip) {
  const now = Date.now();
  pruneExpired(now);
  let rec = attempts.get(ip);
  if (!rec || rec.windowStart + RATE_LIMIT_WINDOW_MS < now) {
    rec = { count: 0, windowStart: now };
    attempts.set(ip, rec);
  }
  rec.count += 1;
  return rec;
}

function constantTimeEqual(a, b) {
  const aBuf = Buffer.from(String(a), 'utf8');
  const bBuf = Buffer.from(String(b), 'utf8');
  if (aBuf.length !== bBuf.length) {
    // Still do a comparison to avoid leaking length via timing.
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function jsonResponse(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const jwtSecret = process.env.ADMIN_JWT_SECRET;
  if (!adminPassword || !jwtSecret) {
    return jsonResponse(500, { error: 'Server not configured' });
  }

  const ip = ipFromEvent(event);
  const rec = recordAttempt(ip);
  if (rec.count > RATE_LIMIT_MAX) {
    return jsonResponse(429, { error: 'Too many attempts. Try again in an hour.' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(400, { error: 'Invalid JSON body' }); }

  const submitted = typeof body.password === 'string' ? body.password : '';
  if (!submitted) return jsonResponse(400, { error: 'Password required' });

  if (!constantTimeEqual(submitted, adminPassword)) {
    return jsonResponse(401, { error: 'Invalid password' });
  }

  // Successful login resets the IP's counter so the admin isn't locked
  // out by their own (presumed legitimate) typos.
  attempts.delete(ip);

  const token = sign({ role: 'admin' }, jwtSecret, TOKEN_EXPIRY_SECONDS);
  return jsonResponse(200, { token: token, expiresIn: TOKEN_EXPIRY_SECONDS });
};
