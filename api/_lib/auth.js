const crypto = require('crypto');

const COOKIE_NAME = 'qi_admin_session';
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(input) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4) input += '=';
  return Buffer.from(input, 'base64').toString('utf8');
}

function sign(payloadObj) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  const payload = base64url(JSON.stringify(payloadObj));
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

function verify(token) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const sigBuf = Buffer.from(sig, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  let data;
  try { data = JSON.parse(base64urlDecode(payload)); } catch (_) { return null; }
  if (!data.exp || Date.now() > data.exp) return null;
  return data;
}

function createSessionCookie() {
  const token = sign({ role: 'admin', exp: Date.now() + MAX_AGE_SECONDS * 1000 });
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SECONDS}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  });
  return out;
}

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  return !!verify(token);
}

module.exports = {
  COOKIE_NAME,
  createSessionCookie,
  clearSessionCookie,
  parseCookies,
  isAuthenticated,
};
