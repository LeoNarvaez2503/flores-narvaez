import { myReservations, cancelReservation } from './api.js';
import { getUser } from './store.js';
import { money } from './money.js';

const $ = (s) => document.querySelector(s);
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

const STATUS = {
  pending_payment: { label: 'Pendiente de pago', cls: 'pend' },
  confirmed: { label: 'Confirmada', cls: 'ok' },
  cancelled: { label: 'Cancelada', cls: 'off' },
  expired: { label: 'Expirada', cls: 'off' },
};

function fmtDate(iso) { return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }); }

function card(r) {
  const s = STATUS[r.status] || { label: r.status, cls: 'off' };
  const cancellable = r.status === 'pending_payment' || r.status === 'confirmed';
  const lugar = r.orderType === 'delivery' ? 'Delivery a ' + esc(r.deliveryAddress || '') : 'Retiro en ' + esc(r.storeName);
  return '<div class="rv-card">' +
    '<div class="rv-top"><b>' + esc(r.invoiceNumber) + '</b><span class="rv-chip ' + s.cls + '">' + esc(s.label) + '</span></div>' +
    '<div class="rv-wine">' + esc(r.wineName) + ' × ' + esc(r.quantity) + ' — ' + esc(r.wineryName) + '</div>' +
    '<div class="rv-meta">' + lugar + ' · ' + fmtDate(r.createdAt) + '</div>' +
    '<div class="rv-amounts"><span>Total <b>' + money(r.total) + '</b></span><span>Seña <b>' + money(r.deposit) + '</b></span></div>' +
    (cancellable ? '<button class="rv-cancel" data-cancel="' + esc(r.id) + '">Cancelar reserva</button>' : '') +
    '</div>';
}

async function load() {
  const host = $('#rv-list');
  host.innerHTML = '<p class="rv-empty">Cargando…</p>';
  try {
    const list = await myReservations();
    host.innerHTML = list.length
      ? list.map(card).join('')
      : '<p class="rv-empty">Aún no tienes reservas. <a href="index.html">Explora el catálogo</a>.</p>';
  } catch (e) {
    host.innerHTML = '<p class="rv-empty">' + esc(e.message || 'No se pudieron cargar tus reservas.') + '</p>';
  }
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-cancel]');
  if (!btn) return;
  if (!confirm('¿Cancelar esta reserva? Esta acción no se puede deshacer.')) return;
  btn.disabled = true; btn.textContent = 'Cancelando…';
  try {
    await cancelReservation(btn.getAttribute('data-cancel'));
    await load();
  } catch (err) {
    btn.disabled = false; btn.textContent = 'Cancelar reserva';
    alert(err.message || 'No se pudo cancelar.');
  }
});

if (!getUser()) window.location.href = 'login.html';
else load();
