(function () {
  'use strict';

  const imageSlots = [
    { id:'site-logo', section:'Brand', label:'Header and footer logo', selector:'.nav-logo img, .footer-brand img', type:'image' },
    { id:'hero-background', section:'Home', label:'Hero background', selector:'.hero-bg', type:'background', overlay:'radial-gradient(ellipse at 30% 20%,rgba(180,160,90,.18),transparent 55%),linear-gradient(180deg,rgba(20,26,16,.25),rgba(20,26,16,.55) 68%,rgba(20,26,16,.88))' },
    { id:'land-map', section:'Our Land', label:'Interactive land image', selector:'#explorer', type:'background' },
    { id:'agriculture-vegetables', section:'Agriculture', label:'Vegetables image', selector:'#agriculture .two-col > div:nth-child(2) .ph:nth-child(1)', type:'background' },
    { id:'agriculture-fruits', section:'Agriculture', label:'Fruits image', selector:'#agriculture .two-col > div:nth-child(2) .ph:nth-child(2)', type:'background' },
    { id:'agriculture-crops', section:'Agriculture', label:'Crops image', selector:'#agriculture .two-col > div:nth-child(2) .ph:nth-child(3)', type:'background' },
    { id:'agriculture-fish', section:'Agriculture', label:'Fish image', selector:'#agriculture .two-col > div:nth-child(2) .ph:nth-child(4)', type:'background' },
    { id:'pond-feature', section:'Pond', label:'Pond feature image', selector:'.river-wrap', type:'background', overlay:'linear-gradient(160deg,rgba(20,40,24,.5),rgba(52,90,60,.4))' },
    { id:'livestock-showcase', section:'Animals', label:'Livestock showcase image', selector:'.animal-showcase img', type:'image' },
    { id:'store-land', section:'Store', label:'From Our Land image', selector:'.store-split .store-card:nth-child(1)', type:'background', overlay:'linear-gradient(160deg,rgba(28,45,25,.08),rgba(20,28,18,.7))' },
    { id:'store-heritage', section:'Store', label:'From Our Heritage image', selector:'.store-split .store-card:nth-child(2)', type:'background', overlay:'linear-gradient(160deg,rgba(28,45,25,.08),rgba(20,28,18,.7))' },
    { id:'journal-1', section:'Journal', label:'A Day at Qariatul Ihsan', selector:'.journal-card:nth-child(1) .journal-img', type:'background' },
    { id:'journal-2', section:'Journal', label:'Our First Harvest', selector:'.journal-card:nth-child(2) .journal-img', type:'background' },
    { id:'journal-3', section:'Journal', label:'Life Beside the Pond', selector:'.journal-card:nth-child(3) .journal-img', type:'background' }
  ];

  for (let i = 1; i <= 30; i += 1) {
    imageSlots.push({
      id: `gallery-${i}`,
      section: 'Gallery',
      label: `Gallery image ${i}`,
      selector: `#galleryGrid .gallery-item:nth-child(${i}) img, #galleryGrid .gallery-item:nth-child(${i}) .ph`,
      type: 'auto'
    });
  }

  const storeProductNames = {
    1:'Seasonal Vegetables',2:'Orchard Fruits',3:'Rice Atta',4:'Mustard Oil',
    5:'Farm Fresh Eggs',6:'Raw Honey',7:'Duck Eggs',8:'Pond Fish (Rui)',
    9:'Nakshi Kantha Shawl',10:'Handloom Cotton Saree',11:'Jamdani Scarf',12:'Khadi Panjabi'
  };

  const catTagMap = {
    vegetables:{en:'Vegetables & Fruits',bn:'শাকসবজি ও ফল'},
    meat:{en:'Meat & Eggs',bn:'মাংস ও ডিম'},
    fish:{en:'Fish',bn:'মাছ'},
    groceries:{en:'Groceries',bn:'মুদিপণ্য'},
    clothing:{en:'Clothing',bn:'পোশাক'}
  };
  const productCats = [
    {v:'vegetables',l:'Vegetables & Fruits'},
    {v:'meat',l:'Meat & Eggs'},
    {v:'fish',l:'Fish'},
    {v:'groceries',l:'Groceries'},
    {v:'clothing',l:'Clothing'}
  ];
  const baseProducts = [
    { id:1, name:{en:"Seasonal Vegetables",bn:"মৌসুমি সবজি"}, unit:{en:"per kg",bn:"প্রতি কেজি"}, price:180, icon:"🥬", cat:"vegetables" },
    { id:2, name:{en:"Orchard Fruits",bn:"বাগানের ফল"}, unit:{en:"per kg",bn:"প্রতি কেজি"}, price:320, icon:"🍊", cat:"vegetables" },
    { id:3, name:{en:"Rice Atta",bn:"চালের আটা"}, unit:{en:"per kg",bn:"প্রতি কেজি"}, price:90, icon:"🌾", cat:"groceries" },
    { id:4, name:{en:"Mustard Oil",bn:"সরিষার তেল"}, unit:{en:"per litre",bn:"প্রতি লিটার"}, price:450, icon:"🫙", cat:"groceries" },
    { id:5, name:{en:"Farm Fresh Eggs",bn:"খামারের তাজা ডিম"}, unit:{en:"per dozen",bn:"প্রতি ডজন"}, price:140, icon:"🥚", cat:"meat" },
    { id:6, name:{en:"Raw Honey",bn:"খাঁটি মধু"}, unit:{en:"per jar",bn:"প্রতি বয়াম"}, price:650, icon:"🍯", cat:"groceries" },
    { id:7, name:{en:"Duck Eggs",bn:"হাঁসের ডিম"}, unit:{en:"per dozen",bn:"প্রতি ডজন"}, price:160, icon:"🦆", cat:"meat" },
    { id:8, name:{en:"Pond Fish (Rui)",bn:"পুকুরের মাছ (রুই)"}, unit:{en:"per kg",bn:"প্রতি কেজি"}, price:380, icon:"🐟", cat:"fish" },
    { id:9, name:{en:"Nakshi Kantha Shawl",bn:"নকশিকাঁথার শাল"}, unit:{en:"each",bn:"প্রতিটি"}, price:1850, icon:"🧵", cat:"clothing" },
    { id:10, name:{en:"Handloom Cotton Saree",bn:"হস্তচালিত তাঁতের সুতি শাড়ি"}, unit:{en:"each",bn:"প্রতিটি"}, price:2400, icon:"🥻", cat:"clothing" },
    { id:11, name:{en:"Jamdani Scarf",bn:"জামদানি স্কার্ফ"}, unit:{en:"each",bn:"প্রতিটি"}, price:1200, icon:"🧣", cat:"clothing" },
    { id:12, name:{en:"Khadi Panjabi",bn:"খাদি পাঞ্জাবি"}, unit:{en:"each",bn:"প্রতিটি"}, price:1650, icon:"👘", cat:"clothing" }
  ];
  const homepageSelectorById = {
    1:'#products .product-card:nth-child(1) .product-img',
    2:'#products .product-card:nth-child(2) .product-img',
    3:'#products .product-card:nth-child(3) .product-img',
    4:'#products .product-card:nth-child(4) .product-img'
  };
  Object.keys(storeProductNames).forEach((id) => {
    const storeSelector = `#productGrid [data-product-id="${id}"] .card-media`;
    const homeSelector = homepageSelectorById[id];
    imageSlots.push({
      id: `store-product-${id}`,
      section: 'Store Products',
      label: storeProductNames[id],
      selector: homeSelector ? `${homeSelector}, ${storeSelector}` : storeSelector,
      type: 'background'
    });
  });

  function slotElements(slot, root) {
    try { return Array.from((root || document).querySelectorAll(slot.selector)); }
    catch (_) { return []; }
  }

  function setElementImage(element, slot, url) {
    const useImage = slot.type === 'image' || (slot.type === 'auto' && element.tagName === 'IMG');
    if (useImage) {
      element.src = url;
      element.removeAttribute('srcset');
    } else {
      element.style.backgroundImage = slot.overlay ? `${slot.overlay},url("${url}")` : `url("${url}")`;
      element.style.backgroundSize = 'cover';
      element.style.backgroundPosition = 'center';
    }
  }

  function resolveUrl(entry) {
    if (!entry) return '';
    if (typeof entry === 'string') return entry;
    return `${entry.path}${entry.v ? `?v=${entry.v}` : ''}`;
  }

  function applyImages(imagesMap, root) {
    if (!imagesMap) return;
    Object.keys(imagesMap).forEach((slotId) => {
      const slot = imageSlots.find((s) => s.id === slotId);
      if (!slot) return;
      const url = resolveUrl(imagesMap[slotId]);
      if (!url) return;
      slotElements(slot, root).forEach((el) => setElementImage(el, slot, url));
    });
  }

  function getSlotPreview(slot, root) {
    const element = slotElements(slot, root)[0];
    if (!element) return '';
    if (element.tagName === 'IMG') return element.currentSrc || element.src || '';
    const inline = element.style.backgroundImage || getComputedStyle(element).backgroundImage;
    const matches = [...inline.matchAll(/url\(["']?(.*?)["']?\)/g)];
    return matches.length ? matches[matches.length - 1][1] : '';
  }

  window.QICMSRuntime = { imageSlots, applyImages, getSlotPreview, resolveUrl, baseProducts, catTagMap, productCats };
})();
