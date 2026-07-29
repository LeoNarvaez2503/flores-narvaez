/**
 * Configuración de la app. La API key de Google Maps se lee de una variable de
 * entorno pública de Expo (definila en `.env`):
 *
 *   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=tu_clave
 *
 * Si no hay clave, el mapa usa un fallback SVG para que la demo funcione igual.
 */
export const GOOGLE_MAPS_API_KEY: string =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export const hasGoogleMaps: boolean = GOOGLE_MAPS_API_KEY.length > 0;

/** Endpoint del backend (cuando se conecte el API real). */
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

/**
 * URL del landing animado (escenas + videos) que se incrusta en la app.
 * En el preview web carga con localhost; para un teléfono real, coloca la IP de
 * tu PC en la red (ej. http://192.168.1.X:3000) o el landing hosteado.
 */
export const LANDING_URL: string =
  process.env.EXPO_PUBLIC_LANDING_URL ?? 'http://localhost:3000';
