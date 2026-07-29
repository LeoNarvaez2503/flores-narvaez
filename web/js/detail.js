import * as api from './api.js';
import { getUser, setPendingReturn } from './store.js';
import { money } from './money.js';
import { openCheckout } from './checkout.js';
import { toCheckoutWine } from './detail-mapping.js';

const $ = (s, r) => (r || document).querySelector(s);
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

let current = null; // { wine, reviews }

function bottleSVG(type) {
  const t = (type || '').toLowerCase();
  const c = t === 'blanco' ? '#C9B560' : t === 'rosado' ? '#E08AA0' : t === 'espumante' ? '#D9B45A' : t === 'fortificado' ? '#5A1622' : '#641E2E';
  return '<svg viewBox="0 0 30 48" aria-hidden="true"><path d="M12 1 h6 v9 c0 2 3 4 3 9 v25 c0 2 -1 3 -3 3 h-6 c-2 0 -3 -1 -3 -3 V19 c0 -5 3 -7 3 -9 z" fill="' + c + '"/><rect x="9" y="26" width="12" height="11" rx="1.5" fill="#fff" opacity="0.92"/></svg>';
}

function media(w) {
  if (w.imageUrl) return '<img src="' + esc(w.imageUrl) + '" alt="' + esc(w.name) + '" />';
  return bottleSVG(w.type);
}

function stars(n) {
  const full = Math.round(n || 0);
  let s = '';
  for (let i = 1; i <= 5; i++) s += '<span class="star ' + (i <= full ? 'on' : '') + '">★</span>';
  return s;
}

function referenciasHtml(w) {
  const rows = [
    ['Bodega', w.wineryName],
    ['Tipo', w.type],
    ['Uva', w.grape],
    ['Origen', w.origin],
    ['Añada', w.vintage],
    ['Denominación', w.denominationOfOrigin],
    ['Crianza', w.aging],
    ['Puntaje de crítica', w.criticScore != null ? w.criticScore + ' / 100' : null],
  ].filter((r) => r[1] != null && r[1] !== '');
  return '<div class="dt-facts">' + rows.map((r) =>
    '<div class="dt-fact"><span class="k">' + esc(r[0]) + '</span><span class="v">' + esc(r[1]) + '</span></div>').join('') + '</div>' +
    (w.tastingNote ? '<p class="dt-note">"' + esc(w.tastingNote) + '"</p>' : '');
}

function dirLink(o) {
  if (o.lat == null || o.lng == null) return '';
  const url = 'https://www.google.com/maps/dir/?api=1&destination=' + o.lat + ',' + o.lng;
  return ' <a class="dt-dir" href="' + url + '" target="_blank" rel="noopener">Cómo llegar</a>';
}

function offersHtml(w) {
  const offers = (w.offers || []).slice().sort((a, b) => a.price - b.price);
  if (!offers.length) return '';
  return '<div class="dt-offers"><h4>Disponible en</h4>' + offers.map((o, i) =>
    '<div class="dt-offer"><span>' + esc(o.storeName) + (i === 0 ? ' <b class="best">más barato</b>' : '') + dirLink(o) +
    (o.address ? '<span class="dt-addr">' + esc(o.address) + '</span>' : '') + '</span>' +
    '<span class="op">' + money(o.price) + (o.status === 'AGOTADO' ? ' · agotado' : '') + '</span></div>').join('') + '</div>';
}

function reviewsHtml(rev) {
  const head = '<div class="dt-rev-head"><h4>Reseñas</h4>' +
    (rev.reviewCount > 0 ? '<span>' + stars(rev.avgRating) + ' ' + (rev.avgRating != null ? rev.avgRating.toFixed(1) : '') + ' · ' + rev.reviewCount + '</span>' : '<span>Sé el primero en opinar</span>') + '</div>';
  const list = rev.items.length
    ? rev.items.map((r) =>
        '<div class="dt-rev"><div class="dt-rev-top"><b>' + esc(r.userName) + '</b><span>' + stars(r.rating) + '</span></div>' +
        (r.comment ? '<p>' + esc(r.comment) + '</p>' : '') + '</div>').join('')
    : '<p class="dt-empty">Aún no hay reseñas de usuarios.</p>';
  return '<div class="dt-reviews">' + head + list + '</div>';
}

function formHtml() {
  if (!getUser()) return '<div class="dt-form-login">Inicia sesión para dejar tu reseña. <a href="login.html">Entrar</a></div>';
  return '<form class="dt-form" id="dt-form">' +
    '<div class="dt-stars-input" id="dt-stars">' +
    [1, 2, 3, 4, 5].map((i) => '<button type="button" class="star-btn" data-star="' + i + '">★</button>').join('') + '</div>' +
    '<textarea id="dt-comment" maxlength="800" placeholder="¿Qué te pareció este vino?"></textarea>' +
    '<div class="dt-err" id="dt-err" hidden></div>' +
    '<button class="dt-submit" type="submit">Publicar reseña</button></form>';
}

function render() {
  const { wine, reviews } = current;
  const el = $('#detail');
  el.innerHTML =
    '<div class="dt-bg"><div class="dt-modal">' +
      '<button class="dt-close" aria-label="Cerrar">✕</button>' +
      '<div class="dt-hero"><div class="dt-img">' + media(wine) + '</div>' +
        '<div class="dt-hero-info"><div class="dt-winery">' + esc(wine.wineryName) + '</div>' +
        '<h3>' + esc(wine.name) + (wine.vintage ? ' ' + esc(wine.vintage) : '') + '</h3>' +
        '<div class="dt-price">desde <b>' + money(wine.bestPrice) + '</b></div>' +
        '<button class="dt-reserve" id="dt-reserve">Reservar</button></div></div>' +
      '<div class="dt-body">' + referenciasHtml(wine) + offersHtml(wine) + reviewsHtml(reviews) + formHtml() + '</div>' +
    '</div></div>';
  bind();
}

let pickedStar = 0;
function bind() {
  $('#detail .dt-close').onclick = close;
  $('#detail .dt-bg').onclick = (e) => { if (e.target.classList.contains('dt-bg')) close(); };
  const resBtn = $('#dt-reserve');
  if (resBtn) resBtn.onclick = () => {
    const w = current.wine;
    if (!getUser()) { setPendingReturn('return=reserve:' + w.id); window.location.href = 'login.html'; return; }
    close();
    openCheckout(toCheckoutWine(w, window.CavaLoc || null), window.CavaLoc || null);
  };

  const starsBox = $('#dt-stars');
  if (starsBox) {
    starsBox.querySelectorAll('.star-btn').forEach((b) => {
      b.onclick = () => {
        pickedStar = Number(b.dataset.star);
        starsBox.querySelectorAll('.star-btn').forEach((x) => x.classList.toggle('on', Number(x.dataset.star) <= pickedStar));
      };
    });
  }
  const form = $('#dt-form');
  if (form) form.onsubmit = submitReview;
}

async function submitReview(e) {
  e.preventDefault();
  const err = $('#dt-err');
  const comment = $('#dt-comment').value.trim();
  if (!pickedStar) { err.textContent = 'Elige cuántas estrellas (1 a 5).'; err.hidden = false; return; }
  const btn = $('#dt-form .dt-submit');
  btn.disabled = true; btn.textContent = 'Publicando…';
  try {
    await api.createReview({ wineId: current.wine.id, rating: pickedStar, comment });
    current.reviews = await api.getWineReviews(current.wine.id, 1);
    pickedStar = 0;
    render();
  } catch (e2) {
    err.textContent = e2.message || 'No se pudo publicar.'; err.hidden = false;
    btn.disabled = false; btn.textContent = 'Publicar reseña';
  }
}

async function open(wineId) {
  const el = $('#detail');
  el.innerHTML = '<div class="dt-bg"><div class="dt-modal"><div class="dt-loading">Cargando…</div></div></div>';
  try {
    const [wine, reviews] = await Promise.all([api.getWine(wineId), api.getWineReviews(wineId, 1)]);
    current = { wine, reviews };
    render();
  } catch (e) {
    el.innerHTML = '<div class="dt-bg"><div class="dt-modal"><button class="dt-close" aria-label="Cerrar">✕</button><div class="dt-loading">No se pudo cargar el vino.</div></div></div>';
    $('#detail .dt-close').onclick = close;
  }
}

function close() { $('#detail').innerHTML = ''; current = null; pickedStar = 0; }

window.CavaDetail = { open };
