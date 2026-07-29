import { isValidEmail, passwordStrength } from './validators.js';
import * as api from './api.js';
import { setSession, takePendingReturn } from './store.js';
import { GOOGLE_CLIENT_ID } from './config.js';

const $ = (s) => document.querySelector(s);
let mode = 'login';

const el = {
  tabs: document.querySelectorAll('.login-tab'),
  fieldName: $('#field-name'),
  name: $('#in-name'), email: $('#in-email'), pass: $('#in-pass'),
  hintEmail: $('#hint-email'), strength: $('#strength'),
  title: $('#login-title'), subtitle: $('#login-subtitle'),
  submit: $('#login-submit'), error: $('#login-error'),
  form: $('#login-form'), toggle: $('#toggle-pass'),
};

function setMode(next) {
  mode = next;
  const isLogin = mode === 'login';
  el.tabs.forEach((t) => {
    const on = t.dataset.mode === mode;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  el.fieldName.hidden = isLogin;
  el.title.textContent = isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta';
  el.subtitle.textContent = isLogin
    ? 'Entra para seguir descubriendo vinos.'
    : 'Súmate y reserva en segundos.';
  el.submit.textContent = isLogin ? 'Iniciar sesión' : 'Crear cuenta';
  el.pass.setAttribute('autocomplete', isLogin ? 'current-password' : 'new-password');
  el.strength.hidden = isLogin;
  hideError();
  validateLive();
}

function showError(msg) { el.error.textContent = msg; el.error.hidden = false; }
function hideError() { el.error.hidden = true; }

function validateLive() {
  const hasEmail = el.email.value.length > 0;
  const emailOk = isValidEmail(el.email.value);
  el.email.classList.toggle('valid', emailOk && hasEmail);
  el.email.classList.toggle('invalid', !emailOk && hasEmail);
  el.hintEmail.textContent = (!emailOk && hasEmail) ? 'Revisá el correo: falta algo.' : '';

  if (mode === 'register') {
    const s = passwordStrength(el.pass.value);
    el.strength.dataset.score = String(s.score);
    el.strength.querySelector('small').textContent = el.pass.value ? s.label : '';
  }
}

function redirectAfterAuth() {
  // Si el usuario venía de intentar reservar un vino, lo devolvemos a ese vino.
  const pending = takePendingReturn();
  const m = /^return=reserve:(.+)$/.exec(pending || '');
  window.location.href = m ? 'index.html?reserve=' + encodeURIComponent(m[1]) : 'index.html';
}

async function submit(e) {
  e.preventDefault();
  hideError();
  const email = el.email.value.trim();
  const pass = el.pass.value;
  if (!isValidEmail(email)) return showError('Ingresa un correo válido.');
  if (!passwordStrength(pass).valid) return showError('La contraseña debe tener al menos 6 caracteres.');
  if (mode === 'register' && !el.name.value.trim()) return showError('Ingresa tu nombre.');

  el.submit.disabled = true;
  el.submit.textContent = 'Un momento…';
  try {
    const data = mode === 'login'
      ? await api.login({ email, password: pass })
      : await api.register({ name: el.name.value.trim(), email, password: pass });
    setSession(data.accessToken, data.user);
    redirectAfterAuth();
  } catch (err) {
    showError(err.message || 'No se pudo conectar con el servidor.');
    el.submit.disabled = false;
    el.submit.textContent = mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta';
  }
}

async function onGoogle(response) {
  hideError();
  try {
    const data = await api.googleLogin(response.credential);
    setSession(data.accessToken, data.user);
    redirectAfterAuth();
  } catch (err) {
    showError(err.message || 'No se pudo iniciar sesión con Google.');
  }
}

function initGoogle() {
  const configured = GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('PEGAR_');
  if (!configured || !window.google || !window.google.accounts) {
    $('#google-fallback').hidden = false;
    return;
  }
  window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onGoogle });
  window.google.accounts.id.renderButton($('#google-btn'), {
    theme: 'outline', size: 'large', width: 356, text: 'continue_with', shape: 'pill',
  });
}

// ---------- init ----------
el.tabs.forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode)));
el.email.addEventListener('input', validateLive);
el.pass.addEventListener('input', validateLive);
el.toggle.addEventListener('click', () => {
  const showing = el.pass.type === 'text';
  el.pass.type = showing ? 'password' : 'text';
  el.toggle.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
});
el.form.addEventListener('submit', submit);

if (new URLSearchParams(location.search).has('register')) setMode('register');
if (new URLSearchParams(location.search).has('expired')) showError('Tu sesión expiró. Inicia sesión de nuevo para continuar.');
window.addEventListener('load', () => setTimeout(initGoogle, 300));

// ---------- media del aside: respetar prefers-reduced-motion ----------
(function asideMedia() {
  const v = document.getElementById('login-cine');
  if (!v || typeof v.pause !== 'function') return;
  const mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!mq) return;
  function apply() {
    if (mq.matches) { try { v.removeAttribute('autoplay'); v.pause(); } catch (_) {} }
    else { try { v.setAttribute('autoplay', ''); v.play(); } catch (_) {} }
  }
  apply();
  mq.addEventListener('change', apply);
})();
