import * as api from './api.js';
import { getUser } from './store.js';
import { money } from './money.js';
import { luhnValid, formatCardNumber, expiryValid, cvvValid } from './payment-utils.js';
import { deliveryFee } from './delivery.js';
import { haversineKm, DEFAULT_LOC } from './geo.js';

const $ = (s, r) => (r || document).querySelector(s);
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

let st = null;

export function openCheckout(wine, userLoc) {
  const user = getUser();
  const offers = (wine.offers || []).filter((o) => o.status !== 'AGOTADO').sort((a, b) => a.price - b.price);
  if (!offers.length) { alert('Este vino está agotado en todas las tiendas por ahora.'); return; }
  st = {
    wine, offers, offerIdx: 0, quantity: 1,
    customer: { name: user ? user.name : '', email: user ? user.email : '', phone: '' },
    pickupDate: '', orderType: 'pickup', deliveryAddress: '',
    deliveryPoint: { ...(userLoc || DEFAULT_LOC) },
    step: 1, reservation: null, _miniMap: null,
    confirming: false, preview: null, payload: null,
  };
  render();
}

function close() { if (st && st._miniMap) { st._miniMap.remove(); st._miniMap = null; } const el = $('#checkout'); el.innerHTML = ''; st = null; }

function steps(n) {
  return '<div class="co-steps">' + [1, 2, 3, 4].map((i) =>
    '<div class="st ' + (i < n ? 'done' : i === n ? 'active' : '') + '"></div>').join('') + '</div>';
}

function render() {
  const el = $('#checkout');
  let inner = '';
  if (st.step === 1) inner = stepReserva();
  else if (st.step === 2) inner = st.confirming ? stepConfirmar() : stepDatos();
  else if (st.step === 3) inner = stepPago();
  else inner = stepConfirma();
  el.innerHTML = '<div class="co-bg"><div class="co-modal">' +
    '<div class="co-head"><h3>' + (st.step === 4 ? 'Reserva confirmada' : 'Reservar') + '</h3>' +
    (st.step === 4 ? '' : '<button class="co-close" aria-label="Cerrar">✕</button>') + '</div>' +
    (st.step === 4 ? '' : steps(st.step)) +
    '<div class="co-body">' + inner + '</div></div></div>';
  bind();
}

function prodCard() {
  const w = st.wine;
  return '<div class="co-prod"><div><div class="wn">' + esc(w.winery) + '</div><div class="nm">' + esc(w.name) + (w.vintage ? ' ' + w.vintage : '') + '</div></div></div>';
}

function stepReserva() {
  const opts = st.offers.map((o, i) =>
    '<option value="' + i + '"' + (i === st.offerIdx ? ' selected' : '') + '>' + esc(o.storeName) + ' — ' + money(o.price) + (o.dist != null ? ' · ' + o.dist + ' km' : '') + '</option>').join('');
  const qty = [1, 2, 3, 4, 5, 6].map((n) => '<option value="' + n + '"' + (n === st.quantity ? ' selected' : '') + '>' + n + '</option>').join('');
  return prodCard() +
    '<div class="co-field"><label>Tienda para retirar</label><select id="co-store">' + opts + '</select></div>' +
    '<div class="co-field"><label>Cantidad</label><select id="co-qty">' + qty + '</select></div>' +
    '<div class="co-actions"><button class="co-btn prim" id="co-next">Continuar</button></div>';
}

function stepDatos() {
  const c = st.customer;
  const isDel = st.orderType === 'delivery';
  const store = st.offers[st.offerIdx];
  const km = round1Km(haversineKm(store.lat, store.lng, st.deliveryPoint.lat, st.deliveryPoint.lng));
  const fee = deliveryFee(km);
  const deliveryBlock = isDel
    ? '<div class="co-field"><label>Dirección de entrega</label><input id="co-addr" value="' + esc(st.deliveryAddress) + '" placeholder="Calle, edificio, referencia" /></div>' +
      '<div class="co-minihint">Arrastra el pin para marcar el punto exacto de entrega.</div>' +
      '<div id="co-mini" class="co-mini"></div>' +
      '<div class="co-deliv-note" id="co-feenote">Envío estimado a ' + km + ' km: <b>' + money(fee) + '</b> · el total final lo confirma el sistema.</div>'
    : '';
  return prodCard() +
    '<div class="co-seg"><button class="co-segbtn ' + (!isDel ? 'on' : '') + '" data-ot="pickup">Retiro en tienda</button>' +
    '<button class="co-segbtn ' + (isDel ? 'on' : '') + '" data-ot="delivery">Delivery</button></div>' +
    '<div class="co-field"><label>Nombre</label><input id="co-name" value="' + esc(c.name) + '" placeholder="Tu nombre" /></div>' +
    '<div class="co-field"><label>Correo (te llega la factura)</label><input id="co-email" type="email" value="' + esc(c.email) + '" placeholder="tucorreo@ejemplo.com" /></div>' +
    '<div class="co-row"><div class="co-field"><label>Teléfono</label><input id="co-phone" value="' + esc(c.phone) + '" placeholder="Opcional" /></div>' +
    '<div class="co-field"><label>' + (isDel ? 'Fecha de entrega' : 'Fecha de retiro') + '</label><input id="co-date" type="date" value="' + esc(st.pickupDate) + '" /></div></div>' +
    deliveryBlock +
    '<div class="co-error co-hide" id="co-err"></div>' +
    '<div class="co-actions"><button class="co-btn ghost" id="co-back">Atrás</button><button class="co-btn prim" id="co-next">' + (isDel ? 'Ir a pagar la seña' : 'Ir a pagar') + '</button></div>';
}

function stepConfirmar() {
  const p = st.preview;
  const store = st.offers[st.offerIdx];
  return prodCard() +
    '<div class="co-minihint">Revisa el desglose antes de crear tu reserva en <b>' + esc(store.storeName) + '</b>. Todavía no se reservó nada.</div>' +
    summary(p) +
    '<div class="co-error co-hide" id="co-err"></div>' +
    '<div class="co-actions"><button class="co-btn ghost" id="co-back2">Volver</button><button class="co-btn prim" id="co-confirm">Confirmar reserva</button></div>';
}

function round1Km(n) { return Math.round(n * 10) / 10; }

function mountMiniMap() {
  const el = document.getElementById('co-mini');
  if (!el || typeof L === 'undefined') { if (el) el.innerHTML = '<div style="padding:14px;color:var(--muted);font-size:13px">Mapa no disponible (sin conexión).</div>'; return; }
  if (st._miniMap) { st._miniMap.remove(); st._miniMap = null; }
  const store = st.offers[st.offerIdx];
  const map = L.map(el); st._miniMap = map;
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  L.marker([store.lat, store.lng]).addTo(map).bindPopup('Sede: ' + esc(store.storeName));
  const me = L.marker([st.deliveryPoint.lat, st.deliveryPoint.lng], { draggable: true }).addTo(map).bindPopup('Punto de entrega (arrástrame)');
  me.on('dragend', function () {
    const p = me.getLatLng();
    st.deliveryPoint = { lat: p.lat, lng: p.lng };
    const km = round1Km(haversineKm(store.lat, store.lng, p.lat, p.lng));
    const note = document.getElementById('co-feenote');
    if (note) note.innerHTML = 'Envío estimado a ' + km + ' km: <b>' + money(deliveryFee(km)) + '</b> · el total final lo confirma el sistema.';
  });
  map.fitBounds([[store.lat, store.lng], [st.deliveryPoint.lat, st.deliveryPoint.lng]], { padding: [25, 25], maxZoom: 15 });
}

function summary(r) {
  const disc = r.discountPct > 0
    ? '<div class="ln disc"><span>Descuento primera reserva (' + r.discountPct + '%)</span><span>-' + money(r.discountAmount) + '</span></div>' : '';
  const envio = Number(r.deliveryFee) > 0
    ? '<div class="ln"><span>Envío</span><span>' + money(r.deliveryFee) + '</span></div>' : '';
  const saldoLabel = r.orderType === 'delivery' ? 'Resto a pagar al recibir (efectivo)' : 'Saldo al retirar (80%)';
  return '<div class="co-summary">' +
    '<div class="ln"><span>Subtotal (' + r.quantity + ' × ' + money(r.unitPrice) + ')</span><span>' + money(r.subtotal) + '</span></div>' +
    disc + envio +
    '<div class="ln tot"><span>Total</span><span>' + money(r.total) + '</span></div>' +
    '<div class="ln dep"><span>Seña a pagar ahora (20%)</span><span>' + money(r.deposit) + '</span></div>' +
    '<div class="ln bal"><span>' + saldoLabel + '</span><span>' + money(r.balance) + '</span></div></div>';
}

function stepPago() {
  const r = st.reservation;
  return summary(r) +
    '<div class="co-field"><label>Número de tarjeta</label><input id="cc-num" inputmode="numeric" placeholder="4242 4242 4242 4242" /></div>' +
    '<div class="co-row"><div class="co-field"><label>Vencimiento</label><input id="cc-exp" placeholder="MM/AA" /></div>' +
    '<div class="co-field"><label>CVV</label><input id="cc-cvv" inputmode="numeric" placeholder="123" /></div></div>' +
    '<div class="co-field"><label>Titular</label><input id="cc-name" placeholder="Como figura en la tarjeta" /></div>' +
    '<div class="co-error co-hide" id="co-err"></div>' +
    '<div class="co-actions"><button class="co-btn ghost" id="co-back">Atrás</button><button class="co-btn prim" id="co-pay">Pagar ' + money(r.deposit) + '</button></div>';
}

function stepConfirma() {
  const r = st.reservation;
  const mailMsg = st._emailSent
    ? 'Te enviamos la factura a <b>' + esc(r.customerEmail) + '</b>.'
    : 'No pudimos enviar el correo, pero puedes imprimir la factura.';
  return '<div class="co-ok"><div class="check">✓</div>' +
    '<h3>¡Reserva confirmada!</h3>' +
    '<p>Código <b>' + esc(r.invoiceNumber) + '</b>. ' + mailMsg + '</p></div>' +
    summary(r) +
    '<div class="co-actions"><button class="co-btn ghost" id="co-print">Imprimir factura</button><button class="co-btn prim" id="co-done">Listo</button></div>';
}

function showErr(msg) { const e = $('#co-err'); if (e) { e.textContent = msg; e.classList.remove('co-hide'); } }

function bind() {
  const close1 = $('.co-close'); if (close1) close1.onclick = close;
  const bg = $('.co-bg'); if (bg) bg.onclick = (e) => { if (e.target === bg) close(); };
  const back = $('#co-back'); if (back) back.onclick = () => { st.step--; if (st.step === 2) { st.reservation = null; st.confirming = false; } render(); };

  if (st.step === 1) {
    $('#co-store').onchange = (e) => { st.offerIdx = Number(e.target.value); };
    $('#co-qty').onchange = (e) => { st.quantity = Number(e.target.value); };
    $('#co-next').onclick = () => { st.step = 2; render(); };
  }

  if (st.step === 2 && !st.confirming) {
    document.querySelectorAll('.co-segbtn').forEach(function (b) {
      b.onclick = function () {
        st.customer.name = ($('#co-name') || {}).value || st.customer.name;
        st.customer.email = ($('#co-email') || {}).value || st.customer.email;
        st.customer.phone = ($('#co-phone') || {}).value || st.customer.phone;
        st.deliveryAddress = ($('#co-addr') || {}).value || st.deliveryAddress;
        st.pickupDate = ($('#co-date') || {}).value || st.pickupDate;
        st.orderType = b.getAttribute('data-ot');
        render();
      };
    });
    if (st.orderType === 'delivery') setTimeout(mountMiniMap, 0);
    $('#co-next').onclick = async () => {
      st.customer.name = $('#co-name').value.trim();
      st.customer.email = $('#co-email').value.trim();
      st.customer.phone = $('#co-phone').value.trim();
      st.pickupDate = $('#co-date').value;
      if (st.orderType === 'delivery') st.deliveryAddress = ($('#co-addr').value || '').trim();
      if (!st.customer.name) return showErr('Ingresa tu nombre.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(st.customer.email)) return showErr('Ingresa un correo válido.');
      if (st.orderType === 'delivery' && !st.deliveryAddress) return showErr('Ingresa la dirección de entrega.');
      const offer = st.offers[st.offerIdx];
      const btn = $('#co-next'); btn.disabled = true; btn.textContent = 'Calculando…';
      const payload = {
        wineId: st.wine.id, establishmentId: offer.storeId, quantity: st.quantity,
        customer: { name: st.customer.name, email: st.customer.email, phone: st.customer.phone || undefined },
        pickupDate: st.pickupDate || undefined,
        orderType: st.orderType,
      };
      if (st.orderType === 'delivery') {
        payload.deliveryAddress = st.deliveryAddress;
        payload.deliveryLat = st.deliveryPoint.lat;
        payload.deliveryLng = st.deliveryPoint.lng;
      }
      try {
        st.payload = payload;
        st.preview = await api.previewReservation(payload);
        st.confirming = true; render();
      } catch (err) { btn.disabled = false; btn.textContent = st.orderType === 'delivery' ? 'Ir a pagar la seña' : 'Ir a pagar'; showErr(err.message); }
    };
  }

  if (st.step === 2 && st.confirming) {
    $('#co-back2').onclick = () => { st.confirming = false; render(); };
    $('#co-confirm').onclick = async () => {
      const btn = $('#co-confirm'); btn.disabled = true; btn.textContent = 'Creando reserva…';
      try {
        st.reservation = await api.createReservation(st.payload);
        if (st._miniMap) { st._miniMap.remove(); st._miniMap = null; }
        st.confirming = false; st.step = 3; render();
      } catch (err) { btn.disabled = false; btn.textContent = 'Confirmar reserva'; showErr(err.message); }
    };
  }

  if (st.step === 3) {
    const num = $('#cc-num');
    num.oninput = () => { num.value = formatCardNumber(num.value); };
    $('#co-pay').onclick = async () => {
      const card = { cardNumber: num.value, expiry: $('#cc-exp').value.trim(), cvv: $('#cc-cvv').value.trim(), cardName: $('#cc-name').value.trim() };
      if (!luhnValid(card.cardNumber)) return showErr('Número de tarjeta inválido.');
      if (!expiryValid(card.expiry)) return showErr('Vencimiento inválido o tarjeta vencida.');
      if (!cvvValid(card.cvv)) return showErr('CVV inválido.');
      if (!card.cardName) return showErr('Ingresa el titular.');
      const btn = $('#co-pay'); btn.disabled = true; btn.textContent = 'Procesando…';
      try {
        const out = await api.payReservation(st.reservation.id, card);
        st.reservation = out.reservation; st._emailSent = out.emailSent;
        st.step = 4; render();
      } catch (err) { btn.disabled = false; btn.textContent = 'Pagar ' + money(st.reservation.deposit); showErr(err.message); }
    };
  }

  if (st.step === 4) {
    $('#co-done').onclick = close;
    $('#co-print').onclick = () => printInvoice(st.reservation);
  }
}

function printInvoice(r) {
  const w = window.open('', '_blank');
  const saldoLabel = r.orderType === 'delivery' ? 'Resto al recibir (efectivo)' : 'Saldo al retirar (80%)';
  const disc = r.discountPct > 0 ? '<tr><td>Descuento (' + r.discountPct + '%)</td><td style="text-align:right">-' + money(r.discountAmount) + '</td></tr>' : '';
  w.document.write('<html><head><title>Factura ' + esc(r.invoiceNumber) + '</title></head><body style="font-family:Arial;max-width:560px;margin:24px auto;color:#2A2024">' +
    '<h2 style="color:#641E2E">CavaLocal — Factura ' + esc(r.invoiceNumber) + '</h2>' +
    '<p>' + esc(r.customerName) + ' · ' + esc(r.customerEmail) + '</p>' +
    (r.orderType === 'delivery'
      ? '<p><b>' + esc(r.wineName) + '</b> × ' + r.quantity + ' — Delivery a ' + esc(r.deliveryAddress || '') + '</p>'
      : '<p><b>' + esc(r.wineName) + '</b> × ' + r.quantity + ' — retirar en ' + esc(r.storeName) + ' (' + esc(r.storeAddress) + ')</p>') +
    '<table style="width:100%;border-collapse:collapse">' +
    '<tr><td>Subtotal</td><td style="text-align:right">' + money(r.subtotal) + '</td></tr>' + disc +
    '<tr><td><b>Total</b></td><td style="text-align:right"><b>' + money(r.total) + '</b></td></tr>' +
    '<tr><td>Seña pagada (20%)</td><td style="text-align:right">' + money(r.deposit) + '</td></tr>' +
    '<tr><td>' + saldoLabel + '</td><td style="text-align:right">' + money(r.balance) + '</td></tr></table>' +
    '<p style="font-size:12px;color:#999">Pago de prueba — sin cobro real. Bebé con moderación · +18.</p>' +
    '</body></html>');
  w.document.close(); w.focus(); w.print();
}
