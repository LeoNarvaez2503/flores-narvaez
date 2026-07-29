// Ubicación del usuario (GPS real con respaldo a Caracas) + distancia Haversine.
export const DEFAULT_LOC = { lat: 10.497, lng: -66.854 };

function rad(d) { return (d * Math.PI) / 180; }

export function haversineKm(aLat, aLng, bLat, bLng) {
  const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(rad(aLat)) * Math.cos(rad(bLat));
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function getUserLocation() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ ...DEFAULT_LOC, source: 'default' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'gps' }),
      () => resolve({ ...DEFAULT_LOC, source: 'default' }),
      { timeout: 8000, maximumAge: 600000 },
    );
  });
}
