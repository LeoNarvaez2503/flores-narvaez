# CavaLocal — Mapa real, GPS y delivery

**Fecha:** 2026-06-23
**Estado:** Diseño aprobado (pendiente de revisión final del usuario)
**Alcance:** frontend `web/` (mapa Leaflet, geolocalización, delivery en checkout) + backend `backend/` (datos de envío en `Reservation`, montos, factura).

---

## 1. Objetivo

Hoy la pestaña **"Mapa"** es una maqueta (pines sobre una caja decorada, sin tiles), la **ubicación del usuario está fija** en código (`{lat:10.497,lng:-66.854}`) y el checkout es **solo retiro en tienda**. Este trabajo agrega:

1. **Mapa real** (Leaflet + OpenStreetMap, gratis, sin API key) en la pestaña "Mapa": marcadores de las **8 sedes** + marcador de **mi ubicación**.
2. **GPS real** del navegador (`navigator.geolocation`) con **respaldo a Caracas (Chacao)** si se rechaza/falla; alimenta distancias, orden por cercanía y el cálculo de envío.
3. **Delivery en el checkout**: elegir **Retiro en tienda** o **Delivery**; para delivery, dirección + **mini-mapa** (sede ↔ punto de entrega) + **costo de envío por distancia**; pago de **seña online (20%) + resto contra entrega**.
4. **Factura por correo** y persistencia reflejan retiro vs delivery (dirección y costo de envío).

### Decisiones tomadas con el usuario
- **Proveedor de mapa:** Leaflet + OpenStreetMap (gratis, sin claves). Tiles requieren internet (inherente a cualquier mapa).
- **GPS:** real (`navigator.geolocation`, funciona en `http://localhost`) con **fallback** a `{lat:10.497, lng:-66.854}`.
- **Delivery:** **seña online + resto contra entrega** (efectivo al recibir).
- **Costo de envío** (cliente): **`$0.80 + $0.35 × km`** redondeado a 2 decimales, distancia Haversine sede→usuario, **clamp de km a [0, 50]** por sanidad. Referencias: 1 km → $1.15, 3 km → $1.85, 5 km → $2.55. Siempre positivo (mínimo $0.80).
- **Seña del delivery:** **20% del total CON envío**; el 80% restante se paga en efectivo al recibir.
- **El mapa real va** en la pestaña "Mapa" **y** como mini-mapa en el paso de delivery del checkout.
- **Punto de entrega ajustable:** en el mini-mapa, el pin de "tu ubicación" es **arrastrable**; al moverlo, el punto de entrega (lat/lng) se actualiza y el **costo de envío se recalcula** en vivo. Por defecto arranca en la ubicación GPS/fallback.

### No-objetivos (YAGNI)
- No tracking del repartidor en vivo, ni ruta/ETA, ni geocoding de direcciones (la dirección es texto libre; el punto de entrega es la ubicación GPS/marcador).
- No tocar la landing de la raíz.
- No Google Maps.
- No cobro real (sigue siendo pago simulado del Plan 2).

---

## 2. Arquitectura general

```
Navegador (web/)
  Leaflet (CDN) + OSM tiles ── mapa real
  geo.js ── navigator.geolocation (+ fallback Caracas) ──▶ USER_LOC dinámico
  app.js  ── pestaña "Mapa": markers de sedes + mi ubicación (reemplaza mapView mock)
  checkout.js ── paso "datos": toggle Retiro/Delivery; si delivery: dirección + mini-mapa + envío
        └─ POST /reservations  (incluye orderType, deliveryAddress, deliveryLat/Lng) ─▶ backend
backend (NestJS)
  ReservationsService.computeAmounts() ── suma envío (si delivery), seña 20% sobre total con envío
  Reservation (Prisma) ── orderType, deliveryFee, deliveryAddress, deliveryLat, deliveryLng
  EmailService/invoice ── muestra retiro vs delivery + dirección + envío
```

Se respeta la arquitectura por capas del backend y el patrón de ES modules del front.

---

## 3. Frontend (`web/`)

### 3.1 Leaflet (CDN)
- En `index.html`: `<link>` al CSS de Leaflet y `<script>` de Leaflet desde unpkg (versión fija, p. ej. 1.9.4), antes de `js/app.js`. Es una librería (no rompe el "sin build").
- Si Leaflet o las tiles no cargan (sin internet), el mapa muestra un aviso amable ("No se pudo cargar el mapa; revisá tu conexión") y el resto de la app sigue funcionando.

### 3.2 `js/geo.js` (nuevo) — geolocalización
- `DEFAULT_LOC = { lat: 10.497, lng: -66.854 }` (Chacao).
- `getUserLocation(): Promise<{lat,lng,source:'gps'|'default'}>` — usa `navigator.geolocation.getCurrentPosition` con timeout (~8s); si éxito → `source:'gps'`; si rechazo/timeout/no soportado → `DEFAULT_LOC` con `source:'default'`.
- `haversineKm(aLat,aLng,bLat,bLng): number` — distancia en km (función pura, movida desde `app.js` para reutilizar en checkout; `app.js` la importa).
- `state.userLoc` en `app.js` se inicializa con esto al cargar (en vez del `USER_LOC` fijo); al resolverse el GPS, se re-renderiza para refrescar distancias/orden.

### 3.3 Pestaña "Mapa" real (en `app.js`)
- Reemplaza `mapView()` (la maqueta) por un mapa Leaflet montado en un contenedor con altura fija.
- **Marcadores:** una sede por establecimiento (de `state.raw`, deduplicadas por `storeId`), con popup: nombre de la sede + vino más barato disponible ahí + distancia. Marcador distinto para **"Tu ubicación"**.
- **Lista lateral:** "Más cercanos primero" usando `haversineKm` real (igual que hoy, pero con la ubicación real).
- Centra el mapa para que entren tu ubicación y las sedes (fitBounds).
- Al cambiar de modo/categoría se actualizan los marcadores (sin recrear el mapa innecesariamente).

### 3.4 Delivery en el checkout (`checkout.js`)
- En el **paso 2 (datos)** se agrega un toggle **Retiro en tienda / Delivery a domicilio**.
- **Retiro:** flujo actual (sin envío; resumen con seña 20% / saldo 80% al retirar).
- **Delivery:**
  - Campo **dirección** (texto libre, requerido) + nota "te lo llevamos a tu ubicación".
  - **Mini-mapa** Leaflet mostrando el marcador de la **sede** y el de **tu punto de entrega** (arrancando en GPS/fallback). El **pin de entrega es arrastrable**: al soltarlo, se actualiza el punto y se recalcula el envío en vivo.
  - **Costo de envío** = `round2(0.80 + 0.35 × clampKm)` donde `clampKm = min(50, max(0, haversineKm(sede, puntoDeEntrega)))`.
  - El front muestra el costo estimado, pero el **backend recalcula y manda el valor autoritativo** en `POST /reservations` (no se confía en el cliente).
- **Resumen (delivery):** Subtotal → −5% primera reserva → Productos → **Envío** → **Total** → **Seña a pagar ahora (20%)** → **Resto a pagar al recibir (efectivo)**.
- `POST /reservations` ahora envía: `orderType` ('pickup'|'delivery'), y si delivery: `deliveryAddress`, `deliveryLat`, `deliveryLng`.

### 3.5 Manejo de errores (front)
- GPS rechazado/timeout → fallback Caracas + chip "Ubicación aproximada (Caracas)"; todo sigue.
- Leaflet/tiles sin cargar → aviso; catálogo/checkout no se afectan.
- Delivery sin dirección → error inline, no avanza.

---

## 4. Backend (`backend/`, NestJS + Prisma)

### 4.1 Prisma — `Reservation` (campos nuevos)
```prisma
  orderType       String   @default("pickup") // 'pickup' | 'delivery'
  deliveryFee     Decimal  @default(0) @db.Decimal(10, 2)
  deliveryAddress String?
  deliveryLat     Float?
  deliveryLng     Float?
```
Migración nueva (carpeta `migrations/<ts>_reservation_delivery/` + `migrate deploy` + `generate`).

### 4.2 `ReservationsService`
- `computeAmounts({ unitPrice, quantity, isFirstReservation, deliveryFee })`:
  - `subtotal = round2(unitPrice*quantity)`
  - `discountAmount = round2(subtotal * discountPct/100)` (5% si primera)
  - `productsTotal = round2(subtotal - discountAmount)`
  - `total = round2(productsTotal + deliveryFee)`
  - `deposit = round2(total * 0.20)`  ·  `balance = round2(total - deposit)`
- `deliveryFeeFor(orderType, store, deliveryLat, deliveryLng): number` — `pickup`→0; `delivery`→`round2(0.80 + 0.35 × clamp(haversineKm(store, delivery), 0, 50))`. **Función pura, testeable.**
- `createReservation`: si `orderType==='delivery'` exige `deliveryAddress` + coords (si no, `BadRequestException`); calcula `deliveryFee` server-side (autoritativo); persiste `orderType`, `deliveryFee`, dirección y coords.
- `payReservation`: sin cambios de fondo (cobra la **seña** = `deposit`).

### 4.3 DTO `CreateReservationDto` (extiende)
- `orderType: 'pickup' | 'delivery'` (`@IsIn(['pickup','delivery'])`).
- `deliveryAddress?: string`, `deliveryLat?: number`, `deliveryLng?: number` (`@ValidateIf(o => o.orderType === 'delivery')` para exigirlos en delivery; respeta `forbidNonWhitelisted`).

### 4.4 Factura (`invoice.template.ts`) + `EmailService`
- La factura muestra **"Retiro en tienda"** o **"Delivery a domicilio"**; si delivery, agrega la **dirección** y una línea **Envío** en el desglose; el "saldo" se rotula **"al recibir"** (delivery) o **"al retirar"** (pickup).

---

## 5. Flujo de datos (delivery, camino feliz)
1. Usuario abre el sitio → `geo.js` pide GPS (o fallback). El catálogo ordena por cercanía real.
2. Pestaña "Mapa": ve las 8 sedes y su ubicación en un mapa real.
3. "Reservar" un vino → checkout. Paso 2: elige **Delivery**, escribe dirección; ve el mini-mapa (sede ↔ su punto) y el envío estimado.
4. Paso 3: `POST /reservations` con `orderType:'delivery'` + dirección/coords → backend recalcula envío, totales y seña → devuelve el desglose.
5. Paga la **seña (20%)** (simulado) → `POST /:id/pay` → confirma + **factura por correo** (retiro/delivery + envío) → resto **contra entrega**.

---

## 6. Estrategia de pruebas
- **Backend (Jest):** `deliveryFeeFor` (0 en pickup; $1.15/$1.85/$2.55 a 1/3/5 km; clamp), `computeAmounts` con envío (seña 20% sobre total con envío), validación de delivery sin dirección → 400.
- **Frontend (`node --test`):** `haversineKm` (distancias conocidas) y el cálculo de envío del cliente (mismas referencias) en una función pura compartible.
- **Manual (run/verify):** GPS (aceptar/rechazar), mapa con marcadores, checkout delivery end-to-end con la factura indicando delivery + envío.

---

## 7. Componentes y límites (resumen)
- **`geo.js`**: qué hace = ubicación del usuario (GPS o fallback) + Haversine; uso = `getUserLocation()`, `haversineKm()`; depende de = navigator.geolocation.
- **Mapa (en `app.js`)**: qué hace = render Leaflet de sedes + usuario; uso = al entrar al modo "mapa"; depende de = Leaflet (CDN), geo.
- **`checkout.js` (delivery)**: qué hace = toggle + dirección + mini-mapa + envío; uso = paso 2/3; depende de = api, geo, Leaflet.
- **`ReservationsService.deliveryFeeFor/computeAmounts`**: qué hacen = reglas de envío y montos; uso = createReservation; dependen de = nada externo (puras).

---

## 8. Riesgos y mitigaciones
- **Sin internet** → no hay tiles; mostrar aviso, no romper el resto. (El cálculo de distancia/envío no depende de internet.)
- **GPS denegado** → fallback Caracas + aviso; flujo intacto.
- **Cliente manipula el envío** → el backend recalcula con sus propias coords/fórmula (autoritativo).
- **Coordenadas GPS absurdas** (otro país) → clamp de km a 50 evita envíos disparatados.
- **Decimales** → `round2` y `Decimal(10,2)` consistentes.
