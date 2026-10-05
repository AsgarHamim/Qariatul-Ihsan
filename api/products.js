const { isAuthenticated } = require('./_lib/auth');
const { getFile, commitFiles } = require('./_lib/github');

const CONTENT_PATH = 'content.json';
const IMAGE_DIR = 'cms-images';

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

async function loadContent() {
  const file = await getFile(CONTENT_PATH);
  return file
    ? JSON.parse(Buffer.from(file.contentBase64, 'base64').toString('utf8'))
    : { text: { en: {}, bn: {} }, images: {}, products: [] };
}

function clean(str) {
  return String(str || '').trim();
}

module.exports = async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Not authenticated' });

  if (req.method === 'POST') {
    let body = req.body;
    if (!body || typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); } catch (_) { body = {}; }
    }
    const { nameEn, nameBn, descEn, descBn, price, unitEn, unitBn, cat, dataUrl } = body || {};

    if (!clean(nameEn) || !price || !cat) {
      return res.status(400).json({ error: 'Product needs at least a title, price, and category.' });
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number.' });
    }

    const id = `custom-${Date.now()}`;
    const files = [];
    let imagePath = null;

    if (dataUrl && typeof dataUrl === 'string') {
      const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match) return res.status(400).json({ error: 'Image must be a valid image file.' });
      const mime = match[1];
      const base64 = match[2];
      const ext = EXT_BY_MIME[mime];
      if (!ext) return res.status(400).json({ error: `Unsupported image type: ${mime}` });
      if (base64.length > 6_000_000) return res.status(413).json({ error: 'Image is too large. Please use an image under ~4MB.' });
      imagePath = `${IMAGE_DIR}/${id}.${ext}`;
      files.push({ path: imagePath, contentBase64: base64 });
    }

    try {
      const existing = await loadContent();
      const product = {
        id,
        name: { en: clean(nameEn), bn: clean(nameBn) || clean(nameEn) },
        desc: { en: clean(descEn), bn: clean(descBn) || clean(descEn) },
        unit: { en: clean(unitEn) || 'each', bn: clean(unitBn) || 'প্রতিটি' },
        price: priceNum,
        cat: clean(cat),
        image: imagePath ? { path: `/${imagePath}`, v: Date.now() } : null,
        createdAt: new Date().toISOString(),
      };
      const products = [...(existing.products || []), product];
      const updated = {
        text: existing.text || { en: {}, bn: {} },
        images: existing.images || {},
        products,
        updatedAt: new Date().toISOString(),
      };
      files.push({ path: CONTENT_PATH, contentBase64: Buffer.from(JSON.stringify(updated, null, 2)).toString('base64') });
      await commitFiles(files, `Admin: add product ${product.name.en}`);
      return res.status(200).json({ ok: true, product });
    } catch (err) {
      return res.status(500).json({ error: String(err.message || err) });
    }
  }

  if (req.method === 'DELETE') {
    let body = req.body;
    if (!body || typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); } catch (_) { body = {}; }
    }
    const { id } = body || {};
    if (!id) return res.status(400).json({ error: 'Request must include id.' });
    try {
      const existing = await loadContent();
      const products = (existing.products || []).filter((p) => p.id !== id);
      const updated = {
        text: existing.text || { en: {}, bn: {} },
        images: existing.images || {},
        products,
        updatedAt: new Date().toISOString(),
      };
      await commitFiles(
        [{ path: CONTENT_PATH, contentBase64: Buffer.from(JSON.stringify(updated, null, 2)).toString('base64') }],
        `Admin: remove product ${id}`
      );
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: String(err.message || err) });
    }
  }

  res.setHeader('Allow', 'POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
};
