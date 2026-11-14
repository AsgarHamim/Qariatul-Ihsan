const crypto = require('crypto');
const { isAuthenticated } = require('./_lib/auth');
const { getFile, commitFiles, listDir, getBlobBase64 } = require('./_lib/github');
const { encryptJson, decryptJson } = require('./_lib/crypt');
const runtime = require('../cms-runtime.js');

const ORDER_DIR = 'orders';
const STATUSES = ['pending', 'confirmed', 'delivered', 'cancelled'];

function clean(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
}

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/[^\d+]/g, '');
  const m = digits.match(/^(?:\+?88)?(01[3-9]\d{8})$/);
  return m ? m[1] : null;
}

function bnToEnDigits(s) {
  return String(s || '').replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d));
}

async function loadContent() {
  const file = await getFile('content.json');
  return file ? JSON.parse(Buffer.from(file.contentBase64, 'base64').toString('utf8')) : {};
}

function resolveCatalog(content) {
  const overrides = content.productOverrides || {};
  const map = new Map();
  runtime.baseProducts.forEach((p) => {
    const o = overrides[String(p.id)] || {};
    map.set(String(p.id), {
      id: String(p.id),
      name: o.name || p.name,
      unit: o.unit || p.unit,
      price: typeof o.price === 'number' ? o.price : p.price,
    });
  });
  (content.products || []).forEach((p) => {
    map.set(String(p.id), { id: String(p.id), name: p.name, unit: p.unit, price: Number(p.price) });
  });
  return map;
}

function newOrderNo(now) {
  const y = String(now.getUTCFullYear()).slice(2);
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const rnd = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `QI-${y}${m}${d}-${rnd}`;
}

function stamp(now) {
  return now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

async function commitWithRetry(files, message) {
  let lastErr;
  for (let i = 0; i < 4; i += 1) {
    try {
      return await commitFiles(files, message);
    } catch (err) {
      lastErr = err;
      if (err.status !== 422 && err.status !== 409) throw err;
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw lastErr;
}

async function createOrder(req, res, body) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin) {
    try {
      if (new URL(origin).host !== host) return res.status(403).json({ error: 'Forbidden' });
    } catch (_) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }
  if (body.website) return res.status(400).json({ error: 'Invalid request' });

  const c = body.customer || {};
  const name = clean(c.name, 80);
  const phone = normalizePhone(bnToEnDigits(c.phone));
  const email = clean(c.email, 120);
  const city = clean(c.city, 80);
  const address = clean(c.address, 300);
  const notes = clean(c.notes, 300);
  if (name.length < 2) return res.status(400).json({ error: 'name', field: 'name' });
  if (!phone) return res.status(400).json({ error: 'phone', field: 'phone' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'email', field: 'email' });
  if (city.length < 2) return res.status(400).json({ error: 'city', field: 'city' });
  if (address.length < 8) return res.status(400).json({ error: 'address', field: 'address' });

  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 60) : [];
  if (!rawItems.length) return res.status(400).json({ error: 'empty', field: 'items' });

  try {
    const content = await loadContent();
    const catalog = resolveCatalog(content);
    const merged = new Map();
    for (const it of rawItems) {
      const id = String(it && it.id);
      const qty = Math.floor(Number(it && it.qty));
      if (!catalog.has(id) || !Number.isFinite(qty) || qty < 1 || qty > 99) {
        return res.status(400).json({ error: 'items', field: 'items' });
      }
      merged.set(id, Math.min(99, (merged.get(id) || 0) + qty));
    }

    const items = [];
    let subtotal = 0;
    merged.forEach((qty, id) => {
      const p = catalog.get(id);
      const lineTotal = p.price * qty;
      subtotal += lineTotal;
      items.push({ id, name: p.name, unit: p.unit, unitPrice: p.price, qty, lineTotal });
    });

    const fee = Number(content.settings && content.settings.deliveryFee);
    const deliveryFee = Number.isFinite(fee) && fee > 0 ? fee : 0;
    const now = new Date();
    const order = {
      orderNo: newOrderNo(now),
      createdAt: now.toISOString(),
      status: 'pending',
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
      lang: body.lang === 'bn' ? 'bn' : 'en',
      customer: { name, phone, email, city, address, notes },
      items,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
    };

    const file = `${ORDER_DIR}/${stamp(now)}-${order.orderNo}.enc`;
    await commitWithRetry(
      [{ path: file, contentBase64: Buffer.from(encryptJson(order)).toString('base64') }],
      `Order ${order.orderNo}`
    );
    return res.status(200).json({ ok: true, order });
  } catch (err) {
    return res.status(500).json({ error: 'server', detail: String(err.message || err) });
  }
}

async function listOrders(res) {
  try {
    const files = (await listDir(ORDER_DIR)).filter((f) => f.name.endsWith('.enc'));
    files.sort((a, b) => (a.name < b.name ? 1 : -1));
    const top = files.slice(0, 150);
    const orders = [];
    for (let i = 0; i < top.length; i += 10) {
      const batch = await Promise.all(
        top.slice(i, i + 10).map(async (f) => {
          try {
            const b64 = await getBlobBase64(f.sha);
            const order = decryptJson(Buffer.from(b64, 'base64').toString('utf8'));
            return { ...order, file: f.name };
          } catch (_) {
            return null;
          }
        })
      );
      batch.forEach((o) => o && orders.push(o));
    }
    return res.status(200).json({ orders, total: files.length });
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
}

async function updateOrder(res, body) {
  const file = clean(body.file, 120);
  const status = clean(body.status, 20);
  if (!/^\d{14}-QI-\d{6}-[0-9A-F]{6}\.enc$/.test(file) || !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  try {
    const existing = await getFile(`${ORDER_DIR}/${file}`);
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    const order = decryptJson(Buffer.from(existing.contentBase64, 'base64').toString('utf8'));
    order.status = status;
    if (status === 'delivered') order.paymentStatus = 'paid';
    else if (status === 'cancelled') order.paymentStatus = 'void';
    else order.paymentStatus = 'unpaid';
    order.updatedAt = new Date().toISOString();
    await commitWithRetry(
      [{ path: `${ORDER_DIR}/${file}`, contentBase64: Buffer.from(encryptJson(order)).toString('base64') }],
      `Order ${order.orderNo}: ${status}`
    );
    return res.status(200).json({ ok: true, order: { ...order, file } });
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
}

module.exports = async (req, res) => {
  let body = req.body;
  if (!body || typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch (_) { body = {}; }
  }

  if (req.method === 'POST') return createOrder(req, res, body);

  if (req.method === 'GET' || req.method === 'PATCH') {
    if (!isAuthenticated(req)) return res.status(401).json({ error: 'Not authenticated' });
    return req.method === 'GET' ? listOrders(res) : updateOrder(res, body);
  }

  res.setHeader('Allow', 'GET, POST, PATCH');
  return res.status(405).json({ error: 'Method not allowed' });
};
