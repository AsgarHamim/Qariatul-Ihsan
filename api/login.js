const { createSessionCookie } = require('./_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (!body || typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch (_) { body = {}; }
  }

  const password = (body && body.password) || '';
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return res.status(500).json({ error: 'Admin password is not configured on the server.' });
  }

  if (password !== expected) {
    // small delay to slow down brute-force guessing
    await new Promise((r) => setTimeout(r, 400));
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  res.setHeader('Set-Cookie', createSessionCookie());
  return res.status(200).json({ ok: true });
};
