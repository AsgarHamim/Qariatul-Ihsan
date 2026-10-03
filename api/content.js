const { isAuthenticated } = require('./_lib/auth');
const { getFile, putFile } = require('./_lib/github');

const CONTENT_PATH = 'content.json';

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    if (!isAuthenticated(req)) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const file = await getFile(CONTENT_PATH);
      if (!file) return res.status(404).json({ error: 'content.json not found' });
      const json = JSON.parse(Buffer.from(file.contentBase64, 'base64').toString('utf8'));
      return res.status(200).json(json);
    } catch (err) {
      return res.status(500).json({ error: String(err.message || err) });
    }
  }

  if (req.method === 'POST') {
    if (!isAuthenticated(req)) return res.status(401).json({ error: 'Not authenticated' });

    let body = req.body;
    if (!body || typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); } catch (_) { body = {}; }
    }

    const { text } = body || {};
    if (!text || typeof text !== 'object' || !text.en || !text.bn) {
      return res.status(400).json({ error: 'Request must include text.en and text.bn objects.' });
    }

    try {
      const existingFile = await getFile(CONTENT_PATH);
      const existing = existingFile
        ? JSON.parse(Buffer.from(existingFile.contentBase64, 'base64').toString('utf8'))
        : { text: { en: {}, bn: {} }, images: {} };

      const updated = {
        text: {
          en: { ...existing.text.en, ...text.en },
          bn: { ...existing.text.bn, ...text.bn },
        },
        images: existing.images || {},
        updatedAt: new Date().toISOString(),
      };

      const contentBase64 = Buffer.from(JSON.stringify(updated, null, 2)).toString('base64');
      await putFile(CONTENT_PATH, contentBase64, 'Admin: update site text');

      return res.status(200).json({ ok: true, updatedAt: updated.updatedAt });
    } catch (err) {
      return res.status(500).json({ error: String(err.message || err) });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
