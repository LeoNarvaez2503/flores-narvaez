import { API } from './config.js';
import { getToken, logout } from './store.js';

async function post(path, body) {
  const r = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data && data.message;
    throw new Error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Ocurrió un error.'));
  }
  return data;
}

export function login(creds) { return post('/auth/login', creds); }
export function register(data) { return post('/auth/register', data); }
export function googleLogin(idToken) { return post('/auth/google', { idToken }); }
export function forgotPassword(email) { return post('/auth/forgot-password', { email }); }
export function resetPassword(token, password) { return post('/auth/reset-password', { token, password }); }

function qs(params) {
  const p = new URLSearchParams();
  Object.keys(params || {}).forEach((k) => {
    const v = params[k];
    if (v !== undefined && v !== null && v !== '') p.append(k, v);
  });
  const s = p.toString();
  return s ? '?' + s : '';
}

export async function getWines(params) {
  const r = await fetch(API + '/wines' + qs(params));
  if (!r.ok) throw new Error('No se pudo cargar el catálogo.');
  return r.json(); // { items, total, page, pageSize }
}

export async function getWine(id) {
  const r = await fetch(API + '/wines/' + encodeURIComponent(id));
  if (!r.ok) throw new Error('No se pudo cargar el vino.');
  return r.json();
}

export async function getFacets() {
  const r = await fetch(API + '/wines/facets');
  if (!r.ok) throw new Error('No se pudieron cargar los filtros.');
  return r.json();
}

export async function getBestsellers() {
  const r = await fetch(API + '/wines/bestsellers');
  if (!r.ok) throw new Error('No se pudieron cargar los más vendidos.');
  return r.json();
}

export async function getWineReviews(id, page) {
  const r = await fetch(API + '/wines/' + encodeURIComponent(id) + '/reviews' + qs({ page }));
  if (!r.ok) throw new Error('No se pudieron cargar las reseñas.');
  return r.json();
}

async function authFetch(path, options) {
  const r = await fetch(API + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken(), ...(options && options.headers) },
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401) {
    logout();
    window.location.href = 'login.html?expired=1';
    throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
  }
  if (!r.ok) {
    const msg = data && data.message;
    throw new Error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Ocurrió un error.'));
  }
  return data;
}

export function createReservation(payload) { return authFetch('/reservations', { method: 'POST', body: JSON.stringify(payload) }); }
export function previewReservation(payload) { return authFetch('/reservations/preview', { method: 'POST', body: JSON.stringify(payload) }); }
export function payReservation(id, card) { return authFetch('/reservations/' + id + '/pay', { method: 'POST', body: JSON.stringify(card) }); }
export function cancelReservation(id) { return authFetch('/reservations/' + id + '/cancel', { method: 'POST' }); }
export function myReservations() { return authFetch('/reservations/me', { method: 'GET' }); }
export function createReview(payload) { return authFetch('/reviews', { method: 'POST', body: JSON.stringify(payload) }); }
