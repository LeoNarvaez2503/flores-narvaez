# CavaLocal — Arreglos Core (Plan recortado) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arreglar los bugs críticos verificados (reserva desde detalle rota, stock agotado, sesión expirada, retorno post-login) y completar las funciones que un evaluador espera: preview del desglose, Mis Reservas con cancelación, expiración de pendientes, "Cómo llegar" en el mapa y recuperación de contraseña.

**Architecture:** Monorepo con `backend/` (NestJS 10 + Prisma 5 + PostgreSQL) y `web/` (HTML/CSS/JS puro con ES modules, sin build). Los cambios de backend van con tests Jest (`.spec.ts` junto al código); los módulos puros del frontend se testean con `node --test` en `web/test/`. La UI del frontend se verifica manualmente en el navegador.

**Tech Stack:** NestJS 10, Prisma 5, PostgreSQL (portátil, local), class-validator, nodemailer (Gmail SMTP ya configurado), Leaflet + OpenStreetMap, JS vanilla ES modules.

## Global Constraints

- Todo el texto visible al usuario va **en español**, con el tono existente ("Reservar", "seña", "tienda").
- Frontend **sin frameworks ni build step**: ES modules puros, patrón existente de `innerHTML` + `esc()` para escapar HTML.
- **NO tocar la landing page** (`index.html`, `main.js`, `index.css` de la raíz) — decisión previa del proyecto.
- **Sin trabajo de seguridad** fuera de alcance: nada de rate limiting, helmet, CSRF, refresh tokens (solo se sube la expiración del JWT a `7d`).
- Tests backend: `cd backend && npm test` (Jest, specs en `src/`). Tests web: `cd web && npm test` (node --test, archivos en `web/test/*.test.mjs`).
- Mensajes de commit con el estilo del repo: `fix(web): …`, `feat(api): …`, `feat(web/api): …`, en español.
- Para `prisma migrate dev` el PostgreSQL portátil debe estar corriendo (ver memoria del proyecto / README del backend para arrancarlo).
- Los montos siempre se calculan en el backend; el frontend solo muestra.

---

### Task 1: detail.js pasa `id`, distancia y ubicación real al checkout (bugs R8 + R7)

El modal de detalle llama `openCheckout(toCheckoutWine(w), null)` pero `toCheckoutWine()` no incluye el `id` del vino, así que `checkout.js:184` envía `wineId: undefined` y la reserva falla. Además pasa `null` como ubicación, perdiendo la distancia. Extraemos el mapeo a un módulo puro testeable.

**Files:**
- Create: `web/js/detail-mapping.js`
- Create: `web/test/detail-mapping.test.mjs`
- Modify: `web/js/detail.js` (líneas 95 y 110-118)
- Modify: `web/js/app.js` (función `init`, ~línea 420)

**Interfaces:**
- Consumes: `haversineKm(aLat, aLng, bLat, bLng)` de `web/js/geo.js` (ya existe).
- Produces: `toCheckoutWine(w, userLoc)` → `{ id, winery, name, vintage, offers: [{ storeId, storeName, price, status, lat, lng, dist }] }`. `dist` es `null` si `userLoc` es `null`. También publica `window.CavaLoc = { lat, lng, source }` desde app.js, que la Tarea 5 y el detalle reutilizan.

- [ ] **Step 1: Write the failing test**

Crear `web/test/detail-mapping.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { toCheckoutWine } from '../js/detail-mapping.js';

const wine = {
  id: 'w1', wineryName: 'Pomar', name: 'Reserva', vintage: 2021,
  offers: [{ establishmentId: 'e1', storeName: 'Licorería Centro', price: '12.50', status: 'DISPONIBLE', lat: 10.5, lng: -66.85 }],
};

test('incluye el id del vino (bug R8)', () => {
  const out = toCheckoutWine(wine, null);
  assert.equal(out.id, 'w1');
  assert.equal(out.winery, 'Pomar');
});

test('dist es null sin ubicación y 0 en el mismo punto', () => {
  assert.equal(toCheckoutWine(wine, null).offers[0].dist, null);
  const withLoc = toCheckoutWine(wine, { lat: 10.5, lng: -66.85 });
  assert.equal(withLoc.offers[0].dist, 0);
});

test('propaga storeId, price numérico y status', () => {
  const o = toCheckoutWine(wine, null).offers[0];
  assert.equal(o.storeId, 'e1');
  assert.equal(o.price, 12.5);
  assert.equal(o.status, 'DISPONIBLE');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && node --test test/detail-mapping.test.mjs`
Expected: FAIL — `Cannot find module '../js/detail-mapping.js'`

- [ ] **Step 3: Write minimal implementation**

Crear `web/js/detail-mapping.js`:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && node --test test/detail-mapping.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 5: Usar el módulo en detail.js**

En `web/js/detail.js`:

1. Agregar el import al inicio (junto a los otros imports):

```js
import { toCheckoutWine } from './detail-mapping.js';
```

2. **Eliminar** la función local `toCheckoutWine(w)` completa (líneas 110-118, el bloque que empieza con `function toCheckoutWine(w) {` y su comentario).

3. Reemplazar la línea 95:

```js
if (resBtn) resBtn.onclick = () => { const w = current.wine; close(); openCheckout(toCheckoutWine(w), null); };
```

por:

```js
if (resBtn) resBtn.onclick = () => { const w = current.wine; close(); openCheckout(toCheckoutWine(w, window.CavaLoc || null), window.CavaLoc || null); };
```

- [ ] **Step 6: Publicar la ubicación desde app.js**

En `web/js/app.js`, dentro de `init()`, la parte final actual:

```js
    getUserLocation().then(function (loc) {
      state.userLoc = loc;
      renderView();
```

pasa a:

```js
    window.CavaLoc = state.userLoc;
    getUserLocation().then(function (loc) {
      state.userLoc = loc;
      window.CavaLoc = loc;
      renderView();
```

- [ ] **Step 7: Verificación manual**

1. Arrancar backend (`cd backend && npm run start:dev`) y servir `web/` (p. ej. `npx serve web -l 8081` o el server que uses).
2. Iniciar sesión, abrir el detalle de un vino (clic en el nombre de una card), clic en **Reservar** → completar paso 1 y 2 → la reserva debe crearse (antes fallaba con 404/"no disponible").
3. En el paso 1, el select de tiendas debe mostrar `· X km` junto al precio.

- [ ] **Step 8: Commit**

```bash
git add web/js/detail-mapping.js web/test/detail-mapping.test.mjs web/js/detail.js web/js/app.js
git commit -m "fix(web): reservar desde el detalle pasa id, distancia y ubicación real (R8, R7)"
```

---

### Task 2: Rechazar reservas de vinos AGOTADOS (bug R1)

`createReservation` verifica que la combinación vino-tienda exista pero no su `status`. El backend debe rechazar `AGOTADO` y el checkout debe filtrar esas ofertas del select.

**Files:**
- Modify: `backend/src/modules/reservations/reservations.service.ts:51`
- Modify: `backend/src/modules/reservations/reservations.service.spec.ts` (agregar describe)
- Modify: `web/js/checkout.js:15` (función `openCheckout`)

**Interfaces:**
- Consumes: enum Prisma `AvailabilityStatus` (`DISPONIBLE` | `AGOTADO`), campo `status` que ya viaja en las offers (app.js `transform()` y Task 1 lo incluyen).
- Produces: `createReservation` lanza `BadRequestException('Este vino está agotado en esa tienda.')` cuando `availability.status === 'AGOTADO'`.

- [ ] **Step 1: Write the failing test**

Agregar al final de `backend/src/modules/reservations/reservations.service.spec.ts`:

```ts
describe('ReservationsService.createReservation — stock', () => {
  const prisma = {
    availability: { findUnique: jest.fn() },
    reservation: { count: jest.fn(), create: jest.fn() },
  } as any;
  const svc = new ReservationsService(prisma, {} as any, {} as any);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza reservar un vino AGOTADO', async () => {
    prisma.availability.findUnique.mockResolvedValue({
      status: 'AGOTADO', price: 10,
      wine: { name: 'Malbec', wineryName: 'Las Moras' },
      establishment: { name: 'Centro', address: 'Av', lat: 10.5, lng: -66.85 },
    });
    await expect(
      svc.createReservation('u1', {
        wineId: 'w1', establishmentId: 'e1', quantity: 1, orderType: 'pickup',
        customer: { name: 'Ana', email: 'ana@example.com' },
      } as any),
    ).rejects.toThrow('agotado');
    expect(prisma.reservation.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest reservations.service.spec`
Expected: FAIL — el nuevo test no lanza (la reserva se intenta crear)

- [ ] **Step 3: Write minimal implementation**

En `backend/src/modules/reservations/reservations.service.ts`, después de la línea 51 (`if (!availability) throw new NotFoundException(...)`), agregar:

```ts
    if (availability.status === 'AGOTADO') {
      throw new BadRequestException('Este vino está agotado en esa tienda.');
    }
```

(`BadRequestException` ya está importado en la línea 1.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest reservations.service.spec`
Expected: PASS (todos los describe, incluido el nuevo)

- [ ] **Step 5: Filtrar ofertas agotadas en el checkout**

En `web/js/checkout.js`, la línea 15 dentro de `openCheckout`:

```js
  const offers = (wine.offers || []).slice().sort((a, b) => a.price - b.price);
```

pasa a:

```js
  const offers = (wine.offers || []).filter((o) => o.status !== 'AGOTADO').sort((a, b) => a.price - b.price);
  if (!offers.length) { alert('Este vino está agotado en todas las tiendas por ahora.'); return; }
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/reservations/reservations.service.ts backend/src/modules/reservations/reservations.service.spec.ts web/js/checkout.js
git commit -m "fix(api/web): no se puede reservar un vino agotado (R1)"
```

---

### Task 3: Alinear contraseña mínima a 6 caracteres (bug A5)

El frontend exige 6 caracteres pero `RegisterDto` acepta 4 vía API directa.

**Files:**
- Modify: `backend/src/modules/auth/dto/register.dto.ts:19-21`
- Create: `backend/src/modules/auth/dto/register.dto.spec.ts`

**Interfaces:**
- Produces: `RegisterDto.password` con `@MinLength(6)`. La Tarea 11 reutiliza el mismo mínimo en `ResetPasswordDto`.

- [ ] **Step 1: Write the failing test**

Crear `backend/src/modules/auth/dto/register.dto.spec.ts`:

```ts
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto — contraseña mínima', () => {
  const base = { name: 'Ana', email: 'ana@example.com' };

  it('rechaza contraseñas de menos de 6 caracteres', () => {
    const dto = plainToInstance(RegisterDto, { ...base, password: '12345' });
    const errors = validateSync(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('acepta contraseñas de 6 o más caracteres', () => {
    const dto = plainToInstance(RegisterDto, { ...base, password: '123456' });
    expect(validateSync(dto)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest register.dto.spec`
Expected: FAIL — `'12345'` (5 chars) pasa la validación actual de `@MinLength(4)`

- [ ] **Step 3: Write minimal implementation**

En `backend/src/modules/auth/dto/register.dto.ts`, reemplazar las líneas 19-22:

```ts
  @ApiProperty({ example: '1234', minLength: 4 })
  @IsString()
  @MinLength(4)
  password!: string;
```

por:

```ts
  @ApiProperty({ example: 'secreta123', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password!: string;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest register.dto.spec`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/auth/dto/register.dto.ts backend/src/modules/auth/dto/register.dto.spec.ts
git commit -m "fix(api): contraseña mínima de 6 caracteres, alineada con el frontend (A5)"
```

---

### Task 4: Manejo de sesión expirada (401) y JWT a 7 días (bug A2)

`authFetch` trata el 401 como error genérico; con el token vencido a mitad del checkout el usuario ve "Ocurrió un error". Interceptamos el 401 (limpiar sesión + redirigir a login con aviso) y subimos la expiración por defecto del JWT.

**Files:**
- Modify: `web/js/api.js:62-73` (función `authFetch`)
- Modify: `web/js/login.js:121` (init)
- Modify: `backend/src/config/configuration.ts:7`

**Interfaces:**
- Consumes: `logout()` de `web/js/store.js` (ya existe).
- Produces: cualquier llamada autenticada con token vencido redirige a `login.html?expired=1`; login.js muestra el aviso al ver ese parámetro.

- [ ] **Step 1: Interceptar el 401 en authFetch**

En `web/js/api.js`:

1. Cambiar la línea 2:

```js
import { getToken } from './store.js';
```

por:

```js
import { getToken, logout } from './store.js';
```

2. En `authFetch`, después de `const data = await r.json().catch(() => ({}));` y antes del `if (!r.ok)`, agregar:

```js
  if (r.status === 401) {
    logout();
    window.location.href = 'login.html?expired=1';
    throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
  }
```

- [ ] **Step 2: Mostrar el aviso en la página de login**

En `web/js/login.js`, después de la línea `if (new URLSearchParams(location.search).has('register')) setMode('register');` agregar:

```js
if (new URLSearchParams(location.search).has('expired')) showError('Tu sesión expiró. Inicia sesión de nuevo para continuar.');
```

- [ ] **Step 3: Subir la expiración por defecto del JWT**

En `backend/src/config/configuration.ts`, línea 7:

```ts
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
```

pasa a:

```ts
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
```

- [ ] **Step 4: Verificación manual**

1. Iniciar sesión en la web. En DevTools → Application → Local Storage, reemplazar `cl_token` por un valor inválido (p. ej. `xxx`).
2. Intentar reservar un vino (completar paso 1 y 2 del checkout).
3. Debe redirigir a `login.html?expired=1` con el mensaje "Tu sesión expiró…" visible, en vez de un error genérico.

- [ ] **Step 5: Commit**

```bash
git add web/js/api.js web/js/login.js backend/src/config/configuration.ts
git commit -m "fix(web/api): sesión expirada redirige al login con aviso; JWT dura 7 días (A2)"
```

---

### Task 5: Retorno post-login al vino que se estaba reservando (A7/W11)

`app.js:350` ya guarda `return=reserve:<id>` antes de mandar al login, pero `redirectAfterAuth()` lo descarta a propósito. Cambiamos la decisión de UX: tras autenticarse, se abre el detalle de ese vino.

**Files:**
- Modify: `web/js/login.js:56-61` (función `redirectAfterAuth`)
- Modify: `web/js/app.js` (final de `init()`, después del bloque de `getUserLocation()` agregado en Task 1)

**Interfaces:**
- Consumes: `takePendingReturn()` de `store.js` (formato `return=reserve:<wineId>`); `window.CavaDetail.open(id)` de `detail.js`.
- Produces: `login.html` redirige a `index.html?reserve=<id>`; `index.html` abre el modal de detalle de ese vino y limpia la URL.

- [ ] **Step 1: Redirigir con el vino pendiente**

En `web/js/login.js`, reemplazar las líneas 56-61:

```js
function redirectAfterAuth() {
  // Consumimos y descartamos cualquier reserva pendiente: tras autenticarse
  // el usuario aterriza en el catálogo, sin abrir el checkout automáticamente.
  takePendingReturn();
  window.location.href = 'index.html';
}
```

por:

```js
function redirectAfterAuth() {
  // Si el usuario venía de intentar reservar un vino, lo devolvemos a ese vino.
  const pending = takePendingReturn();
  const m = /^return=reserve:(.+)$/.exec(pending || '');
  window.location.href = m ? 'index.html?reserve=' + encodeURIComponent(m[1]) : 'index.html';
}
```

- [ ] **Step 2: Abrir el detalle al volver**

En `web/js/app.js`, al final de `init()` (después del bloque `getUserLocation().then(...)`), agregar:

```js
    var reserveId = new URLSearchParams(location.search).get('reserve');
    if (reserveId && window.CavaDetail) {
      history.replaceState(null, '', location.pathname);
      window.CavaDetail.open(reserveId);
    }
```

- [ ] **Step 3: Verificación manual**

1. Cerrar sesión. En el catálogo, clic en **Reservar** de cualquier card → redirige a login.
2. Iniciar sesión → debe volver a `index.html` con el modal de detalle de ese vino abierto.
3. Refrescar la página → el modal NO debe reabrirse (la URL quedó limpia).
4. Login normal (sin reserva pendiente) → aterriza en el catálogo como siempre.

- [ ] **Step 4: Commit**

```bash
git add web/js/login.js web/js/app.js
git commit -m "feat(web): tras iniciar sesión se vuelve al vino que se estaba reservando (A7, W11)"
```

---

### Task 6: Preview del desglose ANTES de crear la reserva (R14/R9)

Hoy "Ir a pagar" crea la reserva en la BD sin que el usuario haya visto el total ni la seña. Agregamos `POST /reservations/preview` (mismo cálculo, sin escribir) y una vista de confirmación dentro del paso 2 del checkout.

**Files:**
- Modify: `backend/src/modules/reservations/reservations.service.ts` (extraer `quote()`, agregar `previewReservation()`)
- Modify: `backend/src/modules/reservations/reservations.controller.ts` (endpoint `POST /reservations/preview`)
- Modify: `backend/src/modules/reservations/reservations.service.spec.ts` (nuevo describe)
- Modify: `web/js/api.js` (nueva función `previewReservation`)
- Modify: `web/js/checkout.js` (estado `confirming`/`preview`/`payload`, vista `stepConfirmar`, rebind)

**Interfaces:**
- Consumes: `CreateReservationDto` existente (el preview recibe el mismo payload que la creación).
- Produces: `previewReservation(userId, dto)` → `{ quantity, orderType, unitPrice, deliveryFee, subtotal, discountPct, discountAmount, total, deposit, balance }` — exactamente los campos que `summary(r)` de checkout.js ya sabe pintar. `api.previewReservation(payload)` en el front.

- [ ] **Step 1: Write the failing test**

Agregar al final de `backend/src/modules/reservations/reservations.service.spec.ts`:

```ts
describe('ReservationsService.previewReservation', () => {
  const prisma = {
    availability: { findUnique: jest.fn() },
    reservation: { count: jest.fn(), create: jest.fn() },
  } as any;
  const svc = new ReservationsService(prisma, {} as any, {} as any);

  beforeEach(() => jest.clearAllMocks());

  it('devuelve el desglose sin escribir en la BD', async () => {
    prisma.availability.findUnique.mockResolvedValue({
      status: 'DISPONIBLE', price: 10,
      wine: { name: 'Malbec', wineryName: 'Las Moras' },
      establishment: { name: 'Centro', address: 'Av', lat: 10.5, lng: -66.85 },
    });
    prisma.reservation.count.mockResolvedValue(0);
    const out = await svc.previewReservation('u1', {
      wineId: 'w1', establishmentId: 'e1', quantity: 2, orderType: 'pickup',
      customer: { name: 'Ana', email: 'ana@example.com' },
    } as any);
    expect(out.total).toBe(19); // 20 − 5% primera reserva
    expect(out.deposit).toBe(3.8);
    expect(out.unitPrice).toBe(10);
    expect(prisma.reservation.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest reservations.service.spec`
Expected: FAIL — `svc.previewReservation is not a function`

- [ ] **Step 3: Extraer `quote()` y agregar `previewReservation()`**

En `backend/src/modules/reservations/reservations.service.ts`, reemplazar el cuerpo de `createReservation` desde su inicio hasta la línea del `const amounts = ...` (inclusive) por una llamada a un método privado nuevo. El servicio queda así (solo se muestran los métodos afectados; `computeAmounts`, `deliveryFeeFor`, `payReservation` y `listMine` no cambian):

```ts
  private async quote(userId: string, dto: CreateReservationDto) {
    const availability = await this.prisma.availability.findUnique({
      where: { wineId_establishmentId: { wineId: dto.wineId, establishmentId: dto.establishmentId } },
      include: { wine: true, establishment: true },
    });
    if (!availability) throw new NotFoundException('Ese vino no está disponible en esa tienda.');
    if (availability.status === 'AGOTADO') {
      throw new BadRequestException('Este vino está agotado en esa tienda.');
    }
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
    return { availability, unitPrice, deliveryFee, amounts };
  }

  async previewReservation(userId: string, dto: CreateReservationDto) {
    const { unitPrice, deliveryFee, amounts } = await this.quote(userId, dto);
    return { quantity: dto.quantity, orderType: dto.orderType, unitPrice, deliveryFee, ...amounts };
  }

  async createReservation(userId: string, dto: CreateReservationDto) {
    const { availability, unitPrice, deliveryFee, amounts } = await this.quote(userId, dto);

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
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest reservations.service.spec`
Expected: PASS — el nuevo describe y TODOS los anteriores (incluido el de stock de Task 2, que ahora pasa por `quote()`)

- [ ] **Step 5: Endpoint en el controller**

En `backend/src/modules/reservations/reservations.controller.ts`, agregar después del método `create` (línea 20):

```ts
  @Post('preview')
  @ApiOperation({ summary: 'Calcular el desglose de una reserva sin crearla' })
  preview(@CurrentUser() user: AuthUser, @Body() dto: CreateReservationDto) {
    return this.service.previewReservation(user.userId, dto);
  }
```

- [ ] **Step 6: Cliente API en el front**

En `web/js/api.js`, junto a `createReservation` (línea 75), agregar:

```js
export function previewReservation(payload) { return authFetch('/reservations/preview', { method: 'POST', body: JSON.stringify(payload) }); }
```

- [ ] **Step 7: Vista de confirmación en checkout.js**

En `web/js/checkout.js`:

1. En `openCheckout`, agregar al objeto `st` (línea 21) los campos nuevos — la línea:

```js
    step: 1, reservation: null, _miniMap: null,
```

pasa a:

```js
    step: 1, reservation: null, _miniMap: null,
    confirming: false, preview: null, payload: null,
```

2. En `render()`, la línea:

```js
  else if (st.step === 2) inner = stepDatos();
```

pasa a:

```js
  else if (st.step === 2) inner = st.confirming ? stepConfirmar() : stepDatos();
```

3. Agregar la vista nueva después de `stepDatos()` (después de la línea 85):

```js
function stepConfirmar() {
  const p = st.preview;
  const store = st.offers[st.offerIdx];
  return prodCard() +
    '<div class="co-minihint">Revisa el desglose antes de crear tu reserva en <b>' + esc(store.storeName) + '</b>. Todavía no se reservó nada.</div>' +
    summary(p) +
    '<div class="co-error co-hide" id="co-err"></div>' +
    '<div class="co-actions"><button class="co-btn ghost" id="co-back2">Volver</button><button class="co-btn prim" id="co-confirm">Confirmar reserva</button></div>';
}
```

4. En `bind()`, cambiar la condición del bloque del paso 2 de `if (st.step === 2) {` a `if (st.step === 2 && !st.confirming) {`, y **dentro de ese bloque** reemplazar el handler `$('#co-next').onclick` completo (líneas 171-198) por:

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
      const btn = $('#co-next'); btn.disabled = true; btn.textContent = 'Calculando…';
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
      try {
        st.payload = payload;
        st.preview = await api.previewReservation(payload);
        st.confirming = true; render();
      } catch (err) { btn.disabled = false; btn.textContent = st.orderType === 'delivery' ? 'Ir a pagar la seña' : 'Ir a pagar'; showErr(err.message); }
    };
```

5. Agregar el bloque de la vista de confirmación en `bind()`, justo después del bloque `if (st.step === 2 && !st.confirming) { ... }`:

```js
  if (st.step === 2 && st.confirming) {
    $('#co-back2').onclick = () => { st.confirming = false; render(); };
    $('#co-confirm').onclick = async () => {
      const btn = $('#co-confirm'); btn.disabled = true; btn.textContent = 'Creando reserva…';
      try {
        st.reservation = await api.createReservation(st.payload);
        if (st._miniMap) { st._miniMap.remove(); st._miniMap = null; }
        st.confirming = false; st.step = 3; render();
      } catch (err) { btn.disabled = false; btn.textContent = 'Confirmar reserva'; showErr(err.message); }
    };
  }
```

6. En el handler del botón "Atrás" genérico (línea 150), asegurar que volver desde el paso 3 no deje `confirming` prendido — la línea:

```js
  const back = $('#co-back'); if (back) back.onclick = () => { st.step--; if (st.step === 2) st.reservation = null; render(); };
```

pasa a:

```js
  const back = $('#co-back'); if (back) back.onclick = () => { st.step--; if (st.step === 2) { st.reservation = null; st.confirming = false; } render(); };
```

- [ ] **Step 8: Verificación manual**

1. Reservar un vino: paso 1 → paso 2 → "Ir a pagar" ahora muestra **"Revisa el desglose…"** con subtotal, descuento, envío (si delivery), total, seña y saldo.
2. "Volver" regresa al formulario con los datos intactos. "Confirmar reserva" pasa al pago.
3. Verificar en Swagger (`http://localhost:3001/api`) que existe `POST /reservations/preview`.
4. Probar con delivery: el desglose debe incluir la línea de envío.

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/reservations/reservations.service.ts backend/src/modules/reservations/reservations.controller.ts backend/src/modules/reservations/reservations.service.spec.ts web/js/api.js web/js/checkout.js
git commit -m "feat(web/api): preview del desglose antes de crear la reserva (R14, R9)"
```

---

### Task 7: Cancelar reserva — backend (R3)

Endpoint `POST /reservations/:id/cancel`. Se pueden cancelar reservas `pending_payment` y `confirmed`; las `cancelled`/`expired` se rechazan.

**Files:**
- Modify: `backend/src/modules/reservations/reservations.service.ts` (nuevo método al final, antes de `listMine`)
- Modify: `backend/src/modules/reservations/reservations.controller.ts`
- Modify: `backend/src/modules/reservations/reservations.service.spec.ts`
- Modify: `web/js/api.js`

**Interfaces:**
- Produces: `cancelReservation(userId, id)` → la reserva actualizada con `status: 'cancelled'`; `api.cancelReservation(id)` en el front (la usa la Task 9). Estados posibles de una reserva a partir de aquí: `pending_payment | confirmed | cancelled | expired` (expired llega en Task 8).

- [ ] **Step 1: Write the failing test**

Agregar al final de `backend/src/modules/reservations/reservations.service.spec.ts`:

```ts
describe('ReservationsService.cancelReservation', () => {
  const prisma = { reservation: { findUnique: jest.fn(), update: jest.fn() } } as any;
  const svc = new ReservationsService(prisma, {} as any, {} as any);

  beforeEach(() => jest.clearAllMocks());

  it('cancela una reserva pendiente del propio usuario', async () => {
    prisma.reservation.findUnique.mockResolvedValue({ id: 'r1', userId: 'u1', status: 'pending_payment' });
    prisma.reservation.update.mockResolvedValue({ id: 'r1', status: 'cancelled' });
    const out = await svc.cancelReservation('u1', 'r1');
    expect(prisma.reservation.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { status: 'cancelled' } });
    expect(out.status).toBe('cancelled');
  });

  it('rechaza cancelar una reserva ya cancelada', async () => {
    prisma.reservation.findUnique.mockResolvedValue({ id: 'r1', userId: 'u1', status: 'cancelled' });
    await expect(svc.cancelReservation('u1', 'r1')).rejects.toThrow('ya está cancelada');
  });

  it('no permite cancelar reservas de otro usuario', async () => {
    prisma.reservation.findUnique.mockResolvedValue({ id: 'r1', userId: 'u2', status: 'pending_payment' });
    await expect(svc.cancelReservation('u1', 'r1')).rejects.toThrow('no encontrada');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest reservations.service.spec`
Expected: FAIL — `svc.cancelReservation is not a function`

- [ ] **Step 3: Write minimal implementation**

En `backend/src/modules/reservations/reservations.service.ts`, agregar antes de `listMine`:

```ts
  async cancelReservation(userId: string, id: string) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id } });
    if (!reservation || reservation.userId !== userId) throw new NotFoundException('Reserva no encontrada.');
    if (reservation.status === 'cancelled') throw new BadRequestException('La reserva ya está cancelada.');
    if (reservation.status === 'expired') throw new BadRequestException('La reserva ya expiró.');
    return this.prisma.reservation.update({ where: { id }, data: { status: 'cancelled' } });
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest reservations.service.spec`
Expected: PASS

- [ ] **Step 5: Endpoint y cliente API**

En `backend/src/modules/reservations/reservations.controller.ts`, agregar después del método `pay`:

```ts
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar una reserva propia' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.cancelReservation(user.userId, id);
  }
```

En `web/js/api.js`, junto a las otras funciones de reservas:

```js
export function cancelReservation(id) { return authFetch('/reservations/' + id + '/cancel', { method: 'POST' }); }
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/reservations/reservations.service.ts backend/src/modules/reservations/reservations.controller.ts backend/src/modules/reservations/reservations.service.spec.ts web/js/api.js
git commit -m "feat(api): cancelar reserva propia via POST /reservations/:id/cancel (R3)"
```

---

### Task 8: Expiración automática de reservas pendientes (R5)

Cron horario que marca como `expired` las reservas `pending_payment` con más de 24 horas.

**Files:**
- Modify: `backend/package.json` (nueva dependencia `@nestjs/schedule`)
- Modify: `backend/src/app.module.ts` (registrar `ScheduleModule.forRoot()`)
- Modify: `backend/src/modules/reservations/reservations.service.ts` (método `expireStale` con `@Cron`)
- Modify: `backend/src/modules/reservations/reservations.service.spec.ts`

**Interfaces:**
- Produces: `expireStale()` → número de reservas expiradas; corre solo cada hora vía `@Cron(CronExpression.EVERY_HOUR)`.

- [ ] **Step 1: Instalar la dependencia**

Run: `cd backend && npm install @nestjs/schedule@^4`
Expected: instala sin errores (la v4 es compatible con NestJS 10).

- [ ] **Step 2: Write the failing test**

Agregar al final de `backend/src/modules/reservations/reservations.service.spec.ts`:

```ts
describe('ReservationsService.expireStale', () => {
  const prisma = { reservation: { updateMany: jest.fn() } } as any;
  const svc = new ReservationsService(prisma, {} as any, {} as any);

  it('marca como expired las pendientes con más de 24h', async () => {
    prisma.reservation.updateMany.mockResolvedValue({ count: 3 });
    const n = await svc.expireStale();
    expect(n).toBe(3);
    const arg = prisma.reservation.updateMany.mock.calls[0][0];
    expect(arg.where.status).toBe('pending_payment');
    expect(arg.where.createdAt.lt).toBeInstanceOf(Date);
    expect(arg.data.status).toBe('expired');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npx jest reservations.service.spec`
Expected: FAIL — `svc.expireStale is not a function`

- [ ] **Step 4: Write minimal implementation**

En `backend/src/modules/reservations/reservations.service.ts`:

1. Agregar a los imports del inicio:

```ts
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';
```

(o sumar `Logger` al import existente de `@nestjs/common`).

2. Agregar dentro de la clase, arriba del constructor:

```ts
  private readonly logger = new Logger(ReservationsService.name);
```

3. Agregar el método antes de `listMine`:

```ts
  // Limpieza: las reservas sin pagar expiran a las 24 horas.
  @Cron(CronExpression.EVERY_HOUR)
  async expireStale(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.reservation.updateMany({
      where: { status: 'pending_payment', createdAt: { lt: cutoff } },
      data: { status: 'expired' },
    });
    if (count > 0) this.logger.log(`Reservas pendientes expiradas: ${count}`);
    return count;
  }
```

4. En `backend/src/app.module.ts`, agregar el import:

```ts
import { ScheduleModule } from '@nestjs/schedule';
```

y en el array `imports`, después de `ConfigModule.forRoot({...})`:

```ts
    ScheduleModule.forRoot(),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS — toda la suite (el decorador `@Cron` no afecta la instanciación directa en los specs).

- [ ] **Step 6: Verificar que el server arranca**

Run: `cd backend && npm run start:dev` (dejarlo levantar y cortar con Ctrl+C)
Expected: arranca sin errores de DI; en el log no hay excepciones de ScheduleModule.

- [ ] **Step 7: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/app.module.ts backend/src/modules/reservations/reservations.service.ts backend/src/modules/reservations/reservations.service.spec.ts
git commit -m "feat(api): las reservas pendientes expiran a las 24h con cron horario (R5)"
```

---

### Task 9: Página "Mis Reservas" con cancelación (2.1 + 1.5 UI)

La API `myReservations()` existe desde antes pero no hay UI. Página nueva con lista de reservas, chips de estado y botón de cancelar (usa el endpoint de la Task 7).

**Files:**
- Create: `web/reservations.html`
- Create: `web/js/reservations.js`
- Create: `web/css/reservations.css`
- Modify: `web/js/app.js` (función `renderAccount`, líneas 166-174)
- Modify: `web/css/styles.css` (append al final)

**Interfaces:**
- Consumes: `myReservations()` → array de reservas (campos: `id, invoiceNumber, wineName, wineryName, storeName, quantity, total, deposit, status, orderType, deliveryAddress, createdAt`); `cancelReservation(id)` (Task 7); `getUser()`, `money(n)`.
- Produces: `web/reservations.html` accesible desde el navbar cuando hay sesión.

- [ ] **Step 1: Crear la página**

Crear `web/reservations.html`:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CavaLocal — Mis reservas</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/styles.css" />
  <link rel="stylesheet" href="css/reservations.css" />
</head>
<body>
  <header class="navbar">
    <div class="container">
      <a class="brand" href="index.html">
        <svg class="logo" viewBox="0 0 100 132" aria-hidden="true">
          <path d="M50 6 C26 6 7 25 7 49 C7 79 50 120 50 120 C50 120 93 79 93 49 C93 25 74 6 50 6 Z" fill="#641E2E"/>
          <path d="M35 30 H65 C65 48 57 57 50 58 C43 57 35 48 35 30 Z" fill="#fff"/>
          <path d="M38 41 C44 46 56 46 62 41 C61 50 56 55 50 56 C44 55 39 50 38 41 Z" fill="#641E2E"/>
          <rect x="48.5" y="58" width="3" height="18" fill="#fff"/>
          <ellipse cx="50" cy="77" rx="10" ry="2.6" fill="#fff"/>
          <path d="M50 96 L57 102 L50 108 L43 102 Z" fill="#C2912B"/>
        </svg>
        <span class="wordmark">CavaLocal</span>
      </a>
      <div class="nav-actions"><a class="nav-reservas" href="index.html">← Volver a la tienda</a></div>
    </div>
  </header>

  <main class="rv-wrap">
    <h2>Mis reservas</h2>
    <p class="rv-sub">Tus reservas con seña, pendientes y pasadas.</p>
    <div id="rv-list"></div>
  </main>

  <script type="module" src="js/reservations.js"></script>
</body>
</html>
```

- [ ] **Step 2: Lógica de la página**

Crear `web/js/reservations.js`:

```js
import { myReservations, cancelReservation } from './api.js';
import { getUser } from './store.js';
import { money } from './money.js';

const $ = (s) => document.querySelector(s);
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

const STATUS = {
  pending_payment: { label: 'Pendiente de pago', cls: 'pend' },
  confirmed: { label: 'Confirmada', cls: 'ok' },
  cancelled: { label: 'Cancelada', cls: 'off' },
  expired: { label: 'Expirada', cls: 'off' },
};

function fmtDate(iso) { return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }); }

function card(r) {
  const s = STATUS[r.status] || { label: r.status, cls: 'off' };
  const cancellable = r.status === 'pending_payment' || r.status === 'confirmed';
  const lugar = r.orderType === 'delivery' ? 'Delivery a ' + esc(r.deliveryAddress || '') : 'Retiro en ' + esc(r.storeName);
  return '<div class="rv-card">' +
    '<div class="rv-top"><b>' + esc(r.invoiceNumber) + '</b><span class="rv-chip ' + s.cls + '">' + s.label + '</span></div>' +
    '<div class="rv-wine">' + esc(r.wineName) + ' × ' + r.quantity + ' — ' + esc(r.wineryName) + '</div>' +
    '<div class="rv-meta">' + lugar + ' · ' + fmtDate(r.createdAt) + '</div>' +
    '<div class="rv-amounts"><span>Total <b>' + money(r.total) + '</b></span><span>Seña <b>' + money(r.deposit) + '</b></span></div>' +
    (cancellable ? '<button class="rv-cancel" data-cancel="' + r.id + '">Cancelar reserva</button>' : '') +
    '</div>';
}

async function load() {
  const host = $('#rv-list');
  host.innerHTML = '<p class="rv-empty">Cargando…</p>';
  try {
    const list = await myReservations();
    host.innerHTML = list.length
      ? list.map(card).join('')
      : '<p class="rv-empty">Aún no tienes reservas. <a href="index.html">Explora el catálogo</a>.</p>';
  } catch (e) {
    host.innerHTML = '<p class="rv-empty">' + esc(e.message || 'No se pudieron cargar tus reservas.') + '</p>';
  }
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-cancel]');
  if (!btn) return;
  if (!confirm('¿Cancelar esta reserva? Esta acción no se puede deshacer.')) return;
  btn.disabled = true; btn.textContent = 'Cancelando…';
  try {
    await cancelReservation(btn.getAttribute('data-cancel'));
    await load();
  } catch (err) {
    btn.disabled = false; btn.textContent = 'Cancelar reserva';
    alert(err.message || 'No se pudo cancelar.');
  }
});

if (!getUser()) window.location.href = 'login.html';
else load();
```

- [ ] **Step 3: Estilos**

Crear `web/css/reservations.css`:

```css
.rv-wrap { max-width: 760px; margin: 32px auto 64px; padding: 0 20px; }
.rv-wrap h2 { font-family: var(--font-display, 'Playfair Display', serif); color: var(--wine, #641E2E); margin-bottom: 4px; }
.rv-sub { color: var(--muted, #8B7F79); margin-bottom: 24px; }
.rv-card { background: #fff; border-radius: 14px; padding: 18px 20px; margin-bottom: 14px; box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06); }
.rv-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.rv-chip { font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 50px; }
.rv-chip.pend { background: #FBF3D9; color: #8a6d1a; }
.rv-chip.ok { background: #E3F4E9; color: #2E8B57; }
.rv-chip.off { background: #F1EDEB; color: #8B7F79; }
.rv-wine { font-weight: 700; }
.rv-meta { font-size: 13px; color: var(--muted, #8B7F79); margin: 4px 0 8px; }
.rv-amounts { display: flex; gap: 18px; font-size: 14px; margin-bottom: 10px; }
.rv-cancel { background: none; border: 1px solid #C0392B; color: #C0392B; border-radius: 50px; padding: 8px 18px; font-weight: 700; cursor: pointer; font-size: 13px; }
.rv-cancel:hover { background: #C0392B; color: #fff; }
.rv-empty { color: var(--muted, #8B7F79); text-align: center; padding: 40px 0; }
```

- [ ] **Step 4: Link en el navbar**

En `web/js/app.js`, en `renderAccount()` (líneas 166-174), la rama con usuario:

```js
    if (user) {
      el.innerHTML = '<div class="user-pill" data-logout="1"><div class="avatar">' + esc(initials(user.name)) + '</div><span class="uname">' + esc(user.name.split(' ')[0]) + '</span></div>';
    } else {
```

pasa a:

```js
    if (user) {
      el.innerHTML = '<a class="nav-reservas" href="reservations.html">Mis reservas</a>' +
        '<div class="user-pill" data-logout="1"><div class="avatar">' + esc(initials(user.name)) + '</div><span class="uname">' + esc(user.name.split(' ')[0]) + '</span></div>';
    } else {
```

Y agregar al **final** de `web/css/styles.css`:

```css
/* ---- Mis reservas (navbar) ---- */
#account { display: flex; align-items: center; gap: 12px; }
.nav-reservas { font-size: 13px; font-weight: 700; color: var(--wine, #641E2E); text-decoration: none; white-space: nowrap; }
.nav-reservas:hover { text-decoration: underline; }
```

- [ ] **Step 5: Verificación manual**

1. Con sesión iniciada, el navbar muestra "Mis reservas" junto al pill de usuario; clic → abre la página con las reservas (crear una si no hay).
2. Una reserva `pending_payment` (crear una y abandonar antes de pagar) muestra el chip amarillo y el botón **Cancelar reserva**; cancelarla la pasa a chip gris "Cancelada" y el botón desaparece.
3. Sin sesión, entrar a `reservations.html` directo redirige a `login.html`.

- [ ] **Step 6: Commit**

```bash
git add web/reservations.html web/js/reservations.js web/css/reservations.css web/js/app.js web/css/styles.css
git commit -m "feat(web): página Mis Reservas con historial y cancelación (2.1, 1.5)"
```

---

### Task 10: Mapa — direcciones en popups y botón "Cómo llegar" (M3, GM5, M10)

Sin API key: el link `https://www.google.com/maps/dir/?api=1&destination=lat,lng` abre Google Maps con la ruta. Se agrega la dirección de la tienda a las offers del catálogo y se muestra en popups del mapa y en el detalle.

**Files:**
- Modify: `backend/src/modules/catalog/catalog.service.ts:47-54` (método `toCard`)
- Modify: `web/js/app.js` (funciones `transform`, `mapView`, `mountLeaflet`)
- Modify: `web/js/detail.js` (función `offersHtml`)
- Modify: `web/css/detail.css` (append)

**Interfaces:**
- Produces: las offers del API incluyen `address: string`; helper de URL `'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng` (patrón repetido en app.js y detail.js, cada uno inline por simplicidad).

- [ ] **Step 1: Dirección en las offers del backend**

En `backend/src/modules/catalog/catalog.service.ts`, en `toCard`, el mapeo de offers:

```ts
      .map((a: any) => ({
        establishmentId: a.establishmentId,
        storeName: a.establishment?.name ?? '',
        price: Number(a.price),
        lat: a.establishment?.lat,
        lng: a.establishment?.lng,
        status: a.status,
      }))
```

pasa a:

```ts
      .map((a: any) => ({
        establishmentId: a.establishmentId,
        storeName: a.establishment?.name ?? '',
        address: a.establishment?.address ?? '',
        price: Number(a.price),
        lat: a.establishment?.lat,
        lng: a.establishment?.lng,
        status: a.status,
      }))
```

- [ ] **Step 2: Correr los tests del catálogo**

Run: `cd backend && npx jest catalog`
Expected: PASS. Si algún assert compara el objeto offer completo con `toEqual`, agregar `address` al objeto esperado en ese spec y volver a correr.

- [ ] **Step 3: Propagar y mostrar en app.js**

En `web/js/app.js`:

1. En `transform()` (línea ~90), el mapeo de offers:

```js
      return {
        storeId: o.establishmentId, storeName: o.storeName, lat: o.lat, lng: o.lng,
        price: Number(o.price), status: o.status,
```

pasa a:

```js
      return {
        storeId: o.establishmentId, storeName: o.storeName, address: o.address, lat: o.lat, lng: o.lng,
        price: Number(o.price), status: o.status,
```

2. En `mapView()` (línea ~303), donde se arma `stores[o.storeId]`:

```js
          stores[o.storeId] = { name: o.storeName, price: o.price, lat: o.lat, lng: o.lng };
```

pasa a:

```js
          stores[o.storeId] = { name: o.storeName, address: o.address, price: o.price, lat: o.lat, lng: o.lng };
```

3. En `mountLeaflet()` (líneas 328-333), el bloque del marcador:

```js
    stores.forEach(function (s) {
      var km = round1(haversineKm(state.userLoc.lat, state.userLoc.lng, s.lat, s.lng));
      L.marker([s.lat, s.lng]).addTo(map)
        .bindPopup('<b>' + esc(s.name) + '</b><br>desde ' + money(s.price) + ' · ' + km + ' km');
      pts.push([s.lat, s.lng]);
    });
```

pasa a:

```js
    stores.forEach(function (s) {
      var km = round1(haversineKm(state.userLoc.lat, state.userLoc.lng, s.lat, s.lng));
      var dir = 'https://www.google.com/maps/dir/?api=1&destination=' + s.lat + ',' + s.lng;
      L.marker([s.lat, s.lng]).addTo(map)
        .bindPopup('<b>' + esc(s.name) + '</b>' +
          (s.address ? '<br>' + esc(s.address) : '') +
          '<br>desde ' + money(s.price) + ' · ' + km + ' km' +
          '<br><a href="' + dir + '" target="_blank" rel="noopener">Cómo llegar →</a>');
      pts.push([s.lat, s.lng]);
    });
```

- [ ] **Step 4: "Cómo llegar" en el detalle del vino**

En `web/js/detail.js`, reemplazar `offersHtml` completa (líneas 45-51) por:

```js
function dirLink(o) {
  if (o.lat == null || o.lng == null) return '';
  const url = 'https://www.google.com/maps/dir/?api=1&destination=' + o.lat + ',' + o.lng;
  return ' <a class="dt-dir" href="' + url + '" target="_blank" rel="noopener">Cómo llegar</a>';
}

function offersHtml(w) {
  const offers = (w.offers || []).slice().sort((a, b) => a.price - b.price);
  if (!offers.length) return '';
  return '<div class="dt-offers"><h4>Disponible en</h4>' + offers.map((o, i) =>
    '<div class="dt-offer"><span>' + esc(o.storeName) + (i === 0 ? ' <b class="best">más barato</b>' : '') + dirLink(o) +
    (o.address ? '<span class="dt-addr">' + esc(o.address) + '</span>' : '') + '</span>' +
    '<span class="op">' + money(o.price) + (o.status === 'AGOTADO' ? ' · agotado' : '') + '</span></div>').join('') + '</div>';
}
```

Agregar al **final** de `web/css/detail.css`:

```css
/* ---- Cómo llegar / dirección en ofertas ---- */
.dt-addr { display: block; font-size: 12px; color: var(--muted, #8B7F79); }
.dt-dir { font-size: 12px; font-weight: 700; color: #641E2E; }
```

- [ ] **Step 5: Verificación manual**

1. Vista **Mapa** del catálogo: clic en un marcador → el popup muestra nombre, dirección, precio, km y el link "Cómo llegar →" que abre Google Maps con la ruta en otra pestaña.
2. Detalle de un vino: cada tienda de "Disponible en" muestra su dirección y el link "Cómo llegar".

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/catalog/catalog.service.ts web/js/app.js web/js/detail.js web/css/detail.css
git commit -m "feat(web/api): direcciones de tiendas y botón Cómo llegar sin API key (M3, GM5, M10)"
```

---

### Task 11: Recuperar contraseña (A3, cierra también A10)

Flujo completo: "¿Olvidaste tu contraseña?" → email con enlace (token de 1 hora) → página para crear la nueva. Resuelve de paso a los usuarios de Google (contraseña random) que quieran login normal. Si el SMTP no está configurado, el enlace se imprime en el log del backend (útil para la demo).

**Files:**
- Modify: `backend/prisma/schema.prisma` (modelo `User`)
- Create: `backend/src/modules/auth/dto/forgot-password.dto.ts`
- Create: `backend/src/modules/auth/dto/reset-password.dto.ts`
- Modify: `backend/src/config/configuration.ts`
- Modify: `backend/src/modules/notifications/email.service.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/auth.module.ts`
- Modify: `backend/src/modules/auth/auth.controller.ts`
- Modify: `backend/src/modules/auth/auth.service.spec.ts` (nuevos providers en el testing module)
- Create: `backend/src/modules/auth/auth.reset.spec.ts`
- Modify: `web/js/api.js`, `web/login.html`, `web/css/login.css`
- Create: `web/recover.html`, `web/js/recover.js`

**Interfaces:**
- Consumes: `EmailService` (NotificationsModule ya lo exporta), `ConfigService` global, `bcrypt`, `randomUUID` (ya importados en auth.service.ts).
- Produces: `POST /auth/forgot-password { email }` → `{ ok: true }` siempre; `POST /auth/reset-password { token, password }` → `{ ok: true }` o 400. `EmailService.sendPasswordReset({ to, name, resetUrl })` → `Promise<boolean>`. Front: `api.forgotPassword(email)`, `api.resetPassword(token, password)`, página `recover.html` (sin `?token` pide el correo; con `?token=...` pide la contraseña nueva). Config nueva: `webBaseUrl` (env `WEB_BASE_URL`, default `http://localhost:8081`).

- [ ] **Step 1: Campos de reset en el schema**

En `backend/prisma/schema.prisma`, en el modelo `User`, después de `googleId String? @unique` agregar:

```prisma
  resetToken          String?   @unique
  resetTokenExpiresAt DateTime?
```

- [ ] **Step 2: Migración**

Con el PostgreSQL portátil corriendo:

Run: `cd backend && npx prisma migrate dev --name password_reset`
Expected: `Your database is now in sync with your schema` y el cliente Prisma regenerado.

- [ ] **Step 3: Config y correo de recuperación**

1. En `backend/src/config/configuration.ts`, agregar dentro del objeto (después de `googleClientId`):

```ts
  webBaseUrl: process.env.WEB_BASE_URL ?? 'http://localhost:8081',
```

2. En `backend/src/modules/notifications/email.service.ts`, agregar el método después de `sendInvoice`:

```ts
  async sendPasswordReset(data: { to: string; name: string; resetUrl: string }): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('MAIL_USER/MAIL_APP_PASSWORD sin configurar: no se envió el correo de recuperación.');
      this.logger.log(`Enlace de recuperación para ${data.to}: ${data.resetUrl}`);
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: `CavaLocal <${this.from}>`,
        to: data.to,
        subject: 'Recupera tu contraseña — CavaLocal',
        html:
          '<div style="font-family:Arial;max-width:520px;margin:0 auto;color:#2A2024">' +
          `<h2 style="color:#641E2E">Hola ${data.name},</h2>` +
          '<p>Recibimos un pedido para restablecer tu contraseña en CavaLocal.</p>' +
          `<p><a href="${data.resetUrl}" style="background:#641E2E;color:#fff;padding:12px 22px;border-radius:50px;text-decoration:none;display:inline-block">Crear nueva contraseña</a></p>` +
          '<p style="font-size:12px;color:#999">El enlace vence en 1 hora. Si no fuiste tú, ignora este correo.</p>' +
          '</div>',
      });
      return true;
    } catch (e) {
      this.logger.error('Falló el envío del correo de recuperación: ' + (e as Error).message);
      return false;
    }
  }
```

- [ ] **Step 4: Write the failing tests**

Crear `backend/src/modules/auth/auth.reset.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { GoogleVerifierService } from './google-verifier.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';

describe('AuthService — recuperación de contraseña', () => {
  let service: AuthService;
  const prisma = { user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() } };
  const email = { sendPasswordReset: jest.fn().mockResolvedValue(true) };
  const config = { get: jest.fn().mockReturnValue('http://localhost:8081') };

  beforeEach(async () => {
    jest.clearAllMocks();
    email.sendPasswordReset.mockResolvedValue(true);
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: GoogleVerifierService, useValue: { verify: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: EmailService, useValue: email },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('guarda un token y manda el correo si el usuario existe', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'ana@example.com', name: 'Ana' });
    prisma.user.update.mockResolvedValue({});
    const res = await service.forgotPassword('ana@example.com');
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ resetToken: expect.any(String) }),
    }));
    expect(email.sendPasswordReset).toHaveBeenCalledWith(expect.objectContaining({
      to: 'ana@example.com',
      resetUrl: expect.stringContaining('recover.html?token='),
    }));
    expect(res).toEqual({ ok: true });
  });

  it('responde ok aunque el correo no exista, sin mandar nada', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await service.forgotPassword('nadie@example.com');
    expect(email.sendPasswordReset).not.toHaveBeenCalled();
    expect(res).toEqual({ ok: true });
  });

  it('cambia la contraseña con token vigente y limpia el token', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
    prisma.user.update.mockResolvedValue({});
    const res = await service.resetPassword('tok-1', 'nueva123');
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'u1' },
      data: expect.objectContaining({ resetToken: null, resetTokenExpiresAt: null }),
    }));
    expect(res).toEqual({ ok: true });
  });

  it('rechaza un token inválido o vencido', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.resetPassword('malo', 'nueva123')).rejects.toThrow('enlace');
  });
});
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `cd backend && npx jest auth.reset.spec`
Expected: FAIL — `service.forgotPassword is not a function`

- [ ] **Step 6: Implementar en AuthService**

En `backend/src/modules/auth/auth.service.ts`:

1. Actualizar los imports del inicio:

```ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../notifications/email.service';
```

(los demás imports quedan igual).

2. Actualizar el constructor:

```ts
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly googleVerifier: GoogleVerifierService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}
```

3. Agregar los métodos después de `me()`:

```ts
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (user) {
      const resetToken = randomUUID();
      const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
      await this.prisma.user.update({ where: { id: user.id }, data: { resetToken, resetTokenExpiresAt } });
      const base = this.config.get<string>('webBaseUrl') ?? 'http://localhost:8081';
      await this.email.sendPasswordReset({
        to: user.email,
        name: user.name,
        resetUrl: `${base}/recover.html?token=${resetToken}`,
      });
    }
    // Siempre ok: no revelamos si el correo existe o no.
    return { ok: true };
  }

  async resetPassword(token: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpiresAt: { gt: new Date() } },
    });
    if (!user) throw new BadRequestException('El enlace no es válido o ya expiró. Solicita uno nuevo.');
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiresAt: null },
    });
    return { ok: true };
  }
```

4. En `backend/src/modules/auth/auth.module.ts`, agregar el import:

```ts
import { NotificationsModule } from '../notifications/notifications.module';
```

y en el array `imports` del `@Module`, agregar `NotificationsModule,` después de `PassportModule,`.

5. Actualizar el spec existente `backend/src/modules/auth/auth.service.spec.ts` para los nuevos providers — agregar a los imports:

```ts
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../notifications/email.service';
```

y en el array `providers` del `Test.createTestingModule`, agregar:

```ts
        { provide: EmailService, useValue: { sendPasswordReset: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS — `auth.reset.spec` (4 tests) y `auth.service.spec` (los 2 de Google siguen pasando con los providers nuevos).

- [ ] **Step 8: DTOs y endpoints**

Crear `backend/src/modules/auth/dto/forgot-password.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'ana@example.com' })
  @IsEmail()
  email!: string;
}
```

Crear `backend/src/modules/auth/dto/reset-password.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recibido por correo' })
  @IsString()
  token!: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password!: string;
}
```

En `backend/src/modules/auth/auth.controller.ts`, agregar los imports:

```ts
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
```

y los endpoints después del método `google`:

```ts
  @Post('forgot-password')
  @ApiOperation({ summary: 'Enviar correo con enlace para restablecer la contraseña' })
  forgot(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Restablecer la contraseña con el token del correo' })
  reset(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }
```

- [ ] **Step 9: Frontend — API, link y página**

1. En `web/js/api.js`, junto a `login`/`register` (línea 18):

```js
export function forgotPassword(email) { return post('/auth/forgot-password', { email }); }
export function resetPassword(token, password) { return post('/auth/reset-password', { token, password }); }
```

2. En `web/login.html`, dentro del `<div class="field">` de la contraseña, después del `<div class="strength" ...></div>` (línea 85), agregar:

```html
            <a class="login-forgot" href="recover.html">¿Olvidaste tu contraseña?</a>
```

Y al **final** de `web/css/login.css`:

```css
/* ---- recuperar contraseña ---- */
.login-forgot { display: inline-block; margin-top: 8px; font-size: 13px; font-weight: 600; color: var(--wine, #641E2E); text-decoration: none; }
.login-forgot:hover { text-decoration: underline; }
```

3. Crear `web/recover.html`:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CavaLocal — Recuperar contraseña</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700;800;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/styles.css" />
  <link rel="stylesheet" href="css/login.css" />
</head>
<body class="login-body">
  <main class="login-main" style="min-height:100vh">
    <div class="login-card">
      <div class="login-mark-sm" aria-hidden="true">
        <svg viewBox="0 0 100 132" width="30" height="40">
          <path d="M50 6 C26 6 7 25 7 49 C7 79 50 120 50 120 C50 120 93 79 93 49 C93 25 74 6 50 6 Z" fill="#641E2E"/>
          <path d="M35 30 H65 C65 48 57 57 50 58 C43 57 35 48 35 30 Z" fill="#fff"/>
          <rect x="48.5" y="58" width="3" height="18" fill="#fff"/>
          <ellipse cx="50" cy="77" rx="10" ry="2.6" fill="#fff"/>
        </svg>
      </div>

      <h2 id="rc-title">Recuperar contraseña</h2>
      <p class="login-sub" id="rc-sub">Te enviaremos un enlace a tu correo.</p>

      <form id="rc-form" novalidate>
        <div class="field" id="rc-field-email">
          <label for="rc-email">Correo</label>
          <input id="rc-email" type="email" autocomplete="email" placeholder="tucorreo@ejemplo.com" />
        </div>
        <div class="field" id="rc-field-pass" hidden>
          <label for="rc-pass">Nueva contraseña</label>
          <input id="rc-pass" type="password" autocomplete="new-password" placeholder="Mínimo 6 caracteres" />
        </div>
        <div class="login-error" id="rc-error" hidden></div>
        <button type="submit" class="login-cta" id="rc-submit">Enviar enlace</button>
      </form>

      <a class="login-back" href="login.html">← Volver al inicio de sesión</a>
    </div>
  </main>
  <script type="module" src="js/recover.js"></script>
</body>
</html>
```

4. Crear `web/js/recover.js`:

```js
import * as api from './api.js';
import { isValidEmail } from './validators.js';

const $ = (s) => document.querySelector(s);
const token = new URLSearchParams(location.search).get('token');

const el = {
  title: $('#rc-title'), sub: $('#rc-sub'), form: $('#rc-form'),
  fieldEmail: $('#rc-field-email'), fieldPass: $('#rc-field-pass'),
  email: $('#rc-email'), pass: $('#rc-pass'),
  error: $('#rc-error'), submit: $('#rc-submit'),
};

function showError(msg) { el.error.textContent = msg; el.error.hidden = false; }
function done(msg) { el.form.hidden = true; el.sub.textContent = msg; }

if (token) {
  el.title.textContent = 'Crea tu nueva contraseña';
  el.sub.textContent = 'Elige una contraseña de al menos 6 caracteres.';
  el.fieldEmail.hidden = true;
  el.fieldPass.hidden = false;
  el.submit.textContent = 'Guardar contraseña';
}

el.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.error.hidden = true;
  el.submit.disabled = true; el.submit.textContent = 'Un momento…';
  try {
    if (token) {
      const pass = el.pass.value;
      if (pass.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
      await api.resetPassword(token, pass);
      done('¡Listo! Tu contraseña fue cambiada. Ya puedes iniciar sesión con ella.');
    } else {
      const email = el.email.value.trim();
      if (!isValidEmail(email)) throw new Error('Ingresa un correo válido.');
      await api.forgotPassword(email);
      done('Si ese correo está registrado, te enviamos un enlace para crear una nueva contraseña. Revisa tu bandeja.');
    }
  } catch (err) {
    showError(err.message || 'No se pudo conectar con el servidor.');
    el.submit.disabled = false;
    el.submit.textContent = token ? 'Guardar contraseña' : 'Enviar enlace';
  }
});
```

- [ ] **Step 10: Verificación manual (flujo completo)**

1. En `login.html` aparece "¿Olvidaste tu contraseña?" → lleva a `recover.html`.
2. Pedir el enlace con un correo registrado. Si el SMTP está configurado llega el correo; si no, copiar el enlace del log del backend (`Enlace de recuperación para …`).
3. Abrir el enlace → formulario de contraseña nueva → guardar → mensaje de éxito.
4. Iniciar sesión con la contraseña nueva → funciona. Con la vieja → "Correo o contraseña incorrectos".
5. Reusar el mismo enlace → "El enlace no es válido o ya expiró."

- [ ] **Step 11: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations backend/src/config/configuration.ts backend/src/modules/notifications/email.service.ts backend/src/modules/auth web/js/api.js web/js/recover.js web/recover.html web/login.html web/css/login.css
git commit -m "feat(web/api): recuperación de contraseña por correo con token de 1 hora (A3, A10)"
```

---

### Task 12: Verificación final

**Files:** ninguno nuevo — solo ejecución.

- [ ] **Step 1: Suites completas**

Run: `cd backend && npm test`
Expected: PASS — todos los specs (auth, catalog, reservations con stock/preview/cancel/expire, payments, notifications, reviews, register.dto, auth.reset).

Run: `cd web && npm test`
Expected: PASS — incluye `detail-mapping.test.mjs`.

- [ ] **Step 2: E2E manual (flujo del evaluador)**

Con backend + web + PostgreSQL corriendo:

1. **Registro** con contraseña de 5 caracteres → rechazado; con 6 → ok.
2. **Reserva desde el catálogo**: card → Reservar → paso 1 (tiendas con km) → paso 2 → **desglose de confirmación** → confirmar → pagar con `4242 4242 4242 4242` → factura.
3. **Reserva desde el detalle**: nombre del vino → modal → Reservar → mismo flujo (era el bug R8).
4. **Retorno post-login**: sin sesión, Reservar → login → vuelve al vino.
5. **Mis reservas**: navbar → lista con estados → cancelar una pendiente.
6. **Mapa**: modo Mapa → popup con dirección y "Cómo llegar →".
7. **Recuperar contraseña**: flujo completo del Task 11 Step 10.
8. **Vino agotado**: (con un seed que tenga alguno o cambiando un `status` en la BD) → no aparece en el select del checkout; vía API directa devuelve 400.

- [ ] **Step 3: Commit final si hubo ajustes**

```bash
git status
# si hay archivos ajustados durante la verificación:
git add -A && git commit -m "chore: ajustes de verificación final del plan de arreglos core"
```
