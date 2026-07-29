// Costo de envío del cliente: base + por km, redondeado. El backend recalcula igual.
const BASE_FEE = 0.80;   // cargo base del envío
const PER_KM = 0.35;     // costo por km
const MAX_KM = 50;       // tope de distancia (sanidad)
export function deliveryFee(km) {
  const k = Math.min(MAX_KM, Math.max(0, Number(km) || 0));
  return Math.round((BASE_FEE + PER_KM * k) * 100) / 100;
}
