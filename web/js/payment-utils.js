// Validación pura de tarjeta para feedback instantáneo en el checkout (el backend revalida).
export function luhnValid(num) {
  const s = String(num || '').replace(/\D/g, '');
  if (s.length < 13 || s.length > 19) return false;
  let sum = 0, alt = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = Number(s[i]);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}
export function formatCardNumber(v) {
  return String(v || '').replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}
export function expiryValid(mmYY, now = new Date()) {
  const m = /^(\d{2})\/(\d{2})$/.exec(String(mmYY || '').trim());
  if (!m) return false;
  const mo = Number(m[1]); const yr = 2000 + Number(m[2]);
  if (mo < 1 || mo > 12) return false;
  return new Date(yr, mo, 1) > now;
}
export function cvvValid(v) { return /^\d{3,4}$/.test(String(v || '').trim()); }
