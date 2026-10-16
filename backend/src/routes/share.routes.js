const express = require('express');
const config = require('../config/default');
const ProductModel = require('../models/Product');

const router = express.Router();

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const money = (v) => new Intl.NumberFormat('ru-RU').format(Number(v) || 0).replace(/ /g, ' ');

/** Rasmning to'liq manzili — Telegram preview uchun absolyut bo'lishi shart */
const absUrl = (url) => (/^https?:\/\//.test(url) ? url : `${config.publicUrl}${url}`);

/** Mini App'da shu mahsulotni ochadigan havolalar */
function openLinks(id) {
  const bot = config.bot.username || process.env.BOT_USERNAME || '';
  return {
    telegram: bot ? `https://t.me/${bot}?start=p${id}` : '',
    web: `${config.miniappUrl}/?product=${id}`,
  };
}

function priceLine(p) {
  const parts = [`${money(p.price)} so'm`];
  if (p.wholesalePrice < p.price) parts.push(`optom ${money(p.wholesalePrice)} so'm`);
  return parts.join(' · ');
}

function page({ title, description, image, url, body }) {
  return `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="${esc(config.company.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
${image ? `<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(image)}">` : ''}
<style>
  :root { --navy:#0b2257; --blue:#2c5fd0; --ink:#0b1630; --muted:#6c7791; --line:#e4e9f3; --bg:#f3f6fc; --red:#e11d2e; --green:#12a150; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background:var(--bg); color:var(--ink); }
  .wrap { max-width: 560px; margin: 0 auto; padding-bottom: 110px; }
  .brand { background: linear-gradient(135deg,#0b2257,#163a85 58%,#2c5fd0); color:#fff; padding:14px 16px; font-weight:800; letter-spacing:.02em; }
  .brand small { display:block; font-weight:500; opacity:.75; font-size:11px; letter-spacing:.12em; }
  .gallery { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; background:#e9eef8; }
  .gallery img { flex:0 0 100%; width:100%; aspect-ratio:3/4; object-fit:contain; scroll-snap-align:center; }
  .count { text-align:center; color:var(--muted); font-size:12px; padding:6px 0 0; }
  .card { background:#fff; margin:12px; border-radius:20px; padding:16px; box-shadow:0 8px 24px -12px rgba(11,34,87,.2); }
  h1 { font-size:21px; margin:0 0 2px; }
  .sub { color:var(--muted); font-size:14px; }
  .art { display:inline-block; background:#eef2fb; color:var(--navy); font-weight:700; font-size:12px; padding:3px 9px; border-radius:8px; margin-bottom:8px; }
  .price { font-size:24px; font-weight:800; margin-top:12px; }
  .old { color:var(--muted); text-decoration:line-through; font-size:15px; margin-left:6px; font-weight:500; }
  .sale { background:#fdecec; color:var(--red); font-weight:700; font-size:12px; padding:2px 7px; border-radius:7px; margin-left:6px; }
  .opt { color:var(--green); font-weight:700; margin-top:4px; font-size:15px; }
  dl { display:grid; grid-template-columns:auto 1fr; gap:8px 14px; margin:14px 0 0; font-size:14px; }
  dt { color:var(--muted); }
  dd { margin:0; font-weight:600; }
  .sizes span { display:inline-block; background:var(--navy); color:#fff; border-radius:8px; padding:2px 8px; margin:0 4px 4px 0; font-size:13px; }
  .desc { margin-top:14px; white-space:pre-wrap; font-size:14px; line-height:1.5; }
  .bar { position:fixed; left:0; right:0; bottom:0; padding:12px 16px calc(12px + env(safe-area-inset-bottom)); background:rgba(255,255,255,.96); border-top:1px solid var(--line); display:flex; gap:10px; justify-content:center; }
  .bar a { flex:1; max-width:260px; text-align:center; text-decoration:none; padding:14px 10px; border-radius:14px; font-weight:700; font-size:15px; }
  .main { background:linear-gradient(135deg,#0b2257,#2c5fd0); color:#fff; }
  .ghost { background:#eef2fb; color:var(--navy); }
  .empty { text-align:center; padding:60px 20px; color:var(--muted); }
</style>
</head>
<body><div class="wrap">
<div class="brand">${esc(config.company.name)}<small>${esc(config.company.slogan)}</small></div>
${body}
</div></body></html>`;
}

/** Ulashiladigan mahsulot havolasi: /p/12 — Telegram'da rasm va narx bilan ko'rinadi */
router.get('/p/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const product = Number.isFinite(id) ? await ProductModel.findById(id) : null;
    const url = `${config.publicUrl}/p/${id}`;

    if (!product || !product.isActive) {
      return res.status(404).send(
        page({
          title: `${config.company.name} — mahsulot topilmadi`,
          description: 'Bu mahsulot hozir sotuvda emas',
          url,
          body: `<div class="empty">😔 Bu mahsulot hozir sotuvda emas.</div>
<div class="bar"><a class="main" href="${esc(config.miniappUrl)}">Do'konni ochish</a></div>`,
        })
      );
    }

    const p = product;
    const title = `${p.article} — ${p.name}`;
    const sizes = (p.sizes || []).join(', ');
    const material = [p.material, p.materialRu].filter(Boolean)[0];
    const description = [
      priceLine(p),
      sizes && `Razmerlar: ${sizes}`,
      p.color && `Rang: ${p.color}`,
      material && `Material: ${material}`,
      p.description,
    ]
      .filter(Boolean)
      .join(' · ')
      .replace(/\s+/g, ' ')
      .slice(0, 300);
    const images = (p.images || []).map(absUrl);
    const discount = p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    const links = openLinks(p.id);

    const rows = [
      ['Kategoriya', p.category === 'upper' ? 'Zagatovka' : 'Tayyor oyoq kiyim'],
      sizes && ['Razmerlar', `<span class="sizes">${p.sizes.map((s) => `<span>${s}</span>`).join('')}</span>`],
      p.color && ['Rang', esc([p.color, p.colorRu].filter(Boolean).join(' / '))],
      material && ['Material', esc([p.material, p.materialRu].filter(Boolean).join(' / '))],
      ['Holat', p.inStock ? 'Sotuvda bor' : "Hozircha yo'q"],
    ].filter(Boolean);

    const body = `
${images.length ? `<div class="gallery">${images.map((src, i) => `<img src="${esc(src)}" alt="${esc(p.name)}" ${i ? 'loading="lazy"' : ''}>`).join('')}</div>
${images.length > 1 ? `<div class="count">← ${images.length} ta rasm →</div>` : ''}` : ''}
<div class="card">
  <span class="art">${esc(p.article)}</span>
  <h1>${esc(p.name)}</h1>
  ${p.nameRu ? `<div class="sub">${esc(p.nameRu)}</div>` : ''}
  <div class="price">${money(p.price)} so'm${discount ? `<span class="old">${money(p.oldPrice)}</span><span class="sale">−${discount}%</span>` : ''}</div>
  ${p.wholesalePrice < p.price ? `<div class="opt">Optom: ${money(p.wholesalePrice)} so'm (${p.wholesaleMin} juftdan)</div>` : ''}
  <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
  ${p.description ? `<div class="desc">${esc(p.description)}</div>` : ''}
</div>
<div class="bar">
  ${links.telegram ? `<a class="main" href="${esc(links.telegram)}">Buyurtma berish</a>` : ''}
  <a class="${links.telegram ? 'ghost' : 'main'}" href="${esc(links.web)}">Saytda ochish</a>
</div>`;

    res.set('Cache-Control', 'public, max-age=300');
    return res.send(page({ title, description, image: images[0], url, body }));
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
