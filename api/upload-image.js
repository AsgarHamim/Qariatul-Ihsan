const { isAuthenticated } = require('./_lib/auth');
const { getFile, putFile } = require('./_lib/github');

const CONTENT_PATH = 'content.json';
const IMAGE_DIR = 'cms-images';

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

module.exports = async (req, res) => {
  if (req.method === 'DELETE') {
    if (!isAuthenticated(req)) return res.status(401).json({ error: 'Not authenticated' });
    let body = req.body;
    if (!body || typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); } catch (_) { body = {}; }
    }
    const { slotId } = body || {};
    if (!slotId) return res.status(400).json({ error: 'Request must include slotId.' });
    const safeSlot = String(slotId).replace(/[^a-zA-Z0-9_-]/g, '');
    try {
      const existingFile = await getFile(CONTENT_PATH);
      const existing = existingFile
        ? JSON.parse(Buffer.from(existingFile.contentBase64, 'base64').toString('utf8'))
        : { text: { en: {}, bn: {} }, images: {} };
      const images = { ...(existing.images || {}) };
      delete images[safeSlot];
      const updated = { text: existing.text || { en: {}, bn: {} }, images, updatedAt: new Date().toISOString() };
      const contentBase64 = Buffer.from(JSON.stringify(updated, null, 2)).toString('base64');
      await putFile(CONTENT_PATH, contentBase64, `Admin: restore original image for ${safeSlot}`);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: String(err.message || err) });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Not authenticated' });

  let body = req.body;
  if (!body || typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch (_) { body = {}; }
  }

  const { slotId, dataUrl } = body || {};
  if (!slotId || !dataUrl || typeof dataUrl !== 'string') {
    return res.status(400).json({ error: 'Request must include slotId and dataUrl.' });
  }

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return res.status(400).json({ error: 'dataUrl must be a base64 image data URI.' });
  const mime = match[1];
  const base64 = match[2];
  const ext = EXT_BY_MIME[mime];
  if (!ext) return res.status(400).json({ error: `Unsupported image type: ${mime}` });

  // Rough size guard (base64 is ~4/3 the size of binary); keep well under serverless body limits.
  if (base64.length > 6_000_000) {
    return res.status(413).json({ error: 'Image is too large. Please use an image under ~4MB.' });
  }

  const safeSlot = String(slotId).replace(/[^a-zA-Z0-9_-]/g, '');
  const imagePath = `${IMAGE_DIR}/${safeSlot}.${ext}`;

  try {
    await putFile(imagePath, base64, `Admin: update image for ${safeSlot}`);

    const existingFile = await getFile(CONTENT_PATH);
    const existing = existingFile
      ? JSON.parse(Buffer.from(existingFile.contentBase64, 'base64').toString('utf8'))
      : { text: { en: {}, bn: {} }, images: {} };

    const version = Date.now();
    const updated = {
      text: existing.text || { en: {}, bn: {} },
      images: { ...(existing.images || {}), [safeSlot]: { path: `/${imagePath}`, v: version } },
      updatedAt: new Date().toISOString(),
    };

    const contentBase64 = Buffer.from(JSON.stringify(updated, null, 2)).toString('base64');
    await putFile(CONTENT_PATH, contentBase64, `Admin: point ${safeSlot} to new image`);

    return res.status(200).json({ ok: true, path: `/${imagePath}?v=${version}` });
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
};
