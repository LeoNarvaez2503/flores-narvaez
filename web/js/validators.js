// Validación pura reutilizable por el login (y luego el checkout).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value || '').trim());
}

export function passwordStrength(value) {
  const v = String(value || '');
  const valid = v.length >= 6;
  let score = 0;
  if (v.length >= 6) score++;
  if (v.length >= 10) score++;
  if (/[A-Z]/.test(v) && /[0-9]/.test(v)) score++;
  if (score > 3) score = 3;
  const labels = ['Muy débil', 'Débil', 'Buena', 'Fuerte'];
  return { score, label: labels[score], valid };
}
