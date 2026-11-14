(function () {
  'use strict';

  const BRAND = {
    name: 'Qariatul Ihsan',
    nameBn: 'কারিয়াতুল ইহসান',
    logo: '/qariatul-ihsan-logo.png',
    phone: '01715-004251',
    email: 'qariatulihsan@gmail.com',
    site: 'qariatul-ihsan.vercel.app'
  };

  const L = {
    en: {
      invoice: 'INVOICE', tagline: 'From our land to your home', no: 'Invoice no.', date: 'Order date',
      billed: 'Billed to', deliver: 'Deliver to', payment: 'Payment', method: 'Method', cod: 'Cash on Delivery',
      status: 'Order status', payStatus: 'Payment status',
      st: { pending: 'Pending', confirmed: 'Confirmed', delivered: 'Delivered', cancelled: 'Cancelled' },
      ps: { unpaid: 'Unpaid — pay on delivery', paid: 'Paid', void: 'Void' },
      item: 'Item', qty: 'Qty', price: 'Unit price', amount: 'Amount', subtotal: 'Subtotal', delivery: 'Delivery charge',
      free: 'Free', total: 'Total payable', due: 'Please pay this amount in cash to our delivery person.',
      notes: 'Order notes', phone: 'Phone', email: 'Email', thanks: 'Thank you for shopping with Qariatul Ihsan.',
      keep: 'This is a computer-generated invoice. Please keep it until your order is delivered.',
      items: 'Items'
    },
    bn: {
      invoice: 'ইনভয়েস', tagline: 'আমাদের জমি থেকে আপনার ঘরে', no: 'ইনভয়েস নং', date: 'অর্ডারের তারিখ',
      billed: 'ক্রেতা', deliver: 'ডেলিভারির ঠিকানা', payment: 'পেমেন্ট', method: 'পদ্ধতি', cod: 'ক্যাশ অন ডেলিভারি',
      status: 'অর্ডারের অবস্থা', payStatus: 'পেমেন্টের অবস্থা',
      st: { pending: 'অপেক্ষমাণ', confirmed: 'নিশ্চিত', delivered: 'ডেলিভারি হয়েছে', cancelled: 'বাতিল' },
      ps: { unpaid: 'অপরিশোধিত — ডেলিভারির সময় দিন', paid: 'পরিশোধিত', void: 'বাতিল' },
      item: 'পণ্য', qty: 'পরিমাণ', price: 'একক দাম', amount: 'মোট', subtotal: 'সাবটোটাল', delivery: 'ডেলিভারি চার্জ',
      free: 'বিনামূল্যে', total: 'সর্বমোট প্রদেয়', due: 'অনুগ্রহ করে এই টাকা ডেলিভারি ব্যক্তির হাতে নগদে পরিশোধ করুন।',
      notes: 'অর্ডারের নোট', phone: 'ফোন', email: 'ইমেইল', thanks: 'কারিয়াতুল ইহসান থেকে কেনাকাটার জন্য ধন্যবাদ।',
      keep: 'এটি কম্পিউটার-জেনারেটেড ইনভয়েস। অর্ডার হাতে পাওয়া পর্যন্ত এটি সংরক্ষণ করুন।',
      items: 'পণ্যসমূহ'
    }
  };

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function bnDigits(v) {
    return String(v).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
  }

  function num(n, lang) {
    const s = Number(n).toLocaleString('en-IN');
    return lang === 'bn' ? bnDigits(s) : s;
  }

  function money(n, lang) {
    return '৳' + num(n, lang);
  }

  function pick(obj, lang) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj.en || obj.bn || '';
  }

  function fmtDate(iso, lang) {
    try {
      const d = new Date(iso);
      const s = d.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
        timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
      return s;
    } catch (_) {
      return iso;
    }
  }

  const CSS = `
.qi-inv{--forest:#24402F;--gold:#A9772F;--ink:#26221B;--soft:#5C5748;--line:#E3DAC3;--linen:#F6F1E6;
  background:#fff;color:var(--ink);border:1px solid var(--line);border-radius:6px;overflow:hidden;
  font-family:'Work Sans','Noto Sans Bengali',system-ui,sans-serif;font-size:14px;line-height:1.5;
  width:100%;max-width:780px;margin:0 auto;text-align:left}
.qi-inv *{box-sizing:border-box}
.qi-inv-head{background:var(--forest);color:#FBF7EC;padding:22px 26px;display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;border-bottom:4px solid var(--gold)}
.qi-inv-brand{display:flex;align-items:center;gap:14px;min-width:0}
.qi-inv-brand img{width:60px;height:60px;border-radius:8px;object-fit:cover;background:#fff;flex-shrink:0}
.qi-inv-brand b{display:block;font-family:'Fraunces','Noto Sans Bengali',serif;font-weight:500;font-size:21px;letter-spacing:-.01em}
.qi-inv-brand span{display:block;font-size:12.5px;color:#D9C89A}
.qi-inv-title{text-align:right}
.qi-inv .qi-inv-title h2{margin:0;font-family:'Fraunces','Noto Sans Bengali',serif;font-weight:500;font-size:26px;letter-spacing:.08em;color:#FBF7EC}
.qi-inv-title p{margin:2px 0 0;font-size:12.5px;color:#E9E0C6}
.qi-inv-body{padding:22px 26px}
.qi-inv-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px 26px;margin-bottom:22px}
.qi-inv-box h4{margin:0 0 6px;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--gold);font-weight:700}
.qi-inv-box p{margin:0 0 2px;word-break:break-word}
.qi-inv-box p.n{font-weight:600;font-size:15px}
.qi-inv-box .k{color:var(--soft)}
.qi-inv-badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:11.5px;font-weight:600;background:#F1E3C8;color:#7a5520}
.qi-inv-badge.confirmed{background:#DCE6DD;color:#24402F}
.qi-inv-badge.delivered{background:#24402F;color:#FBF7EC}
.qi-inv-badge.cancelled{background:#f0d9d3;color:#7E3B22}
.qi-inv table{width:100%;border-collapse:collapse;margin:0 0 6px}
.qi-inv th{text-align:left;font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--soft);padding:9px 8px;border-bottom:2px solid var(--forest);background:var(--linen);
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.qi-inv td{padding:11px 8px;border-bottom:1px solid var(--line);vertical-align:top}
.qi-inv th.r,.qi-inv td.r{text-align:right;white-space:nowrap}
.qi-inv td .u{display:block;font-size:12px;color:var(--soft)}
.qi-inv-totals{margin:14px 0 0 auto;width:100%;max-width:340px}
.qi-inv-totals div{display:flex;justify-content:space-between;gap:16px;padding:5px 0}
.qi-inv-totals .grand{margin-top:6px;padding:12px 14px;background:var(--forest);color:#FBF7EC;border-radius:4px;font-weight:700;font-size:16px;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.qi-inv-due{margin:12px 0 0;text-align:right;font-size:12.5px;color:var(--soft)}
.qi-inv-note{margin-top:18px;padding:10px 12px;background:var(--linen);border-left:3px solid var(--gold);font-size:13px;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.qi-inv-foot{padding:16px 26px 20px;border-top:1px dashed var(--line);text-align:center;color:var(--soft);font-size:12.5px}
.qi-inv-foot b{display:block;color:var(--forest);font-family:'Fraunces','Noto Sans Bengali',serif;font-weight:500;font-size:15px;margin-bottom:3px}
@media(max-width:560px){
  .qi-inv-head{padding:18px}.qi-inv-body{padding:18px}.qi-inv-foot{padding:14px 18px 18px}
  .qi-inv-grid{grid-template-columns:1fr}.qi-inv-title{text-align:left;width:100%}.qi-inv-head{align-items:flex-start}
  .qi-inv td,.qi-inv th{padding-left:5px;padding-right:5px}.qi-inv{font-size:13px}
}
@media print{
  html,body.qi-printing{background:#fff!important}
  body.qi-printing > *:not(.qi-print-root){display:none!important}
  body.qi-printing .qi-print-root{position:static!important;display:block!important;background:#fff!important;padding:0!important;overflow:visible!important;
    transform:none!important;inset:auto!important;height:auto!important;max-height:none!important;box-shadow:none!important;opacity:1!important;visibility:visible!important}
  body.qi-printing .qi-no-print{display:none!important}
  body.qi-printing .qi-inv{border:0;max-width:none;border-radius:0}
  @page{margin:10mm}
}`;

  function ensureStyles() {
    if (document.getElementById('qi-inv-style')) return;
    const st = document.createElement('style');
    st.id = 'qi-inv-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function html(order, langArg) {
    const lang = langArg === 'bn' ? 'bn' : 'en';
    const t = L[lang];
    const c = order.customer || {};
    const status = order.status || 'pending';
    const payStatus = order.paymentStatus || 'unpaid';
    const rows = (order.items || []).map((it) => `
      <tr>
        <td>${esc(pick(it.name, lang))}<span class="u">${esc(pick(it.unit, lang))}</span></td>
        <td class="r">${num(it.qty, lang)}</td>
        <td class="r">${money(it.unitPrice, lang)}</td>
        <td class="r"><b>${money(it.lineTotal, lang)}</b></td>
      </tr>`).join('');
    const feeText = order.deliveryFee > 0 ? money(order.deliveryFee, lang) : t.free;

    return `
<div class="qi-inv" lang="${lang}">
  <div class="qi-inv-head">
    <div class="qi-inv-brand">
      <img src="${BRAND.logo}" alt="">
      <div><b>${lang === 'bn' ? BRAND.nameBn : BRAND.name}</b><span>${t.tagline}</span></div>
    </div>
    <div class="qi-inv-title">
      <h2>${t.invoice}</h2>
      <p>${t.no}: <b>${esc(order.orderNo)}</b></p>
      <p>${t.date}: ${esc(fmtDate(order.createdAt, lang))}</p>
    </div>
  </div>
  <div class="qi-inv-body">
    <div class="qi-inv-grid">
      <div class="qi-inv-box">
        <h4>${t.billed}</h4>
        <p class="n">${esc(c.name)}</p>
        <p><span class="k">${t.phone}:</span> ${esc(lang === 'bn' ? bnDigits(c.phone) : c.phone)}</p>
        ${c.email ? `<p><span class="k">${t.email}:</span> ${esc(c.email)}</p>` : ''}
      </div>
      <div class="qi-inv-box">
        <h4>${t.deliver}</h4>
        <p>${esc(c.address)}</p>
        <p>${esc(c.city)}</p>
      </div>
      <div class="qi-inv-box">
        <h4>${t.payment}</h4>
        <p><span class="k">${t.method}:</span> <b>${t.cod}</b></p>
        <p><span class="k">${t.payStatus}:</span> ${esc(t.ps[payStatus] || payStatus)}</p>
      </div>
      <div class="qi-inv-box">
        <h4>${t.status}</h4>
        <p><span class="qi-inv-badge ${esc(status)}">${esc(t.st[status] || status)}</span></p>
      </div>
    </div>
    <table>
      <thead><tr><th>${t.item}</th><th class="r">${t.qty}</th><th class="r">${t.price}</th><th class="r">${t.amount}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="qi-inv-totals">
      <div><span>${t.subtotal}</span><span>${money(order.subtotal, lang)}</span></div>
      <div><span>${t.delivery}</span><span>${feeText}</span></div>
      <div class="grand"><span>${t.total}</span><span>${money(order.total, lang)}</span></div>
    </div>
    <p class="qi-inv-due">${t.due}</p>
    ${c.notes ? `<div class="qi-inv-note"><b>${t.notes}:</b> ${esc(c.notes)}</div>` : ''}
  </div>
  <div class="qi-inv-foot">
    <b>${t.thanks}</b>
    ${t.phone}: ${esc(lang === 'bn' ? bnDigits(BRAND.phone) : BRAND.phone)} · ${t.email}: ${BRAND.email}<br>
    ${t.keep}
  </div>
</div>`;
  }

  function print() {
    document.body.classList.add('qi-printing');
    const done = () => {
      document.body.classList.remove('qi-printing');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 60);
  }

  window.QIInvoice = { html, ensureStyles, print, BRAND };
})();
