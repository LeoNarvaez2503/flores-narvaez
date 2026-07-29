// Adapta el vino del endpoint de detalle al formato que espera openCheckout().
import { haversineKm } from './geo.js';

const round1 = (n) => Math.round(n * 10) / 10;

export function toCheckoutWine(w, userLoc) {
  return {
    id: w.id, winery: w.wineryName, name: w.name, vintage: w.vintage,
    offers: (w.offers || []).map((o) => ({
      storeId: o.establishmentId, storeName: o.storeName, price: Number(o.price),
      status: o.status, lat: o.lat, lng: o.lng,
      dist: userLoc ? round1(haversineKm(userLoc.lat, userLoc.lng, o.lat, o.lng)) : null,
    })),
  };
}
