// Sesión persistida en localStorage (claves existentes cl_token / cl_user).
const T = 'cl_token', U = 'cl_user', R = 'cl_return';

export function getToken() { return localStorage.getItem(T); }
export function getUser() { try { return JSON.parse(localStorage.getItem(U) || 'null'); } catch { return null; } }
export function setSession(token, user) {
  localStorage.setItem(T, token);
  localStorage.setItem(U, JSON.stringify(user));
}
export function logout() { localStorage.removeItem(T); localStorage.removeItem(U); }
export function setPendingReturn(value) { localStorage.setItem(R, value); }
export function takePendingReturn() { const v = localStorage.getItem(R); localStorage.removeItem(R); return v; }
