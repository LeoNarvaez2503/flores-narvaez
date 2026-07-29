/**
 * CavaLocal — Dashboard SSE en Tiempo Real
 * Lógica del cliente EventSource, carga REST inicial, métricas, filtros y visor modal JSON.
 */

(function () {
  'use strict';

  // Configuración de endpoints (Soporta entorno Ingress y Desarrollo Local)
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const API_BASE = isLocalDev && window.location.port !== '80' && window.location.port !== ''
    ? 'http://localhost:3002/api/audit'
    : '/api/audit';

  const REST_URL = API_BASE;
  const SSE_URL = `${API_BASE}/stream`;

  // Almacén de eventos local en memoria
  let events = [];
  let eventSource = null;
  let metrics = { total: 0, vinos: 0, usuarios: 0, reservas: 0, pagos: 0 };

  // Elementos DOM
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const tableBody = document.getElementById('auditTableBody');
  const filterEntity = document.getElementById('filterEntity');
  const filterAction = document.getElementById('filterAction');
  const filterUser = document.getElementById('filterUser');
  const btnClearFilters = document.getElementById('btnClearFilters');

  const jsonModal = document.getElementById('jsonModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalMeta = document.getElementById('modalMeta');
  const modalBefore = document.getElementById('modalBefore');
  const modalAfter = document.getElementById('modalAfter');
  const btnCloseModal = document.getElementById('btnCloseModal');

  // Inicialización
  document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    fetchInitialLogs();
    connectSSE();
  });

  // Setup de Event Listeners
  function setupEventListeners() {
    filterEntity.addEventListener('change', renderTable);
    filterAction.addEventListener('change', renderTable);
    filterUser.addEventListener('input', renderTable);

    btnClearFilters.addEventListener('click', () => {
      filterEntity.value = '';
      filterAction.value = '';
      filterUser.value = '';
      renderTable();
    });

    btnCloseModal.addEventListener('click', closeModal);
    jsonModal.addEventListener('click', (e) => {
      if (e.target === jsonModal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  // 1. Carga Inicial REST
  async function fetchInitialLogs() {
    try {
      const response = await fetch(`${REST_URL}?limit=30`);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      
      const result = await response.json();
      if (result && Array.isArray(result.data)) {
        events = result.data;
        recalculateMetrics();
        renderTable();
      }
    } catch (err) {
      console.warn('[Dashboard] No se pudo cargar el historial REST inicial:', err.message);
    }
  }

  // 2. Conexión SSE (Server-Sent Events)
  function connectSSE() {
    updateStatus('connecting', 'Conectando a auditoría SSE...');

    try {
      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource(SSE_URL);

      eventSource.onopen = () => {
        updateStatus('connected', 'Conectado a SSE (Tiempo Real)');
      };

      eventSource.onmessage = (event) => {
        try {
          const newLog = JSON.parse(event.data);
          handleIncomingEvent(newLog);
        } catch (parseErr) {
          console.error('[Dashboard] Error al parsear evento SSE:', parseErr);
        }
      };

      eventSource.onerror = (err) => {
        console.warn('[Dashboard] Interrupción en SSE. Reconectando...', err);
        updateStatus('connecting', 'Reconectando canal SSE...');
      };
    } catch (err) {
      console.error('[Dashboard] Error al crear EventSource:', err);
      updateStatus('disconnected', 'Error de conexión SSE');
    }
  }

  // Actualiza el indicador de estado de conexión SSE
  function updateStatus(state, message) {
    statusDot.className = 'status-dot';
    statusDot.classList.add(state);
    statusText.textContent = message;
  }

  // Manejo de eventos entrantes SSE (< 2s latencia)
  function handleIncomingEvent(newEvent) {
    // Evitar duplicados por ID
    const exists = events.some((e) => e.id && newEvent.id && e.id === newEvent.id);
    if (exists) return;

    // Agregar al inicio del arreglo
    events.unshift(newEvent);

    // Actualizar métricas
    updateMetricsForEvent(newEvent);

    // Renderizar con animación flash para el elemento recién llegado
    renderTable(newEvent.id);
  }

  // Métricas
  function recalculateMetrics() {
    metrics = { total: events.length, vinos: 0, usuarios: 0, reservas: 0, pagos: 0 };
    for (const e of events) {
      const ent = (e.entity || '').toLowerCase();
      if (ent.includes('vino')) metrics.vinos++;
      else if (ent.includes('usuario')) metrics.usuarios++;
      else if (ent.includes('reserva')) metrics.reservas++;
      else if (ent.includes('pago')) metrics.pagos++;
    }
    updateMetricsUI();
  }

  function updateMetricsForEvent(e) {
    metrics.total++;
    const ent = (e.entity || '').toLowerCase();
    if (ent.includes('vino')) metrics.vinos++;
    else if (ent.includes('usuario')) metrics.usuarios++;
    else if (ent.includes('reserva')) metrics.reservas++;
    else if (ent.includes('pago')) metrics.pagos++;
    updateMetricsUI();
  }

  function updateMetricsUI() {
    document.getElementById('metricTotal').textContent = metrics.total;
    document.getElementById('metricVinos').textContent = metrics.vinos;
    document.getElementById('metricUsuarios').textContent = metrics.usuarios;
    document.getElementById('metricReservas').textContent = metrics.reservas;
    document.getElementById('metricPagos').textContent = metrics.pagos;
  }

  // Filtrado y Renderizado de Tabla
  function renderTable(highlightId = null) {
    const selectedEntity = filterEntity.value.toLowerCase();
    const selectedAction = filterAction.value.toUpperCase();
    const userSearch = filterUser.value.trim().toLowerCase();

    const filtered = events.filter((e) => {
      const matchEntity = !selectedEntity || (e.entity && e.entity.toLowerCase() === selectedEntity);
      const matchAction = !selectedAction || (e.action && e.action.toUpperCase() === selectedAction);
      const matchUser = !userSearch || 
        (e.userId && e.userId.toLowerCase().includes(userSearch)) || 
        (e.userEmail && e.userEmail.toLowerCase().includes(userSearch));
      return matchEntity && matchAction && matchUser;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">No se encontraron eventos de auditoría con los filtros aplicados.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filtered.map((e) => createTableRowHTML(e, e.id === highlightId)).join('');

    // Adjuntar handlers para botones de detalle
    const detailButtons = tableBody.querySelectorAll('.btn-detail');
    detailButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const found = events.find((ev) => String(ev.id) === String(id));
        if (found) openModal(found);
      });
    });
  }

  function createTableRowHTML(e, isNew = false) {
    const dateStr = e.timestamp ? new Date(e.timestamp).toLocaleString('es-EC') : 'N/A';
    const actionClass = getActionBadgeClass(e.action);
    const userLabel = e.userEmail ? `${e.userEmail} (${e.userId})` : e.userId || 'N/A';
    const flashClass = isNew ? 'flash-new' : '';

    // Resumen breve de datos
    let summaryText = 'Información registrada';
    if (e.data) {
      if (e.data.after && e.data.after.status) {
        summaryText = `Estado: <strong>${e.data.after.status}</strong>`;
      } else if (e.data.after && e.data.after.name) {
        summaryText = `Nombre: <strong>${e.data.after.name}</strong>`;
      }
    }

    return `
      <tr class="${flashClass}">
        <td style="font-size:0.85rem; color:var(--text-muted);">${dateStr}</td>
        <td><span class="badge badge-entity">${escapeHTML(e.entity || 'General')}</span></td>
        <td><span class="badge ${actionClass}">${escapeHTML(e.action || 'INFO')}</span></td>
        <td style="font-size:0.85rem;">${escapeHTML(userLabel)}</td>
        <td style="font-size:0.85rem;">${summaryText}</td>
        <td>
          <button class="btn-detail" data-id="${e.id}">Ver JSON</button>
        </td>
      </tr>
    `;
  }

  function getActionBadgeClass(action) {
    switch ((action || '').toUpperCase()) {
      case 'CREATE': return 'badge-action-create';
      case 'UPDATE': return 'badge-action-update';
      case 'DELETE': return 'badge-action-delete';
      default: return 'badge-entity';
    }
  }

  // Modal Viewer de JSON Diff
  function openModal(eventItem) {
    modalTitle.textContent = `Detalle de Auditoría #${eventItem.id || ''} — ${eventItem.entity || ''} (${eventItem.action || ''})`;
    modalMeta.textContent = `Fecha: ${new Date(eventItem.timestamp).toLocaleString('es-EC')} | Usuario: ${eventItem.userEmail || eventItem.userId}`;

    const beforeData = eventItem.data ? eventItem.data.before : null;
    const afterData = eventItem.data ? eventItem.data.after : null;

    modalBefore.innerHTML = beforeData 
      ? escapeHTML(JSON.stringify(beforeData, null, 2))
      : '<span class="json-null">(Sin datos previos - Registro Nuevo)</span>';

    modalAfter.innerHTML = afterData
      ? escapeHTML(JSON.stringify(afterData, null, 2))
      : '<span class="json-null">(Sin datos posteriores - Eliminado)</span>';

    jsonModal.classList.add('active');
  }

  function closeModal() {
    jsonModal.classList.remove('active');
  }

  function escapeHTML(str) {
    if (typeof str !== 'string') return String(str ?? '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();
