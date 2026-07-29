# CavaLocal — App (React Native + Expo)

App móvil B2C del marketplace de vinos CavaLocal. Réplica del diseño "Cavi ·
Mascota & Búsqueda" (burdeos + dorado), con catálogo real del mercado venezolano.

## Requisitos
- Node.js 20+ y npm
- (Opcional) App **Expo Go** en tu teléfono para verla en un dispositivo real

## Arrancar
```bash
cd app
npm install
npm run web        # abre en el navegador (http://localhost:8081)
# o:
npm start          # muestra un QR para abrir con Expo Go en el teléfono
```

## Variables de entorno (.env)
Copia `.env.example` a `.env`:
```bash
cp .env.example .env
```
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` — API key de Google Maps (opcional). **Sin
  ella, el mapa usa un fallback SVG** y la app funciona igual.
- `EXPO_PUBLIC_API_BASE_URL` — URL del backend cuando se conecte el API real.

## Cómo obtener la API key de Google Maps
1. Entra a https://console.cloud.google.com y crea (o elige) un proyecto.
2. Activa facturación (Google exige tarjeta; hay capa gratuita mensual).
3. **APIs y servicios → Biblioteca →** activa **Maps JavaScript API**.
4. **APIs y servicios → Credenciales → Crear credenciales → Clave de API**.
5. Pega la clave en `.env`:
   `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=tu_clave`
6. Reinicia: `npm run web`. El modo **Mapa** mostrará Google Maps real con los
   establecimientos.

## Estructura
- `src/theme/tokens.ts` — colores/espaciado/tipografía (identidad de marca)
- `src/data/catalog.ts` — vinos (locales + importados) y establecimientos de Caracas
- `src/data/selectors.ts` — búsqueda, comparación, cercanía (Haversine), categorías
- `src/components/` — UI (Cavi, tarjetas, mapa, cabecera…)
- `src/screens/` — Marca (Cavi) · Búsqueda (A/B/C) · Detalle · Reserva
- `src/navigation/` — stack de navegación

## Presentar app + landing
La landing (carpeta raíz del proyecto) tiene el botón **"Probar la app · Explorar
cavas"** que abre esta app. Para la presentación: ejecuta la app (`npm run web`) y
abre la landing; el botón abrirá la app en una pestaña nueva.
