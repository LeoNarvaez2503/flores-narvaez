/* ============================================================
   CavaLocal Web — lógica del catálogo (ES module). Consume el
   backend NestJS vía js/api.js. Sin frameworks.
   ============================================================ */
import { mountCarousel } from './carousel.js';
import { getWines, getFacets, getBestsellers } from './api.js';
import { getUser, getToken, logout, setPendingReturn } from './store.js';
import { openCheckout } from './checkout.js';
import { haversineKm, getUserLocation, DEFAULT_LOC } from './geo.js';

(function () {
  'use strict';

  var USER_LOC = { lat: DEFAULT_LOC.lat, lng: DEFAULT_LOC.lng, source: 'default' };

  var CATEGORIES = [
    { label: 'Todos', term: '' },
    { label: 'Tintos', term: 'Tinto' },
    { label: 'Blancos', term: 'Blanco' },
    { label: 'Espumantes', term: 'Espumante' },
    { label: 'Rosados', term: 'Rosado' },
    { label: 'Nacionales', term: 'Venezuela' },
    { label: 'Argentina', term: 'Argentina' },
    { label: 'España', term: 'España' },
    { label: 'Italia', term: 'Italia' },
  ];
  var PRICES = [
    { key: 'all', label: 'Todos los precios' },
    { key: 'lt15', label: 'Hasta $15' },
    { key: 'mid', label: '$15 a $25' },
    { key: 'gt25', label: 'Más de $25' },
  ];

  var state = {
    items: [],
    raw: [], // alias de items, para los modos comparar/mapa
    total: 0,
    page: 1,
    pageSize: 24,
    term: '',
    type: '',
    country: '',
    sort: 'relevancia',
    mode: 'lista',
    price: 'all',
    facets: { types: [], countries: [], grapes: [] },
    bestsellers: [],
    token: getToken(),
    user: getUser(),
    loading: false,
    userLoc: USER_LOC,
  };

  // ---------- utils ----------
  function $(s, r) { return (r || document).querySelector(s); }
  function money(n) { return '$' + Number(n).toFixed(2); }
  function round1(n) { return Math.round(n * 10) / 10; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function initials(name) { return name.split(' ').map(function (p) { return p[0]; }).filter(Boolean).slice(0, 2).join('').toUpperCase(); }

  function bottleColor(type) {
    var t = (type || '').toLowerCase();
    if (t === 'blanco') return '#C9B560';
    if (t === 'rosado') return '#E08AA0';
    if (t === 'espumante') return '#D9B45A';
    if (t === 'fortificado') return '#5A1622';
    return '#641E2E'; // tinto / default
  }
  function bottleSVG(type) {
    var c = bottleColor(type);
    return '<svg viewBox="0 0 30 48" aria-hidden="true">' +
      '<path d="M12 1 h6 v9 c0 2 3 4 3 9 v25 c0 2 -1 3 -3 3 h-6 c-2 0 -3 -1 -3 -3 V19 c0 -5 3 -7 3 -9 z" fill="' + c + '"/>' +
      '<rect x="9" y="26" width="12" height="11" rx="1.5" fill="#fff" opacity="0.92"/></svg>';
  }
  function mediaHtml(w) {
    if (w.imageUrl) return '<img class="bottle-img" src="' + esc(w.imageUrl) + '" alt="' + esc(w.name) + '" loading="lazy" />';
    return bottleSVG(w.type);
  }
  function ratingHtml(w) {
    var parts = [];
    if (w.criticScore != null) parts.push('★ <b>' + w.criticScore + '</b> <span>crítica</span>');
    if (w.reviews > 0 && w.rating != null) parts.push('<span>' + Number(w.rating).toFixed(1) + '★ · ' + w.reviews + '</span>');
    if (!parts.length) return '<div class="rating"><span>Sin reseñas aún</span></div>';
    return '<div class="rating">' + parts.join(' · ') + '</div>';
  }

  // ---------- data ----------
  function transform(w) {
    var offers = (w.offers || []).map(function (o) {
      return {
        storeId: o.establishmentId, storeName: o.storeName, address: o.address, lat: o.lat, lng: o.lng,
        price: Number(o.price), status: o.status,
        dist: round1(haversineKm(state.userLoc.lat, state.userLoc.lng, o.lat, o.lng)), best: false,
      };
    }).sort(function (a, b) { return a.price - b.price; });
    if (offers.length) offers[0].best = true;
    var nearest = offers.slice().sort(function (a, b) { return a.dist - b.dist; })[0] || null;
    var agotado = offers.length > 0 && offers.every(function (o) { return o.status === 'AGOTADO'; });
    return {
      id: w.id, name: w.name, vintage: w.vintage, winery: w.wineryName, grape: w.grape,
      country: w.country, region: (w.origin || '').split(',')[0].trim(), type: w.type,
      imageUrl: w.imageUrl, offers: offers,
      bestPrice: w.bestPrice != null ? Number(w.bestPrice) : Number(w.referencePrice),
      storeCount: w.storeCount != null ? w.storeCount : offers.length,
      nearest: nearest, criticScore: w.criticScore,
      rating: w.avgRating, reviews: w.reviewCount || 0,
      stock: agotado
        ? { kind: 'agotado', text: 'Agotado', color: '#C0392B' }
        : { kind: 'disponible', text: 'Disponible', color: '#2E8B57' },
    };
  }

  function filtered() { return state.items; }

  function priceParams() {
    if (state.price === 'lt15') return { priceMax: 15 };
    if (state.price === 'mid') return { priceMin: 15, priceMax: 25 };
    if (state.price === 'gt25') return { priceMin: 25 };
    return {};
  }

  async function loadPage(reset) {
    if (state.loading) return;
    state.loading = true;
    if (reset) { state.page = 1; state.items = []; }
    var params = Object.assign({
      q: state.term, type: state.type, country: state.country,
      sort: state.sort, page: state.page, pageSize: state.pageSize,
    }, priceParams());
    try {
      var res = await getWines(params);
      state.total = res.total;
      var mapped = res.items.map(transform);
      state.items = reset ? mapped : state.items.concat(mapped);
      state.raw = state.items;
    } catch (e) {
      if (reset) { state.items = []; state.raw = []; state.total = 0; }
      // eslint-disable-next-line no-console
      console.warn('No se pudo cargar el catálogo:', e);
    } finally {
      state.loading = false;
    }
  }

  // recarga desde cero ante cualquier cambio de filtro/búsqueda/orden
  async function reload() {
    renderToolbar();
    $('#view').innerHTML = '<div style="text-align:center;padding:48px;color:var(--muted)">Cargando…</div>';
    await loadPage(true);
    renderView();
    renderToolbar();
    toggleHome();
  }

  // ---------- render ----------
  function render() {
    renderAccount();
    renderCatbar();
    renderBestsellers();
    renderFilters();
    renderToolbar();
    renderView();
    toggleHome();
  }

  function renderAccount() {
    var el = $('#account');
    var user = getUser();
    if (user) {
      el.innerHTML = '<a class="nav-reservas" href="reservations.html">Mis reservas</a>' +
        '<div class="user-pill" data-logout="1"><div class="avatar">' + esc(initials(user.name)) + '</div><span class="uname">' + esc(user.name.split(' ')[0]) + '</span></div>';
    } else {
      el.innerHTML = '<a class="btn-login" href="login.html">Iniciar sesión</a>';
    }
  }

  function renderCatbar() {
    $('#catbar').innerHTML = CATEGORIES.map(function (c) {
      return '<a href="#" data-cat="' + esc(c.term) + '" class="' + (c.term === state.term ? 'active' : '') + '">' + esc(c.label) + '</a>';
    }).join('');
  }

  function miniCard(w) {
    return '<div class="card mini" data-detail="' + w.id + '">' +
      '<div class="card-img"><span class="top-tag">TOP</span>' + mediaHtml(w) + '</div>' +
      '<div class="card-body"><div class="winery">' + esc(w.winery) + '</div>' +
      '<div class="pname">' + esc(w.name) + '</div>' +
      ratingHtml(w) +
      '<div class="price-row"><span class="from">desde</span><span class="price">' + money(w.bestPrice) + '</span></div></div></div>';
  }
  function renderBestsellers() {
    var list = (state.bestsellers || []).map(transform);
    $('#bestsellers').innerHTML = list.map(miniCard).join('');
  }

  // ---------- carrusel + tiles promocionales (estáticos: se montan una vez) ----------
  var SLIDES = [
    { img: 'img/promo-1.webp', kicker: 'BODEGA DESTACADA', title: 'Pomar, de Carora a tu copa', subtitle: 'El vino venezolano que conquista paladares.', ctaLabel: 'Ver Pomar', ctaAttr: 'data-cat="Pomar"' },
    { img: 'img/promo-4.webp', kicker: 'AL MEJOR PRECIO', title: 'Comparamos por ti', subtitle: 'El mismo vino, el precio más bajo de tu zona.', ctaLabel: 'Comparar precios', ctaAttr: 'data-cat=""' },
    { img: 'img/promo-2.webp', kicker: 'RESERVA ONLINE', title: 'Tu próxima botella te espera', subtitle: 'Elige, reserva con una seña y retira cuando quieras.', ctaLabel: 'Explorar vinos', ctaAttr: 'data-cat=""' },
    { img: 'img/promo-5.webp', kicker: 'HECHO EN VENEZUELA', title: 'Orgullo nacional en tu copa', subtitle: 'Apoya lo local: etiquetas venezolanas seleccionadas.', ctaLabel: 'Ver nacionales', ctaAttr: 'data-cat="Venezuela"' },
  ];
  var TILES = [
    { img: 'img/tile-1.webp', tk: 'TINTOS', title: 'Cuerpo y carácter', attr: 'data-cat="Tinto"' },
    { img: 'img/tile-2.webp', tk: 'ESPUMANTES', title: 'Burbujas para brindar', attr: 'data-cat="Espumante"' },
    { img: 'img/tile-3.webp', tk: 'CERCA DE TI', title: 'Tiendas en tu zona', attr: 'data-cat=""' },
  ];
  var carouselCtl = null;
  function renderCarousel() {
    var root = $('#carousel'); if (!root) return;
    if (carouselCtl) carouselCtl.destroy();
    carouselCtl = mountCarousel(root, SLIDES, { interval: 5000 });
  }
  function renderTiles() {
    var host = $('#promoTiles'); if (!host) return;
    host.innerHTML = TILES.map(function (t) {
      return '<div class="promo-tile" ' + t.attr + '><img src="' + t.img + '" alt="' + esc(t.title) + '" /><div class="tile-overlay"></div><div class="tile-text"><div class="tk">' + esc(t.tk) + '</div><h4>' + esc(t.title) + '</h4></div></div>';
    }).join('');
  }

  function frow(field, key, label, count) {
    var active = (field === 'type' && state.type === key) ||
                 (field === 'country' && state.country === key) ||
                 (field === 'price' && state.price === key);
    return '<div class="frow ' + (active ? 'active' : '') + '" data-' + field + '="' + esc(key) + '">' +
      '<span>' + esc(label) + '</span>' + (count != null ? '<span class="fcount">' + count + '</span>' : '') + '</div>';
  }
  function renderFilters() {
    var f = state.facets;
    var html = '';
    html += '<div class="filter-group"><div class="ftitle">Tipo</div>' +
      f.types.map(function (c) { return frow('type', c.key, c.key, c.count); }).join('') + '</div>';
    html += '<div class="filter-group"><div class="ftitle">País</div>' +
      f.countries.map(function (c) { return frow('country', c.key, c.key, c.count); }).join('') + '</div>';
    html += '<div class="filter-group" style="border-bottom:none"><div class="ftitle">Precio</div>' +
      PRICES.map(function (p) { return frow('price', p.key, p.label, null); }).join('') + '</div>';
    $('#filters').innerHTML = html;
  }

  function renderToolbar() {
    $('#resCount').textContent = state.total;
    document.querySelectorAll('#sortOpts .opt').forEach(function (b) { b.classList.toggle('active', b.dataset.sort === state.sort); });
    document.querySelectorAll('#modes .mode').forEach(function (b) { b.classList.toggle('active', b.dataset.mode === state.mode); });
  }

  function gridCard(w) {
    return '<div class="card" data-detail="' + w.id + '">' +
      '<div class="card-img">' + mediaHtml(w) +
        '<button class="wish" title="Favorito"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#641E2E" stroke-width="2"><path d="M12 20s-7-4.4-9.3-8.4C1.2 8.7 2.9 5.5 6.2 5.5c1.9 0 3.2 1 3.8 1.9C10.6 6.5 11.9 5.5 13.8 5.5c3.3 0 5 3.2 3.5 6.1C19 15.6 12 20 12 20z"/></svg></button>' +
        '<div class="stock" style="color:' + w.stock.color + '"><span class="dot" style="background:' + w.stock.color + '"></span>' + w.stock.text + '</div>' +
      '</div>' +
      '<div class="card-body">' +
        '<div class="winery">' + esc(w.winery) + '</div>' +
        '<div class="pname">' + esc(w.name) + (w.vintage ? ' ' + w.vintage : '') + '</div>' +
        '<div class="pchip">' + esc(w.grape) + ' · ' + esc(w.region) + '</div>' +
        ratingHtml(w) +
        '<div class="price-row"><span class="from">desde</span><span class="price">' + money(w.bestPrice) + '</span></div>' +
        '<div class="stores">en ' + w.storeCount + ' tiendas</div>' +
        '<button class="btn-reserve" data-reserve="' + w.id + '">Reservar</button>' +
      '</div></div>';
  }

  function compareCard(w) {
    var offers = w.offers;
    return '<div class="compare-card">' +
      '<div class="ch"><div class="card-img" style="width:64px;height:64px;border-radius:10px">' + mediaHtml(w) + '</div>' +
      '<div><div class="pname" data-detail="' + w.id + '" style="cursor:pointer">' + esc(w.name) + (w.vintage ? ' ' + w.vintage : '') + '</div>' +
      '<div class="winery">' + esc(w.winery) + '</div>' + ratingHtml(w) + '</div></div>' +
      '<div style="font-size:13px;color:var(--muted);margin-bottom:8px">Mismo vino en <b>' + offers.length + ' tiendas cercanas</b></div>' +
      offers.map(function (o) {
        return '<div class="offer ' + (o.best ? 'best' : '') + '"><div><span class="oname">' + esc(o.storeName) + '</span>' + (o.best ? '<span class="best-tag">MEJOR PRECIO</span>' : '') + '<div style="font-size:12px;color:var(--muted)">' + o.dist + ' km</div></div><span class="oprice" style="color:' + (o.best ? 'var(--wine)' : 'var(--ink)') + '">' + money(o.price) + '</span></div>';
      }).join('') +
      '<button class="cta" data-reserve="' + w.id + '">Reservar en la más barata · ' + money(offers[0].price) + '</button></div>';
  }

  function renderView() {
    var view = $('#view');
    var list = filtered();
    if (state.mode === 'lista') {
      if (!list.length) { view.innerHTML = emptyState(); return; }
      var more = state.items.length < state.total
        ? '<div class="load-more-wrap"><button class="load-more" id="loadMore">Cargar más (' + state.items.length + ' de ' + state.total + ')</button></div>'
        : '';
      view.innerHTML = '<div class="grid">' + list.map(gridCard).join('') + '</div>' + more;
    } else if (state.mode === 'comparar') {
      var cmp = list.filter(function (w) { return w.offers.length > 1; }).sort(function (a, b) { return b.offers.length - a.offers.length; });
      if (!cmp.length) { view.innerHTML = emptyState(); return; }
      view.innerHTML = '<div class="compare-wrap">' + cmp.map(compareCard).join('') + '</div>';
    } else {
      view.innerHTML = mapView(list);
    }
  }

  function emptyState() {
    return '<div style="text-align:center;padding:60px 0;color:var(--muted)"><div style="font-size:40px">🍷</div><h3 style="font-family:var(--font-display);color:var(--wine);margin:8px 0">No encontramos vinos</h3><p>Prueba con otra cepa, bodega, país o quita filtros.</p></div>';
  }

  var _leaf = null; // instancia Leaflet activa
  function mapView(list) {
    var stores = {};
    list.forEach(function (w) {
      w.offers.forEach(function (o) {
        if (!stores[o.storeId] || o.price < stores[o.storeId].price) {
          stores[o.storeId] = { name: o.storeName, address: o.address, price: o.price, lat: o.lat, lng: o.lng };
        }
      });
    });
    var arr = Object.keys(stores).map(function (k) { return stores[k]; });
    if (!arr.length) return emptyState();
    var nearby = list.slice(0, 6).map(function (w) {
      return '<div class="card" style="flex-direction:row;align-items:center;gap:12px;padding:10px;border:none;box-shadow:var(--shadow-sm)" data-detail="' + w.id + '"><div style="width:44px;height:44px;background:var(--thumb);border-radius:8px;display:flex;align-items:center;justify-content:center">' + bottleSVG(w.type) + '</div><div style="flex:1"><div class="pname" style="min-height:0">' + esc(w.name) + '</div><div style="font-size:12px;color:var(--muted)">' + (w.nearest ? w.nearest.dist + ' km · ' + esc(w.nearest.storeName || '') : '') + '</div></div><span class="price" style="color:var(--wine);font-weight:800">' + money(w.bestPrice) + '</span></div>';
    }).join('');
    setTimeout(function () { mountLeaflet(arr); }, 0);
    return '<div class="map-real"><div id="leafmap"></div>' +
      '<div class="map-list"><div class="map-list-head"><b>Más cercanos primero</b> <span class="locchip" id="locchip">' +
      (state.userLoc.source === 'gps' ? '📍 Tu ubicación' : '📍 Caracas (aprox.)') + '</span></div>' + nearby + '</div></div>';
  }

  function mountLeaflet(stores) {
    var el = document.getElementById('leafmap');
    if (!el || typeof L === 'undefined') { if (el) el.innerHTML = '<div style="padding:24px;color:var(--muted)">No se pudo cargar el mapa. Revisa tu conexión.</div>'; return; }
    if (_leaf) { _leaf.remove(); _leaf = null; }
    var map = L.map(el);
    _leaf = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap',
    }).addTo(map);
    var pts = [];
    stores.forEach(function (s) {
      var km = round1(haversineKm(state.userLoc.lat, state.userLoc.lng, s.lat, s.lng));
      var dir = 'https://www.google.com/maps/dir/?api=1&destination=' + s.lat + ',' + s.lng;
      L.marker([s.lat, s.lng]).addTo(map)
        .bindPopup('<b>' + esc(s.name) + '</b>' +
          (s.address ? '<br>' + esc(s.address) : '') +
          '<br>desde ' + money(s.price) + ' · ' + km + ' km' +
          '<br><a href="' + dir + '" target="_blank" rel="noopener">Cómo llegar →</a>');
      pts.push([s.lat, s.lng]);
    });
    L.circleMarker([state.userLoc.lat, state.userLoc.lng], { radius: 8, color: '#641E2E', fillColor: '#641E2E', fillOpacity: 1 })
      .addTo(map).bindPopup('Tu ubicación');
    pts.push([state.userLoc.lat, state.userLoc.lng]);
    map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 });
  }

  function toggleHome() {
    var showHome = state.term === '' && state.type === '' && state.country === '' && state.price === 'all' && state.mode === 'lista';
    ['.hero-carousel', '.promo-tiles', '.section'].forEach(function (sel) {
      var el = $(sel); if (el) el.style.display = showHome ? '' : 'none';
    });
  }

  // ---------- reserva (el checkout con seña llega en el Plan 2) ----------
  function reserve(id) {
    if (!getUser()) {
      setPendingReturn('return=reserve:' + id);
      window.location.href = 'login.html';
      return;
    }
    var w = state.raw.filter(function (x) { return x.id === id; })[0];
    if (w) openCheckout(w, state.userLoc);
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#641E2E;color:#fff;padding:14px 22px;border-radius:50px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,0.3);z-index:2000';
    document.body.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 400); }, 2200);
  }

  // ---------- events ----------
  function bind() {
    var searchTimer = null;
    $('#search').addEventListener('input', function (e) {
      state.term = e.target.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { reload(); }, 300);
    });

    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-cat],[data-sort],[data-mode],[data-open],[data-reserve],[data-detail],[data-type],[data-country],[data-price],[data-logout],#loadMore,#clearFilters');
      if (!t) return;
      if (t.id === 'clearFilters') { state.term = ''; state.type = ''; state.country = ''; state.price = 'all'; $('#search').value = ''; reload(); return; }
      if (t.id === 'loadMore') { e.preventDefault(); state.page += 1; loadPage(false).then(function () { renderView(); }); return; }
      if (t.hasAttribute('data-cat')) {
        e.preventDefault();
        var v = t.getAttribute('data-cat');
        var TYPES = ['Tinto', 'Blanco', 'Espumante', 'Rosado', 'Fortificado'];
        var COUNTRIES = ['Venezuela', 'Argentina', 'Chile', 'España', 'Italia', 'Francia', 'Portugal', 'US'];
        state.type = ''; state.country = ''; state.term = ''; state.price = 'all'; $('#search').value = '';
        if (TYPES.indexOf(v) !== -1) state.type = v;
        else if (COUNTRIES.indexOf(v) !== -1) state.country = v;
        else if (v) state.term = v;
        reload(); window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (t.hasAttribute('data-type')) { state.type = (state.type === t.getAttribute('data-type') ? '' : t.getAttribute('data-type')); reload(); }
      else if (t.hasAttribute('data-country')) { state.country = (state.country === t.getAttribute('data-country') ? '' : t.getAttribute('data-country')); reload(); }
      else if (t.hasAttribute('data-price')) { state.price = t.getAttribute('data-price'); reload(); }
      else if (t.hasAttribute('data-sort')) { state.sort = t.getAttribute('data-sort'); reload(); }
      else if (t.hasAttribute('data-mode')) { state.mode = t.getAttribute('data-mode'); renderToolbar(); renderView(); toggleHome(); }
      else if (t.hasAttribute('data-open')) { e.preventDefault(); window.location.href = 'login.html' + (t.getAttribute('data-open') === 'register' ? '?register' : ''); }
      else if (t.hasAttribute('data-reserve')) { e.stopPropagation(); reserve(t.getAttribute('data-reserve')); }
      else if (t.hasAttribute('data-detail')) { e.preventDefault(); if (window.CavaDetail) window.CavaDetail.open(t.getAttribute('data-detail')); }
      else if (t.hasAttribute('data-logout')) { logout(); state.user = null; render(); }
    });
  }

  async function init() {
    bind();
    renderCarousel(); renderTiles();
    renderAccount(); renderCatbar();
    $('#view').innerHTML = '<div style="text-align:center;padding:60px;color:var(--muted)">Cargando catálogo…</div>';

    try {
      var f = await getFacets();
      state.facets = f;
    } catch (e) { /* filtros vacíos si falla */ }
    try {
      state.bestsellers = await getBestsellers();
    } catch (e) { state.bestsellers = []; }
    renderFilters(); renderBestsellers();

    await loadPage(true);
    render();

    window.CavaLoc = state.userLoc;
    getUserLocation().then(function (loc) {
      state.userLoc = loc;
      window.CavaLoc = loc;
      renderView();
      var chip = $('#locchip');
      if (chip) chip.textContent = loc.source === 'gps' ? '📍 Tu ubicación' : '📍 Caracas (aprox.)';
    });

    var reserveId = new URLSearchParams(location.search).get('reserve');
    if (reserveId && window.CavaDetail) {
      history.replaceState(null, '', location.pathname);
      window.CavaDetail.open(reserveId);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
