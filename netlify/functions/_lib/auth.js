// Shared JWT helpers for PCSHomes admin functions.
// Hand-rolled HS256 — no external dependencies.
const crypto = require('crypto');

function base64UrlEncode(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

function sign(payload, secret, expiresInSeconds) {
  if (!secret) throw new Error('JWT secret missing');
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = Object.assign({ iat: now, exp: now + (expiresInSeconds || 3600) }, payload);
  const headerEnc = base64UrlEncode(JSON.stringify(header));
  const bodyEnc = base64UrlEncode(JSON.stringify(body));
  const signingInput = headerEnc + '.' + bodyEnc;
  const sig = crypto.createHmac('sha256', secret).update(signingInput).digest();
  return signingInput + '.' + base64UrlEncode(sig);
}

function verify(token, secret) {
  if (!token || typeof token !== 'string' || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const signingInput = parts[0] + '.' + parts[1];
  const expectedSig = crypto.createHmac('sha256', secret).update(signingInput).digest();
  let providedSig;
  try { providedSig = base64UrlDecode(parts[2]); } catch (e) { return null; }
  if (providedSig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(providedSig, expectedSig)) return null;

  let payload;
  try { payload = JSON.parse(base64UrlDecode(parts[1]).toString('utf8')); }
  catch (e) { return null; }

  if (typeof payload.exp !== 'number' || Date.now() / 1000 >= payload.exp) return null;
  return payload;
}

// Express-style auth check for Phase 2 functions.
// Returns { ok: true, payload } or { ok: false, status, error }.
function requireAdmin(event) {
  const secret = process.env.ADMIN_JWT_SECRET;
  const auth = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return { ok: false, status: 401, error: 'Missing bearer token' };
  const payload = verify(m[1], secret);
  if (!payload) return { ok: false, status: 401, error: 'Invalid or expired token' };
  if (payload.role !== 'admin') return { ok: false, status: 403, error: 'Forbidden' };
  return { ok: true, payload: payload };
}

module.exports = { sign, verify, requireAdmin };
