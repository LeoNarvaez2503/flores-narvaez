import * as api from './api.js';
import { isValidEmail } from './validators.js';

const $ = (s) => document.querySelector(s);
const token = new URLSearchParams(location.search).get('token');

const el = {
  title: $('#rc-title'), sub: $('#rc-sub'), form: $('#rc-form'),
  fieldEmail: $('#rc-field-email'), fieldPass: $('#rc-field-pass'),
  email: $('#rc-email'), pass: $('#rc-pass'),
  error: $('#rc-error'), submit: $('#rc-submit'),
};

function showError(msg) { el.error.textContent = msg; el.error.hidden = false; }
function done(msg) { el.form.hidden = true; el.sub.textContent = msg; }

if (token) {
  el.title.textContent = 'Crea tu nueva contraseña';
  el.sub.textContent = 'Elige una contraseña de al menos 6 caracteres.';
  el.fieldEmail.hidden = true;
  el.fieldPass.hidden = false;
  el.submit.textContent = 'Guardar contraseña';
}

el.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.error.hidden = true;
  el.submit.disabled = true; el.submit.textContent = 'Un momento…';
  try {
    if (token) {
      const pass = el.pass.value;
      if (pass.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
      await api.resetPassword(token, pass);
      done('¡Listo! Tu contraseña fue cambiada. Ya puedes iniciar sesión con ella.');
    } else {
      const email = el.email.value.trim();
      if (!isValidEmail(email)) throw new Error('Ingresa un correo válido.');
      await api.forgotPassword(email);
      done('Si ese correo está registrado, te enviamos un enlace para crear una nueva contraseña. Revisa tu bandeja.');
    }
  } catch (err) {
    showError(err.message || 'No se pudo conectar con el servidor.');
    el.submit.disabled = false;
    el.submit.textContent = token ? 'Guardar contraseña' : 'Enviar enlace';
  }
});
