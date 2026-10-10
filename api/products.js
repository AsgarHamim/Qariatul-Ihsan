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
    : { text: { en: {}, bn: {} }, images: {}, products: [], productOverrides: {} };
}

function clean(str) {
  return String(str || '').trim();
}

function isCustomId(id) {
  return typeof id === 'string' && id.indexOf('custom-') === 0;
}

function imageFromUpload(dataUrl, idForPath) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw Object.assign(new Error('Image must be a valid image file.'), { status: 400 });
  const mime = match[1];
  const base64 = match[2];
  const ext = EXT_BY_MIME[mime];
  if (!ext) throw Object.assign(new Error(`Unsupported image type: ${mime}`), { status: 400 });
  if (base64.length > 6_000_000) throw Object.assign(new Error('Image is too large. Please use an image under ~4MB.'), { status: 413 });
  const imagePath = `${IMAGE_DIR}/${idForPath}.${ext}`;
  return { imagePath, base64 };
}

module.exports = async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Not authenticated' });

  let body = req.body;
  if (!body || typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch (_) { body = {}; }
  }

  if (req.method === 'POST') {
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

    try {
      if (dataUrl && typeof dataUrl === 'string') {
        const img = imageFromUpload(dataUrl, id);
        imagePath = img.imagePath;
        files.push({ path: imagePath, contentBase64: img.base64 });
      }

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
        productOverrides: existing.productOverrides || {},
        updatedAt: new Date().toISOString(),
      };
      files.push({ path: CONTENT_PATH, contentBase64: Buffer.from(JSON.stringify(updated, null, 2)).toString('base64') });
      await commitFiles(files, `Admin: add product ${product.name.en}`);
      return res.status(200).json({ ok: true, product });
    } catch (err) {
      return res.status(err.status || 500).json({ error: String(err.message || err) });
    }
  }

  if (req.method === 'PUT') {
    const { id, nameEn, nameBn, descEn, descBn, price, unitEn, unitBn, cat, dataUrl } = body || {};
    if (!id) return res.status(400).json({ error: 'Request must include id.' });
    if (!clean(nameEn) || !price || !cat) {
      return res.status(400).json({ error: 'Product needs at least a title, price, and category.' });
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number.' });
    }

    const files = [];
    try {
      const existing = await loadContent();

      const name = { en: clean(nameEn), bn: clean(nameBn) || clean(nameEn) };
      const desc = { en: clean(descEn), bn: clean(descBn) || clean(descEn) };
      const unit = { en: clean(unitEn) || 'each', bn: clean(unitBn) || 'প্রতিটি' };
      const catClean = clean(cat);

      if (isCustomId(id)) {
        const products = existing.products || [];
        const idx = products.findIndex((p) => p.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Product not found.' });
        const current = products[idx];
        let image = current.image || null;
        if (dataUrl && typeof dataUrl === 'string') {
          const img = imageFromUpload(dataUrl, id);
          files.push({ path: img.imagePath, contentBase64: img.base64 });
          image = { path: `/${img.imagePath}`, v: Date.now() };
        }
        products[idx] = { ...current, name, desc, unit, price: priceNum, cat: catClean, image };
        const updated = {
          text: existing.text || { en: {}, bn: {} },
          images: existing.images || {},
          products,
          productOverrides: existing.productOverrides || {},
          updatedAt: new Date().toISOString(),
        };
        files.push({ path: CONTENT_PATH, contentBase64: Buffer.from(JSON.stringify(updated, null, 2)).toString('base64') });
        await commitFiles(files, `Admin: update product ${name.en}`);
        return res.status(200).json({ ok: true, product: products[idx] });
      }

      const baseId = String(id).replace(/[^0-9]/g, '');
      if (!baseId) return res.status(400).json({ error: 'Invalid product id.' });

      const productOverrides = { ...(existing.productOverrides || {}) };
      productOverrides[baseId] = { name, desc, unit, price: priceNum, cat: catClean };

      const images = { ...(existing.images || {}) };
      if (dataUrl && typeof dataUrl === 'string') {
        const slotId = `store-product-${baseId}`;
        const img = imageFromUpload(dataUrl, slotId);
        files.push({ path: img.imagePath, contentBase64: img.base64 });
        images[slotId] = { path: `/${img.imagePath}`, v: Date.now() };
      }

      const updated = {
        text: existing.text || { en: {}, bn: {} },
        images,
        products: existing.products || [],
        productOverrides,
        updatedAt: new Date().toISOString(),
      };
      files.push({ path: CONTENT_PATH, contentBase64: Buffer.from(JSON.stringify(updated, null, 2)).toString('base64') });
      await commitFiles(files, `Admin: update product ${name.en}`);
      return res.status(200).json({ ok: true, override: productOverrides[baseId] });
    } catch (err) {
      return res.status(err.status || 500).json({ error: String(err.message || err) });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = body || {};
    if (!id) return res.status(400).json({ error: 'Request must include id.' });
    if (!isCustomId(id)) {
      return res.status(400).json({ error: 'Original store products cannot be removed, only edited.' });
    }
    try {
      const existing = await loadContent();
      const products = (existing.products || []).filter((p) => p.id !== id);
      const updated = {
        text: existing.text || { en: {}, bn: {} },
        images: existing.images || {},
        products,
        productOverrides: existing.productOverrides || {},
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

  res.setHeader('Allow', 'POST, PUT, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
};
