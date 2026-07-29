# Plan — Mapa real (Leaflet/OSM) + GPS + delivery

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> En las tasks de mapa/checkout (3 y 7) conviene **invocar `frontend-design`** para pulir el look; el código base del plan es funcional.

**Goal:** Mapa real con las sedes y la ubicación GPS del usuario, y un flujo de delivery en el checkout (seña online + resto contra entrega) con costo de envío por distancia.

**Architecture:** Front HTML/CSS/JS (ES modules) + Leaflet por CDN. Nuevo `geo.js` (GPS real + Haversine) reemplaza la ubicación fija; la pestaña "Mapa" pasa a Leaflet; el checkout gana toggle retiro/delivery con mini-mapa. Backend NestJS extiende `Reservation` con datos de envío y recalcula el costo (autoritativo).

**Tech Stack:** Leaflet 1.9.4 (CDN) + OpenStreetMap tiles, `navigator.geolocation`, NestJS 10 + Prisma 5, Jest + ts-jest, `node --test`.

## Global Constraints

- **Idioma de toda la UI y mensajes: español neutro** (sin voseo). Marca burdeos/oro/crema; Playfair + Inter.
- **Mapa:** Leaflet 1.9.4 + OpenStreetMap; sin API key. Atribución obligatoria: `© OpenStreetMap`. Las tiles requieren internet.
- **Ubicación por defecto (fallback):** `{ lat: 10.497, lng: -66.854 }` (Chacao).
- **Costo de envío (cliente y servidor):** `round2(0.80 + 0.35 × km)`, `km = clamp(haversineKm(sede, usuario), 0, 50)`. Referencias exactas: 1 km → 1.15, 3 km → 1.85, 5 km → 2.55. Mínimo 0.80.
- **Seña delivery = 20% del total CON envío**; resto **contra entrega**. Retiro: seña 20% / saldo 80% al retirar (igual que hoy).
- **Backend autoritativo:** recalcula `deliveryFee` y montos con sus propias coords; el cliente solo muestra estimado.
- **round2(n) = Math.round(n*100)/100**; Prisma `Decimal(10,2)`.
- **Sin build step en el front; ES modules; claves de sesión `cl_token`/`cl_user`.** Backend `:3001`, front `:8080`.
- **Operación (Windows/OneDrive):** `prisma generate` falla con EPERM si el backend corre; antes de migrar/generar, detener el node de :3001, generar y reiniciar `npm run start:dev`. `prisma migrate dev` es interactivo: crear carpeta de migración a mano + `prisma migrate deploy`.

---

## File Structure

**Frontend (`web/`)**
- `js/geo.js` *(crear)* — `DEFAULT_LOC`, `haversineKm()`, `getUserLocation()`.
- `js/delivery.js` *(crear)* — `deliveryFee(km)` (pura).
- `test/geo.test.mjs`, `test/delivery.test.mjs` *(crear)*.
- `index.html` *(mod)* — Leaflet CSS/JS por CDN + contenedor del mapa.
- `js/app.js` *(mod)* — usar `geo`: ubicación dinámica, recálculo de distancias, pestaña "Mapa" con Leaflet.
- `css/styles.css` *(mod)* — estilos del mapa real (reemplazan la maqueta).
- `js/checkout.js` *(mod)* — toggle retiro/delivery, dirección, mini-mapa, envío, payload.
- `css/checkout.css` *(mod)* — estilos del toggle + mini-mapa + línea de envío.

**Backend (`backend/`)**
- `prisma/schema.prisma` *(mod)* — campos de delivery en `Reservation`.
- `prisma/migrations/<ts>_reservation_delivery/migration.sql` *(crear)*.
- `src/modules/reservations/reservations.service.ts` *(mod)* — `deliveryFeeFor`, `computeAmounts(deliveryFee)`, `createReservation`.
- `src/modules/reservations/reservations.service.spec.ts` *(mod)* — tests de envío/montos.
- `src/modules/reservations/dto/create-reservation.dto.ts` *(mod)* — `orderType` + campos de delivery.
- `src/modules/notifications/invoice.template.ts` *(mod)* — retiro vs delivery + envío.
- `src/modules/notifications/invoice.template.spec.ts` *(mod)* — test del caso delivery.

---

## Task 1: `geo.js` — ubicación (GPS + fallback) y Haversine (TDD)

**Files:**
- Create: `web/js/geo.js`, `web/test/geo.test.mjs`

**Interfaces:**
- Produces: `DEFAULT_LOC` `{lat,lng}`; `haversineKm(aLat,aLng,bLat,bLng): number`; `getUserLocation(): Promise<{lat,lng,source:'gps'|'default'}>`.

- [ ] **Step 1: Escribir el test que falla**

`web/test/geo.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { haversineKm, DEFAULT_LOC } from '../js/geo.js';

test('haversineKm de un punto a sí mismo es 0', () => {
  assert.equal(haversineKm(10.5, -66.8, 10.5, -66.8), 0);
});
test('haversineKm ~1km para ~0.009° de latitud', () => {
  const d = haversineKm(0, 0, 0.0089932, 0);
  assert.ok(Math.abs(d - 1) < 0.05, `esperaba ~1km, dio ${d}`);
});
test('DEFAULT_LOC es Chacao', () => {
  assert.deepEqual(DEFAULT_LOC, { lat: 10.497, lng: -66.854 });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run (en `web/`): `node --test test/geo.test.mjs`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `geo.js`**

`web/js/geo.js`:
```js
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
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `node --test test/geo.test.mjs`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add web/js/geo.js web/test/geo.test.mjs
git commit -m "feat(web): geo.js — GPS real con fallback + Haversine (TDD)"
```

---

## Task 2: `delivery.js` — costo de envío por distancia (TDD)

**Files:**
- Create: `web/js/delivery.js`, `web/test/delivery.test.mjs`

**Interfaces:**
- Produces: `deliveryFee(km: number): number` — `round2(0.80 + 0.35 × clamp(km,0,50))`.

- [ ] **Step 1: Escribir el test que falla**

`web/test/delivery.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryFee } from '../js/delivery.js';

test('coincide con las referencias por distancia', () => {
  assert.equal(deliveryFee(1), 1.15);
  assert.equal(deliveryFee(3), 1.85);
  assert.equal(deliveryFee(5), 2.55);
});
test('mínimo a 0 km y clamp a 50 km', () => {
  assert.equal(deliveryFee(0), 0.80);
  assert.equal(deliveryFee(-9), 0.80);
  assert.equal(deliveryFee(100), deliveryFee(50));
});
```

- [ ] **Step 2: Correr y ver que falla**

Run (en `web/`): `node --test test/delivery.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implementar `delivery.js`**

`web/js/delivery.js`:
```js
// Costo de envío del cliente: base + por km, redondeado. El backend recalcula igual.
export function deliveryFee(km) {
  const k = Math.min(50, Math.max(0, Number(km) || 0));
  return Math.round((0.80 + 0.35 * k) * 100) / 100;
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `node --test test/delivery.test.mjs`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add web/js/delivery.js web/test/delivery.test.mjs
git commit -m "feat(web): costo de envío por distancia (TDD)"
```

---

## Task 3: Leaflet + GPS en `app.js` y pestaña "Mapa" real

**Files:**
- Modify: `web/index.html`, `web/js/app.js`, `web/css/styles.css`

**Interfaces:**
- Consumes: `geo.haversineKm`, `geo.getUserLocation`, `geo.DEFAULT_LOC`; Leaflet global `L`.
- Produces: pestaña "Mapa" con mapa real; `state.userLoc` dinámico usado por `transform`/`mapView`.

> Invocar `frontend-design` para el detalle visual del mapa y el chip de ubicación.

- [ ] **Step 1: Agregar Leaflet (CDN) al `index.html`**

En `web/index.html`, en `<head>` después del `<link>` de `checkout.css`:
```html
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" defer></script>
```

- [ ] **Step 2: `app.js` — importar geo y usar ubicación dinámica**

En `web/js/app.js`:
1) Agregar import (junto a los otros):
```js
import { haversineKm, getUserLocation, DEFAULT_LOC } from './geo.js';
```
2) Reemplazar `var USER_LOC = { lat: 10.497, lng: -66.854 };` por:
```js
  var USER_LOC = { lat: DEFAULT_LOC.lat, lng: DEFAULT_LOC.lng, source: 'default' };
```
3) En `state`, agregar después de `loaded: false,`:
```js
    apiWines: [],
    userLoc: USER_LOC,
```
4) Reemplazar la función `haversine` local por un wrapper a `geo` (borrar el cuerpo viejo y dejar):
```js
  function haversine(aLat, aLng, bLat, bLng) { return haversineKm(aLat, aLng, bLat, bLng); }
```
5) En `transform`, cambiar el cálculo de `dist` para usar `state.userLoc`:
```js
        dist: round1(haversine(state.userLoc.lat, state.userLoc.lng, e.lat, e.lng)), best: false,
```
6) En `loadWines`, guardar la respuesta cruda para poder recomputar distancias:
```js
  async function loadWines() {
    try {
      state.apiWines = await getWines();
      state.raw = state.apiWines.map(transform);
    } catch (e) {
      state.apiWines = []; state.raw = [];
      console.warn('No se pudo cargar el backend:', e);
    }
    state.loaded = true;
  }
```

- [ ] **Step 3: `app.js` — resolver el GPS y recomputar al cargar**

En `init()`, después de `render();` (antes del bloque de retorno pendiente), agregar:
```js
    getUserLocation().then(function (loc) {
      state.userLoc = loc;
      if (state.apiWines.length) state.raw = state.apiWines.map(transform);
      renderToolbar(); renderView();
      var chip = $('#locchip');
      if (chip) chip.textContent = loc.source === 'gps' ? '📍 Tu ubicación' : '📍 Caracas (aprox.)';
    });
```

- [ ] **Step 4: `app.js` — reemplazar `mapView` por Leaflet**

Reemplazar TODA la función `mapView(list)` por:
```js
  var _leaf = null; // instancia Leaflet activa
  function mapView(list) {
    // host: el contenedor del mapa + la lista lateral; el mapa se monta tras inyectar el HTML
    var stores = {};
    list.forEach(function (w) {
      w.offers.forEach(function (o) {
        if (!stores[o.storeId] || o.price < stores[o.storeId].price) {
          stores[o.storeId] = { name: o.storeName, price: o.price, lat: o.lat, lng: o.lng };
        }
      });
    });
    var arr = Object.keys(stores).map(function (k) { return stores[k]; });
    if (!arr.length) return emptyState();
    var nearby = list.slice(0, 6).map(function (w) {
      return '<div class="card" style="flex-direction:row;align-items:center;gap:12px;padding:10px;border:none;box-shadow:var(--shadow-sm)" data-detail="' + w.id + '"><div style="width:44px;height:44px;background:var(--thumb);border-radius:8px;display:flex;align-items:center;justify-content:center">' + bottleSVG(w.type) + '</div><div style="flex:1"><div class="pname" style="min-height:0">' + esc(w.name) + '</div><div style="font-size:12px;color:var(--muted)">' + (w.nearest ? w.nearest.dist + ' km · ' + esc(w.nearest.storeName || '') : '') + '</div></div><span class="price" style="color:var(--wine);font-weight:800">' + money(w.bestPrice) + '</span></div>';
    }).join('');
    // se monta el mapa en el próximo tick (cuando #leafmap ya está en el DOM)
    setTimeout(function () { mountLeaflet(arr); }, 0);
    return '<div class="map-real"><div id="leafmap"></div>' +
      '<div class="map-list"><div class="map-list-head"><b>Más cercanos primero</b> <span class="locchip" id="locchip">' +
      (state.userLoc.source === 'gps' ? '📍 Tu ubicación' : '📍 Caracas (aprox.)') + '</span></div>' + nearby + '</div></div>';
  }

  function mountLeaflet(stores) {
    var el = document.getElementById('leafmap');
    if (!el || typeof L === 'undefined') { if (el) el.innerHTML = '<div style="padding:24px;color:var(--muted)">No se pudo cargar el mapa. Revisa tu conexión.</div>'; return; }
    if (_leaf) { _leaf.remove(); _leaf = null; }
    var map = L.map(el);
    _leaf = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap',
    }).addTo(map);
    var pts = [];
    stores.forEach(function (s) {
      var km = round1(haversine(state.userLoc.lat, state.userLoc.lng, s.lat, s.lng));
      L.marker([s.lat, s.lng]).addTo(map)
        .bindPopup('<b>' + esc(s.name) + '</b><br>desde ' + money(s.price) + ' · ' + km + ' km');
      pts.push([s.lat, s.lng]);
    });
    var me = L.circleMarker([state.userLoc.lat, state.userLoc.lng], { radius: 8, color: '#641E2E', fillColor: '#641E2E', fillOpacity: 1 })
      .addTo(map).bindPopup('Tu ubicación');
    pts.push([state.userLoc.lat, state.userLoc.lng]);
    map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 });
  }
```

- [ ] **Step 5: `styles.css` — estilos del mapa real (reemplazan la maqueta)**

En `web/css/styles.css`, reemplazar el bloque `/* ---------- Map (mock) ---------- */` (las reglas `.map-box`, `.map-canvas`, `.map-pin`, `.map-pin.hot`, `.map-list`) por:
```css
/* ---------- Mapa real (Leaflet) ---------- */
.map-real { display: grid; grid-template-columns: 1fr 320px; gap: 16px; }
#leafmap { height: 440px; border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border); z-index: 0; }
.map-list { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 10px; max-height: 440px; overflow-y: auto; }
.map-list-head { display: flex; align-items: center; justify-content: space-between; }
.locchip { font-size: 11px; font-weight: 700; color: var(--wine); background: var(--gold-soft); border-radius: 50px; padding: 3px 9px; }
.leaflet-popup-content { font-family: var(--font-body); }
@media (max-width: 860px) { .map-real { grid-template-columns: 1fr; } #leafmap { height: 320px; } }
```

- [ ] **Step 6: Verificación manual (skill `run`/`verify`)**

Backend + `http-server` arriba; abrir `http://localhost:8080`:
- El navegador pide permiso de ubicación. **Aceptar** → el chip dice "Tu ubicación" y las distancias cambian; **rechazar** → "Caracas (aprox.)" y sigue.
- Pestaña **"Mapa"**: se ve un mapa real con tiles, un marcador por sede (popup con precio + km) y tu punto en burdeos; encuadra todo.
- Cambiar de categoría y volver a "Mapa" no rompe el mapa (se re-monta).

- [ ] **Step 7: Commit**

```bash
git add web/index.html web/js/app.js web/css/styles.css
git commit -m "feat(web): GPS real + pestaña Mapa con Leaflet/OSM (sedes + mi ubicación)"
```

---

## Task 4: Backend — campos de delivery en `Reservation` + migración

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<ts>_reservation_delivery/migration.sql`

**Interfaces:**
- Produces: columnas `orderType`, `deliveryFee`, `deliveryAddress`, `deliveryLat`, `deliveryLng` en `Reservation`.

- [ ] **Step 1: Editar `schema.prisma`**

En `model Reservation`, después de `balance Decimal @db.Decimal(10, 2)`, agregar:
```prisma
  orderType       String   @default("pickup")
  deliveryFee     Decimal  @default(0) @db.Decimal(10, 2)
  deliveryAddress String?
  deliveryLat     Float?
  deliveryLng     Float?
```

- [ ] **Step 2: Crear la carpeta de migración**

Run (PowerShell, en `backend/`):
```powershell
$ts = Get-Date -Format "yyyyMMddHHmmss"; New-Item -ItemType Directory -Force -Path "prisma/migrations/${ts}_reservation_delivery" | Out-Null; Write-Output "prisma/migrations/${ts}_reservation_delivery"
```

- [ ] **Step 3: Escribir el SQL**

En `prisma/migrations/<ts>_reservation_delivery/migration.sql`:
```sql
-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "orderType" TEXT NOT NULL DEFAULT 'pickup';
ALTER TABLE "Reservation" ADD COLUMN     "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Reservation" ADD COLUMN     "deliveryAddress" TEXT;
ALTER TABLE "Reservation" ADD COLUMN     "deliveryLat" DOUBLE PRECISION;
ALTER TABLE "Reservation" ADD COLUMN     "deliveryLng" DOUBLE PRECISION;
```

- [ ] **Step 4: Detener backend, aplicar migración, regenerar, build**

Run (PowerShell):
```powershell
$c = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue; if ($c) { Stop-Process -Id $c.OwningProcess -Force; Start-Sleep 2 }
cd "c:\Users\euger\OneDrive\Escritorio\CavaLocal\backend"
npx prisma migrate deploy
npx prisma generate
npm run build
```
Expected: "All migrations have been successfully applied.", cliente generado, build exit 0.

- [ ] **Step 5: Commit**

```powershell
git add prisma/schema.prisma "prisma/migrations"
git commit -m "feat(db): Reservation con datos de delivery (orderType/fee/dirección/coords)"
```

---

## Task 5: Backend — costo de envío, montos con envío, createReservation y factura (TDD)

**Files:**
- Modify: `backend/src/modules/reservations/reservations.service.ts`
- Modify: `backend/src/modules/reservations/reservations.service.spec.ts`
- Modify: `backend/src/modules/reservations/dto/create-reservation.dto.ts`
- Modify: `backend/src/modules/notifications/invoice.template.ts`
- Modify: `backend/src/modules/notifications/invoice.template.spec.ts`

**Interfaces:**
- Produces:
  - `ReservationsService.deliveryFeeFor(orderType, store: {lat:number,lng:number}, deliveryLat?: number, deliveryLng?: number): number`
  - `computeAmounts({ unitPrice, quantity, isFirstReservation, deliveryFee }): { subtotal, discountPct, discountAmount, total, deposit, balance }`
  - `InvoiceData` gana `orderType: 'pickup'|'delivery'`, `deliveryFee: number`, `deliveryAddress?: string|null`.

- [ ] **Step 1: Tests nuevos en `reservations.service.spec.ts`**

Agregar al archivo:
```ts
describe('ReservationsService.deliveryFeeFor', () => {
  const svc = new ReservationsService({} as any, {} as any, {} as any);
  const store = { lat: 10.5, lng: -66.85 };

  it('pickup no cobra envío', () => {
    expect(svc.deliveryFeeFor('pickup', store, 10.6, -66.9)).toBe(0);
  });
  it('delivery a ~5km da ~2.55', () => {
    // ~0.045° de latitud ≈ 5 km
    const fee = svc.deliveryFeeFor('delivery', { lat: 0, lng: 0 }, 0.04497, 0);
    expect(fee).toBeGreaterThan(2.4);
    expect(fee).toBeLessThan(2.7);
  });
});

describe('ReservationsService.computeAmounts con envío', () => {
  const svc = new ReservationsService({} as any, {} as any, {} as any);
  it('suma el envío y calcula seña 20% sobre el total con envío', () => {
    const a = svc.computeAmounts({ unitPrice: 10, quantity: 2, isFirstReservation: false, deliveryFee: 2.55 });
    expect(a.total).toBe(22.55);
    expect(a.deposit).toBe(4.51);
    expect(a.balance).toBe(18.04);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run (en `backend/`): `npx jest reservations.service.spec.ts`
Expected: FAIL (`deliveryFeeFor` no existe / firma de `computeAmounts`).

- [ ] **Step 3: Implementar en `reservations.service.ts`**

1) Agregar helper de distancia y `deliveryFeeFor` (antes de `computeAmounts`):
```ts
  private haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
    const rad = (d: number) => (d * Math.PI) / 180;
    const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng);
    const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(rad(aLat)) * Math.cos(rad(bLat));
    return 6371 * 2 * Math.asin(Math.sqrt(h));
  }

  deliveryFeeFor(orderType: string, store: { lat: number; lng: number }, deliveryLat?: number, deliveryLng?: number): number {
    if (orderType !== 'delivery') return 0;
    const km = Math.min(50, Math.max(0, this.haversineKm(store.lat, store.lng, deliveryLat ?? store.lat, deliveryLng ?? store.lng)));
    return round2(0.8 + 0.35 * km);
  }
```
2) Cambiar `computeAmounts` para sumar el envío:
```ts
  computeAmounts(input: { unitPrice: number; quantity: number; isFirstReservation: boolean; deliveryFee?: number }) {
    const deliveryFee = round2(input.deliveryFee ?? 0);
    const subtotal = round2(input.unitPrice * input.quantity);
    const discountPct = input.isFirstReservation ? 5 : 0;
    const discountAmount = round2((subtotal * discountPct) / 100);
    const productsTotal = round2(subtotal - discountAmount);
    const total = round2(productsTotal + deliveryFee);
    const deposit = round2(total * 0.2);
    const balance = round2(total - deposit);
    return { subtotal, discountPct, discountAmount, total, deposit, balance };
  }
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npx jest reservations.service.spec.ts`
Expected: PASS (los nuevos + los previos de computeAmounts/payReservation siguen verdes).

- [ ] **Step 5: `createReservation` usa orderType + envío**

En `reservations.service.ts`, dentro de `createReservation`, reemplazar el bloque de cálculo y `create` por:
```ts
    if (dto.orderType === 'delivery' && !(dto.deliveryAddress && dto.deliveryAddress.trim())) {
      throw new BadRequestException('Falta la dirección de entrega.');
    }
    const priorCount = await this.prisma.reservation.count({ where: { userId } });
    const unitPrice = Number(availability.price);
    const deliveryFee = this.deliveryFeeFor(
      dto.orderType,
      { lat: availability.establishment.lat, lng: availability.establishment.lng },
      dto.deliveryLat, dto.deliveryLng,
    );
    const amounts = this.computeAmounts({ unitPrice, quantity: dto.quantity, isFirstReservation: priorCount === 0, deliveryFee });

    const total = await this.prisma.reservation.count();
    const invoiceNumber = 'CL-' + String(total + 1).padStart(6, '0');

    return this.prisma.reservation.create({
      data: {
        invoiceNumber,
        userId,
        wineId: dto.wineId,
        establishmentId: dto.establishmentId,
        quantity: dto.quantity,
        unitPrice,
        ...amounts,
        wineName: availability.wine.name,
        wineryName: availability.wine.wineryName,
        storeName: availability.establishment.name,
        storeAddress: availability.establishment.address,
        customerName: dto.customer.name,
        customerEmail: dto.customer.email,
        customerPhone: dto.customer.phone,
        pickupDate: dto.pickupDate ? new Date(dto.pickupDate) : null,
        status: 'pending_payment',
        orderType: dto.orderType,
        deliveryFee,
        deliveryAddress: dto.orderType === 'delivery' ? dto.deliveryAddress : null,
        deliveryLat: dto.orderType === 'delivery' ? dto.deliveryLat : null,
        deliveryLng: dto.orderType === 'delivery' ? dto.deliveryLng : null,
      },
    });
```
En `payReservation`, al armar el objeto de `email.sendInvoice`, agregar los campos:
```ts
      orderType: reservation.orderType as 'pickup' | 'delivery',
      deliveryFee: Number(reservation.deliveryFee),
      deliveryAddress: reservation.deliveryAddress,
```

- [ ] **Step 6: DTO — `orderType` + campos de delivery**

Reemplazar `create-reservation.dto.ts` por:
```ts
import { Type } from 'class-transformer';
import {
  IsDateString, IsEmail, IsIn, IsInt, IsLatitude, IsLongitude, IsNotEmpty,
  IsNumber, IsOptional, IsString, Max, Min, ValidateIf, ValidateNested,
} from 'class-validator';

export class CustomerDto {
  @IsNotEmpty() @IsString() name!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
}

export class CreateReservationDto {
  @IsNotEmpty() @IsString() wineId!: string;
  @IsNotEmpty() @IsString() establishmentId!: string;
  @IsInt() @Min(1) @Max(6) quantity!: number;
  @ValidateNested() @Type(() => CustomerDto) customer!: CustomerDto;
  @IsOptional() @IsDateString() pickupDate?: string;

  @IsIn(['pickup', 'delivery']) orderType!: 'pickup' | 'delivery';

  @ValidateIf((o) => o.orderType === 'delivery')
  @IsNotEmpty() @IsString() deliveryAddress?: string;

  @ValidateIf((o) => o.orderType === 'delivery')
  @IsNumber() @IsLatitude() deliveryLat?: number;

  @ValidateIf((o) => o.orderType === 'delivery')
  @IsNumber() @IsLongitude() deliveryLng?: number;
}
```

- [ ] **Step 7: Factura — retiro vs delivery (test primero)**

En `invoice.template.spec.ts` agregar:
```ts
it('muestra delivery con dirección y envío', () => {
  const html = renderInvoiceHtml({ ...data, orderType: 'delivery', deliveryFee: 2.55, deliveryAddress: 'Av. Principal 123', balance: 18.04, total: 22.55 } as any);
  expect(html).toContain('Delivery');
  expect(html).toContain('Av. Principal 123');
  expect(html).toContain('Envío');
  expect(html.toLowerCase()).toContain('al recibir');
});
```
(El `data` existente representa un retiro; agregarle `orderType:'pickup', deliveryFee:0` para que compile el tipo.)

- [ ] **Step 8: Implementar el cambio en `invoice.template.ts`**

1) Extender `InvoiceData`:
```ts
  orderType: 'pickup' | 'delivery';
  deliveryFee: number;
  deliveryAddress?: string | null;
```
2) Dentro de `renderInvoiceHtml`, antes del `return`, calcular las piezas variables:
```ts
  const isDelivery = d.orderType === 'delivery';
  const entrega = isDelivery
    ? `<div style="color:#8B7F79;font-size:13px;margin-top:6px"><b>Delivery</b> a ${d.deliveryAddress ?? ''}</div>`
    : `<div style="color:#8B7F79;font-size:13px;margin-top:6px">Retirar en <b>${d.storeName}</b> — ${d.storeAddress}</div>`;
  const envioRow = isDelivery
    ? `<tr><td>Envío</td><td style="text-align:right">${m(d.deliveryFee)}</td></tr>`
    : '';
  const saldoLabel = isDelivery ? 'Saldo a pagar al recibir (80%)' : 'Saldo a pagar al retirar (80%)';
```
3) En el HTML de la tarjeta del producto, reemplazar la línea `Retirar en ...` por `${entrega}`; agregar `${envioRow}` **después** de `discountRow` (antes de la fila Total); y reemplazar el texto fijo `Saldo a pagar al retirar (80%)` por `${saldoLabel}`.

- [ ] **Step 9: Suite + build + commit**

Run (en `backend/`):
```powershell
npm test
npm run build
```
Expected: todos los specs verdes (incluye los nuevos de delivery) y build exit 0.
```powershell
git add src/modules/reservations src/modules/notifications
git commit -m "feat(reservations): envío por distancia, montos con envío, delivery en createReservation y factura"
```

---

## Task 6: Reiniciar backend + smoke test del delivery

**Files:** ninguno (verificación).

- [ ] **Step 1: Reiniciar el backend**

Run (PowerShell):
```powershell
$c = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue; if ($c) { Stop-Process -Id $c.OwningProcess -Force; Start-Sleep 2 }
cd "c:\Users\euger\OneDrive\Escritorio\CavaLocal\backend"; Start-Process -WindowStyle Hidden powershell -ArgumentList '-NoProfile','-Command','npm run start:dev'; Start-Sleep 14
```

- [ ] **Step 2: Crear una reserva de delivery y verificar el envío**

Run (PowerShell):
```powershell
$login = Invoke-RestMethod -Uri http://localhost:3001/auth/login -Method Post -ContentType 'application/json' -Body '{"email":"ana@example.com","password":"1234"}'
$wine = (Invoke-RestMethod -Uri http://localhost:3001/wines)[0]
$est  = $wine.availabilities[0].establishment
$body = @{ wineId=$wine.id; establishmentId=$est.id; quantity=1; orderType='delivery'; deliveryAddress='Av. Principal 123'; deliveryLat=($est.lat + 0.045); deliveryLng=$est.lng; customer=@{ name='Ana'; email='ana@example.com' } } | ConvertTo-Json
$res = Invoke-RestMethod -Uri http://localhost:3001/reservations -Method Post -ContentType 'application/json' -Headers @{ Authorization = "Bearer $($login.accessToken)" } -Body $body
Write-Output "DELIVERY $($res.invoiceNumber): tipo=$($res.orderType) envío=$($res.deliveryFee) total=$($res.total) seña=$($res.deposit) saldo=$($res.balance)"
```
Expected: `tipo=delivery`, `envío≈2.55` (a ~5 km), `total = productos + envío`, `seña = 20% del total`.

> Si la reserva sin `orderType` (clientes viejos) debe seguir andando: el front mandará siempre `orderType`. Para compatibilidad, el DTO exige `orderType`; el checkout (Task 7) siempre lo envía.

---

## Task 7: Checkout — toggle retiro/delivery, dirección, mini-mapa y envío

**Files:**
- Modify: `web/js/checkout.js`, `web/css/checkout.css`

**Interfaces:**
- Consumes: `geo.haversineKm/getUserLocation/DEFAULT_LOC`, `delivery.deliveryFee`, Leaflet `L`, `money`.
- Produces: `openCheckout(wine, userLoc?)` con flujo de delivery; `POST /reservations` con `orderType`/dirección/coords.

> Invocar `frontend-design` para pulir el toggle y el mini-mapa.

- [ ] **Step 1: Imports y estado en `checkout.js`**

Al inicio de `web/js/checkout.js`, agregar a los imports:
```js
import { deliveryFee } from './delivery.js';
import { haversineKm, getUserLocation, DEFAULT_LOC } from './geo.js';
```
Cambiar la firma y el estado inicial de `openCheckout`:
```js
export function openCheckout(wine, userLoc) {
  const user = getUser();
  const offers = (wine.offers || []).slice().sort((a, b) => a.price - b.price);
  st = {
    wine, offers, offerIdx: 0, quantity: 1,
    customer: { name: user ? user.name : '', email: user ? user.email : '', phone: '' },
    pickupDate: '', orderType: 'pickup', deliveryAddress: '',
    userLoc: userLoc || DEFAULT_LOC,
    deliveryPoint: { ...(userLoc || DEFAULT_LOC) },
    step: 1, reservation: null, _miniMap: null,
  };
  render();
}
```

- [ ] **Step 2: Paso 2 con toggle + dirección + mini-mapa**

Reemplazar la función `stepDatos()` por:
```js
function stepDatos() {
  const c = st.customer;
  const isDel = st.orderType === 'delivery';
  const store = st.offers[st.offerIdx];
  const km = round1Km(haversineKm(store.lat, store.lng, st.deliveryPoint.lat, st.deliveryPoint.lng));
  const fee = deliveryFee(km);
  const deliveryBlock = isDel
    ? '<div class="co-field"><label>Dirección de entrega</label><input id="co-addr" value="' + esc(st.deliveryAddress) + '" placeholder="Calle, edificio, referencia" /></div>' +
      '<div class="co-minihint">Arrastra el pin para marcar el punto exacto de entrega.</div>' +
      '<div id="co-mini" class="co-mini"></div>' +
      '<div class="co-deliv-note" id="co-feenote">Envío estimado a ' + km + ' km: <b>' + money(fee) + '</b> · el total final lo confirma el sistema.</div>'
    : '';
  return prodCard() +
    '<div class="co-seg"><button class="co-segbtn ' + (!isDel ? 'on' : '') + '" data-ot="pickup">Retiro en tienda</button>' +
    '<button class="co-segbtn ' + (isDel ? 'on' : '') + '" data-ot="delivery">Delivery</button></div>' +
    '<div class="co-field"><label>Nombre</label><input id="co-name" value="' + esc(c.name) + '" placeholder="Tu nombre" /></div>' +
    '<div class="co-field"><label>Correo (te llega la factura)</label><input id="co-email" type="email" value="' + esc(c.email) + '" placeholder="tucorreo@ejemplo.com" /></div>' +
    '<div class="co-row"><div class="co-field"><label>Teléfono</label><input id="co-phone" value="' + esc(c.phone) + '" placeholder="Opcional" /></div>' +
    '<div class="co-field"><label>' + (isDel ? 'Fecha de entrega' : 'Fecha de retiro') + '</label><input id="co-date" type="date" value="' + esc(st.pickupDate) + '" /></div></div>' +
    deliveryBlock +
    '<div class="co-error co-hide" id="co-err"></div>' +
    '<div class="co-actions"><button class="co-btn ghost" id="co-back">Atrás</button><button class="co-btn prim" id="co-next">' + (isDel ? 'Ir a pagar la seña' : 'Ir a pagar') + '</button></div>';
}

function round1Km(n) { return Math.round(n * 10) / 10; }

function mountMiniMap() {
  const el = document.getElementById('co-mini');
  if (!el || typeof L === 'undefined') { if (el) el.innerHTML = '<div style="padding:14px;color:var(--muted);font-size:13px">Mapa no disponible (sin conexión).</div>'; return; }
  if (st._miniMap) { st._miniMap.remove(); st._miniMap = null; }
  const store = st.offers[st.offerIdx];
  const map = L.map(el); st._miniMap = map;
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  L.marker([store.lat, store.lng]).addTo(map).bindPopup('Sede: ' + esc(store.storeName));
  const me = L.marker([st.deliveryPoint.lat, st.deliveryPoint.lng], { draggable: true }).addTo(map).bindPopup('Punto de entrega (arrástrame)');
  me.on('dragend', function () {
    const p = me.getLatLng();
    st.deliveryPoint = { lat: p.lat, lng: p.lng };
    const km = round1Km(haversineKm(store.lat, store.lng, p.lat, p.lng));
    const note = document.getElementById('co-feenote');
    if (note) note.innerHTML = 'Envío estimado a ' + km + ' km: <b>' + money(deliveryFee(km)) + '</b> · el total final lo confirma el sistema.';
  });
  map.fitBounds([[store.lat, store.lng], [st.deliveryPoint.lat, st.deliveryPoint.lng]], { padding: [25, 25], maxZoom: 15 });
}
```

- [ ] **Step 3: `summary()` con línea de envío + label de saldo**

Reemplazar `summary(r)` por:
```js
function summary(r) {
  const disc = r.discountPct > 0
    ? '<div class="ln disc"><span>Descuento primera reserva (' + r.discountPct + '%)</span><span>-' + money(r.discountAmount) + '</span></div>' : '';
  const envio = Number(r.deliveryFee) > 0
    ? '<div class="ln"><span>Envío</span><span>' + money(r.deliveryFee) + '</span></div>' : '';
  const saldoLabel = r.orderType === 'delivery' ? 'Resto a pagar al recibir (efectivo)' : 'Saldo al retirar (80%)';
  return '<div class="co-summary">' +
    '<div class="ln"><span>Subtotal (' + r.quantity + ' × ' + money(r.unitPrice) + ')</span><span>' + money(r.subtotal) + '</span></div>' +
    disc + envio +
    '<div class="ln tot"><span>Total</span><span>' + money(r.total) + '</span></div>' +
    '<div class="ln dep"><span>Seña a pagar ahora (20%)</span><span>' + money(r.deposit) + '</span></div>' +
    '<div class="ln bal"><span>' + saldoLabel + '</span><span>' + money(r.balance) + '</span></div></div>';
}
```

- [ ] **Step 4: `bind()` — toggle, mini-mapa y payload con delivery**

En `bind()`, dentro del bloque `if (st.step === 2)`, **antes** del `$('#co-next').onclick`, agregar el manejo del toggle y el montaje del mini-mapa:
```js
    document.querySelectorAll('.co-segbtn').forEach(function (b) {
      b.onclick = function () {
        // guardar lo escrito antes de re-render
        st.customer.name = ($('#co-name') || {}).value || st.customer.name;
        st.customer.email = ($('#co-email') || {}).value || st.customer.email;
        st.customer.phone = ($('#co-phone') || {}).value || st.customer.phone;
        st.deliveryAddress = ($('#co-addr') || {}).value || st.deliveryAddress;
        st.orderType = b.getAttribute('data-ot');
        render();
      };
    });
    if (st.orderType === 'delivery') setTimeout(mountMiniMap, 0);
```
Reemplazar el handler `$('#co-next').onclick` del paso 2 por:
```js
    $('#co-next').onclick = async () => {
      st.customer.name = $('#co-name').value.trim();
      st.customer.email = $('#co-email').value.trim();
      st.customer.phone = $('#co-phone').value.trim();
      st.pickupDate = $('#co-date').value;
      if (st.orderType === 'delivery') st.deliveryAddress = ($('#co-addr').value || '').trim();
      if (!st.customer.name) return showErr('Ingresa tu nombre.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(st.customer.email)) return showErr('Ingresa un correo válido.');
      if (st.orderType === 'delivery' && !st.deliveryAddress) return showErr('Ingresa la dirección de entrega.');
      const offer = st.offers[st.offerIdx];
      const btn = $('#co-next'); btn.disabled = true; btn.textContent = 'Creando reserva…';
      try {
        const payload = {
          wineId: st.wine.id, establishmentId: offer.storeId, quantity: st.quantity,
          customer: { name: st.customer.name, email: st.customer.email, phone: st.customer.phone || undefined },
          pickupDate: st.pickupDate || undefined,
          orderType: st.orderType,
        };
        if (st.orderType === 'delivery') {
          payload.deliveryAddress = st.deliveryAddress;
          payload.deliveryLat = st.deliveryPoint.lat;
          payload.deliveryLng = st.deliveryPoint.lng;
        }
        st.reservation = await api.createReservation(payload);
        if (st._miniMap) { st._miniMap.remove(); st._miniMap = null; }
        st.step = 3; render();
      } catch (err) { btn.disabled = false; btn.textContent = st.orderType === 'delivery' ? 'Ir a pagar la seña' : 'Ir a pagar'; showErr(err.message); }
    };
```

- [ ] **Step 5: `app.js` pasa la ubicación al checkout**

En `web/js/app.js`, en la función `reserve(id)`, cambiar `openCheckout(w);` por:
```js
    if (w) openCheckout(w, state.userLoc);
```
Y en el bloque de retorno pendiente de `init()`, cambiar `openCheckout(w);` por `openCheckout(w, state.userLoc);`.

- [ ] **Step 6: `checkout.css` — toggle, mini-mapa y nota**

Agregar al final de `web/css/checkout.css`:
```css
.co-seg { display: flex; gap: 6px; background: var(--surface); border: 1px solid var(--border); border-radius: 50px; padding: 4px; margin-bottom: 16px; }
.co-segbtn { flex: 1; padding: 9px; border-radius: 50px; font-weight: 700; font-size: 13px; color: var(--muted); }
.co-segbtn.on { background: var(--wine); color: #fff; }
.co-minihint { font-size: 12px; color: var(--muted); margin-bottom: 6px; }
.co-mini { height: 180px; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border); margin-bottom: 10px; z-index: 0; }
.co-deliv-note { font-size: 13px; color: var(--muted); background: var(--surface); border-radius: var(--radius-md); padding: 10px 12px; margin-bottom: 12px; }
.co-deliv-note b { color: var(--wine); }
```

- [ ] **Step 7: `printInvoice` y confirmación con delivery (opcional pero recomendado)**

En `printInvoice(r)` de `checkout.js`, reemplazar la línea del producto/tienda por una condicional:
```js
    (r.orderType === 'delivery'
      ? '<p><b>' + esc(r.wineName) + '</b> × ' + r.quantity + ' — Delivery a ' + esc(r.deliveryAddress || '') + '</p>'
      : '<p><b>' + esc(r.wineName) + '</b> × ' + r.quantity + ' — retirar en ' + esc(r.storeName) + ' (' + esc(r.storeAddress) + ')</p>') +
```
(reemplaza la línea fija `'<p><b>'+...+'retirar en'+...+'</p>'`; el resto del `summary` impreso ya refleja envío/saldo vía `summary()`.)

- [ ] **Step 8: Verificación manual end-to-end (run/verify)**

Con todo arriba y sesión iniciada:
1. Reservar un vino → paso 2 → tocar **Delivery**: aparece dirección + **mini-mapa** (sede + tu punto) + envío estimado.
2. Escribir dirección → "Ir a pagar la seña" → paso 3 muestra el **resumen con Envío**, Total con envío, **Seña 20%** y **"Resto al recibir (efectivo)"**.
3. Pagar (tarjeta de prueba) → confirmación; si `MAIL_*` están configurados, la **factura indica Delivery + dirección + envío**.
4. Repetir con **Retiro**: sin envío, saldo "al retirar" (igual que antes).
5. Validación: delivery sin dirección → error.

- [ ] **Step 9: Commit**

```bash
git add web/js/checkout.js web/css/checkout.css web/js/app.js
git commit -m "feat(web): delivery en el checkout (toggle, dirección, mini-mapa, envío) + retiro intacto"
```

---

## Self-Review (cobertura del spec)

- **Mapa real (Leaflet/OSM) en pestaña Mapa** → Task 3. ✓
- **GPS real + fallback Caracas** → Tasks 1, 3. ✓
- **Distancias/cercanía con ubicación real** → Task 3 (transform usa `state.userLoc`). ✓
- **Delivery en checkout (toggle, dirección, mini-mapa)** → Task 7. ✓
- **Envío por distancia `0.80+0.35×km` (front y back)** → Tasks 2 (front), 5 (back, autoritativo). ✓
- **Seña 20% sobre total con envío; resto contra entrega** → Tasks 5 (computeAmounts), 7 (labels). ✓
- **Persistencia (orderType/fee/dirección/coords)** → Tasks 4, 5. ✓
- **Factura retiro vs delivery + envío** → Task 5 (template) + Task 7 (impresión). ✓
- **Backend recalcula (no confía en cliente)** → Task 5 (`deliveryFeeFor` con coords del backend). ✓
- **Manejo de error (GPS denegado, sin tiles, sin dirección)** → Tasks 3, 7. ✓
- **Sin placeholders de código:** todos los steps con código real. ✓
- **Consistencia de nombres:** `haversineKm`, `getUserLocation`, `DEFAULT_LOC`, `deliveryFee`, `deliveryFeeFor`, `computeAmounts({...,deliveryFee})`, `orderType`, `deliveryAddress/Lat/Lng`, `openCheckout(wine, userLoc)` — coherentes entre tasks. ✓

## Execution Handoff

Al ejecutar: **Subagent-Driven** (`superpowers:subagent-driven-development`) o **Inline** (`superpowers:executing-plans`). En Tasks 3 y 7 invocar **`frontend-design`**. El mapa necesita internet para las tiles.
