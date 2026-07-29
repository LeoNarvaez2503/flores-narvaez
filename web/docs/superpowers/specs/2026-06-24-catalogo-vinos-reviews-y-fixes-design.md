# CavaLocal — Catálogo de ~32.000 vinos (dataset abierto) + reseñas, y 3 arreglos de UX

**Fecha:** 2026-06-24
**Alcance:** `web/` (login, animación de tarjetas, catálogo paginado, modal de detalle con reseñas) + `backend/` (import de dataset, catálogo con paginación/búsqueda, módulo `reviews`, generación de disponibilidades).
**Estado:** aprobado por el usuario (fuente: dataset abierto; tamaño: todos ~32.000; generar disponibilidades/precios: sí).

---

## 1. Objetivo

Cuatro entregables independientes, agrupados en un solo ciclo:

1. **Bug:** apenas el usuario inicia sesión/registra, se le abre solo el checkout de reserva y parece "que ya hizo una reserva". Hay que evitarlo.
2. **Bug visual:** la animación hover de las tarjetas (más vendidos / grilla) se solapa y "se sale del sitio".
3. **Cambio de asset:** el "video" del login es en realidad un cinemagraph de 18 `.webp` que rebota (ping-pong) → se ve como un error. Reemplazar por un `<video>` real en bucle limpio (`quiero_que_el_viedo_solo_202606241350.mp4`).
4. **Feature grande:** reemplazar los 29 vinos sembrados a mano y las calificaciones inventadas por un **catálogo de ~32.000 vinos reales con sus marcas**, importados desde un **dataset abierto de vinos**, con **referencias** (ficha técnica + nota de cata profesional + puntaje de crítica) y **reseñas** (puntaje de crítica del dataset + reseñas de usuarios de CavaLocal).

Los puntos 1-3 son arreglos acotados y de bajo riesgo. El punto 4 toca import, modelo de datos, API del catálogo (paginación/búsqueda) y una reescritura del catálogo del frontend.

---

## 2. Contexto actual relevante

- **Web** (`web/`): HTML/CSS/JS con ES modules, sin build. El catálogo (`web/js/app.js`) hace `getWines()` y **carga TODOS los vinos de una vez**, luego filtra/ordena/pagina del lado del cliente y calcula la tienda más cercana por haversine. La calificación de las tarjetas es **inventada** a partir de un hash del id (`transform()` en [app.js:96-97](../../../js/app.js)).
- **Login** (`web/js/login.js`): tras autenticarse, `redirectAfterAuth()` lee el "pending return" de localStorage (`cl_return`) y, si existe `reserve:<id>`, `index.html` reabre el checkout de ese vino ([app.js init](../../../js/app.js)). El `cl_return` lo setea `reserve()` cuando un usuario no logueado clickea "Reservar". Si quedó un `cl_return` viejo, al loguear se dispara el checkout → síntoma reportado.
- **Login "video"**: `<img id="login-cine">` + `cinemagraph()` recorre 18 frames `img/pour/p00..p17.webp` en ping-pong cada 70ms.
- **Tarjetas** (`web/css/styles.css`): `.card:hover { transform: translateY(-5px); box-shadow: 0 22px 50px ...; }`. La sombra grande y el desplazamiento se montan sobre las vecinas; el contenedor de "más vendidos" no reserva espacio para el lift.
- **Backend** (`backend/`): NestJS + Prisma + PostgreSQL. Módulos: `auth`, `catalog`, `health`, `notifications`, `payments`, `reservations`. **No** hay módulo `reviews`, pero **sí** existe el modelo `Review` en `schema.prisma` (userId, targetType, wineId, rating 1-5, comment).
  - `GET /wines` (`catalog.service.listWines(q?)`) devuelve **todos** los vinos con `availabilities` incluidas, sin paginación.
  - `Wine`: name, type, wineryName, origin, grape, vintage?, tastingNote?, pairing?, denominationOfOrigin?, aging?, descriptors(Json)?, referencePrice(Decimal), verified, availabilities[], reservations[].
  - `Availability`: wineId × establishmentId (único), price, status. 8 establecimientos sembrados.
  - Reservas usan la `Availability` (vino+tienda) para precio; "primera reserva" se calcula por usuario (correcto).

---

## 3. Diseño por entregable

### 3.1 Fix — no abrir el checkout tras autenticarse

**Qué:** después de registrarse o iniciar sesión, el usuario aterriza en el catálogo normal; **no** se abre el modal de reserva automáticamente.

**Cómo:**
- `web/js/login.js` `redirectAfterAuth()`: deja de propagar el `return=reserve:` a la URL. Redirige siempre a `index.html`. Además limpia cualquier `cl_return` pendiente (consumirlo y descartarlo).
- `web/js/app.js` `init()`: elimina el bloque que, ante `?return=reserve:<id>`, reabre el checkout. (Se conserva el resto del flujo de reserva normal disparado por click en "Reservar" estando logueado.)
- `web/js/store.js`: sin cambios de API; `takePendingReturn()` sigue existiendo por si se reutiliza, pero ya no alimenta el auto-open.

**Resultado:** clickear "Reservar" sin sesión sigue mandando al login, pero al volver el usuario ve el catálogo (no un checkout sorpresa). El flujo de reserva se inicia solo con un click explícito en "Reservar" estando logueado.

**Interfaz/límite:** unidad = "qué hace el login al terminar". Entrada: sesión válida. Salida: navegación a `index.html`. Sin dependencia del estado de reservas.

### 3.2 Fix — animación hover de tarjetas

**Qué:** el hover ya no se solapa ni desborda.

**Cómo (solo `web/css/styles.css`):**
- Reducir la sombra de hover a una contenida (p. ej. `0 10px 24px rgba(42,32,36,0.16)`), manteniendo el `translateY(-5px)`.
- Garantizar espacio para el lift: el contenedor de "más vendidos" (`#bestsellers` / su carrusel) y `.grid` reservan padding superior/inferior suficiente y no recortan el lift (`overflow: visible` donde corresponda, sin romper el layout horizontal del carrusel).
- Verificar que en `.card.mini` (tarjetas TOP del carrusel) el `transform` no empuje el contenido fuera del viewport del carrusel.

**Interfaz/límite:** puramente presentacional; no toca JS ni datos.

### 3.3 Cambio de asset — video del login

**Qué:** bucle limpio de una copa llenándose.

**Cómo:**
- Mover `quiero_que_el_viedo_solo_202606241350.mp4` (raíz) a `web/assets/login-pour.mp4`.
- `web/login.html`: reemplazar `<img id="login-cine">` por
  `<video id="login-cine" class="login-aside-img" src="assets/login-pour.mp4" autoplay muted loop playsinline preload="auto" poster="img/pour/p00.webp"></video>`.
- `web/js/login.js`: eliminar la IIFE `cinemagraph()`. Respetar accesibilidad: si `prefers-reduced-motion: reduce`, no autoreproducir (pausar y dejar el `poster`).
- `web/css/login.css`: mantener `.login-aside-img { object-fit: cover; ... }` (sirve igual para `<video>`).

**Interfaz/límite:** unidad = "media del aside del login". Sin dependencia de datos.

### 3.4 Feature — catálogo de ~32.000 vinos con marcas + reseñas

#### 3.4.1 Fuente de datos

Dataset abierto de reseñas de vinos (winemag), que incluye **marca/bodega (`winery`)**, título, país, provincia/región, variedad, puntaje (`points`, 80-100) y descripción profesional. Se descarga (CSV; si la copia disponible es Parquet, se convierte a CSV una vez durante la implementación) y se normaliza. Fallback documentado: `alfredodeza/wine-ratings` (CSV, 32.780 filas: name, region, variety, rating, notes) si la copia con `winery` no estuviera disponible; en ese caso la marca se deriva del nombre.

Licencia: datos de uso académico/demostración (proyecto de cátedra). Se cita la fuente en el script de import.

#### 3.4.2 Import (script idempotente)

Ubicación: `backend/prisma/import-wines.ts` (ejecutable con `ts-node`/script npm), separado del `seed.ts` (que mantiene usuarios/establecimientos).

Pasos:
1. Leer el CSV normalizado.
2. **Deduplicar** por (name + winery + vintage) y filtrar filas sin marca o sin datos mínimos. Objetivo ~32.000 vinos limpios.
3. **Mapear** cada fila a `Wine`:
   - `name` ← título del vino.
   - `wineryName` ← `winery` (marca). (Fallback: primeras 1-3 palabras del nombre.)
   - `grape` ← `variety`.
   - `type` ← derivado de `variety`/color por tabla de mapeo (Tinto/Blanco/Espumante/Rosado/Fortificado; default Tinto).
   - `origin` ← `"{región/provincia}, {país}"`.
   - `vintage` ← año parseado del título si existe, si no `null`.
   - `tastingNote` ← descripción profesional (la "reseña/referencia" experta).
   - `referencePrice` ← precio del dataset; si falta, derivado de `points`/variedad con una fórmula simple y acotada.
   - `criticScore` (**campo nuevo**) ← `points`.
   - `verified` ← `true` (datos de fuente curada).
4. Insertar en lotes (`createMany`/transacciones por chunks) para 32k filas.
5. **Generar disponibilidades** (aprobado): para cada vino, asignarlo a **2-4** de los 8 establecimientos, con `price = referencePrice ± variación` (p. ej. ±8%) y `status` mayormente `DISPONIBLE` (una fracción `ULTIMAS`/`AGOTADO`). Respeta el único `(wineId, establishmentId)`. ~3 × 32k ≈ ~100k filas de `Availability`. Así **todo vino importado es reservable** y conserva precio/comparación/cercanía.
6. Idempotencia: limpiar vinos importados previos (marca de origen en `descriptors.source = "winemag"`) o `upsert` por clave natural, para poder re-correr sin duplicar.

#### 3.4.3 Modelo de datos / migración

- **`Wine`**: agregar `criticScore Int?` y un índice por `criticScore` (para ordenar por calificación) y por `wineryName` (filtro por marca). `descriptors` guarda `{ source: "winemag" }` para idempotencia.
- **`Review`**: ya existe; agregar restricción de **una reseña por usuario por vino** (índice único `(userId, wineId)` cuando `targetType = WINE`) — implementado a nivel servicio (validación) y, si el motor lo permite limpio, índice parcial.
- Migraciones Prisma nuevas + `generate`.

#### 3.4.4 Backend — catálogo con paginación/búsqueda

`GET /wines` evoluciona a (todos los parámetros opcionales):
`?q&type&country&grape&priceMin&priceMax&sort&page&pageSize`
- `sort`: `relevancia` (default), `precio_asc`, `precio_desc`, `calificacion` (por `criticScore`, ya que la mayoría de vinos no tendrá reseñas de usuarios aún), `nombre`.
- Respuesta: `{ items: WineCard[], total, page, pageSize }`.
- `pageSize` default 24, máx 60.
- `WineCard` incluye: id, name, wineryName, type, grape, origin, vintage, criticScore, `referencePrice`, `bestPrice` (mínimo de sus availabilities), `storeCount`, `avgRating`+`reviewCount` (agregado de reseñas de usuarios), y una lista corta de ofertas (tienda, precio) para comparar. La **distancia** a tienda se calcula en el cliente sobre los ≤60 ítems de la página (barato).
- `GET /wines/:id`: detalle completo (todas las availabilities + ficha técnica + criticScore + tastingNote).
- **Categorías / más vendidos** server-side:
  - `GET /wines/facets` → conteos por `type`/`country`/`grape` (Prisma `groupBy`) para la barra de categorías y filtros.
  - `GET /wines/bestsellers` → top N por `criticScore` (o por nº de reseñas) para el carrusel "más vendidos".
- Índices en `Wine` (name, type, country/origin, grape, criticScore, referencePrice) para que las consultas sobre 32k sean rápidas.

#### 3.4.5 Backend — módulo `reviews` (nuevo)

Capas: `ReviewsController → ReviewsService → Prisma`. DTOs con `class-validator`.
- `GET /wines/:id/reviews?page&pageSize` (público): lista paginada de reseñas de usuarios del vino + agregado `{ avgRating, reviewCount }`.
- `POST /reviews` (JwtAuthGuard): body `{ wineId, rating: 1-5, comment? }`. Una por usuario por vino (si existe, 409 o upsert — se define upsert para permitir editar). Devuelve la reseña y el nuevo agregado.
- El `CatalogService` consume el agregado para `avgRating`/`reviewCount` en las tarjetas (join/groupBy eficiente, no N+1).

#### 3.4.6 Frontend — catálogo paginado + detalle con reseñas

- **`web/js/api.js`**: `getWines(params)` pasa a aceptar query (q/filtros/sort/page) y devolver `{ items, total, page }`. Nuevos wrappers: `getWine(id)`, `getWineReviews(id, page)`, `createReview({wineId, rating, comment})`, `getFacets()`, `getBestsellers()`.
- **`web/js/app.js`**:
  - `loadWines()` y `render()` dejan de cargar todo. El estado guarda `page`, `total`, filtros y `sort`; cada cambio de búsqueda/filtro/orden **vuelve a pedir** al backend y renderiza la página. Navegación por "Cargar más" (append) o paginador.
  - `transform()`: elimina la calificación inventada (hash). Usa `criticScore` y `avgRating/reviewCount` reales. Si no hay reseñas de usuarios: "Sin reseñas aún"; siempre muestra el puntaje de crítica si existe.
  - Distancia/tienda más cercana: se calcula sobre los ítems de la página actual (ya vienen con sus ofertas).
  - Categorías, filtros y "más vendidos" se alimentan de `getFacets()`/`getBestsellers()`.
  - `data-detail`: abre el **modal de detalle** (hoy es no-op).
- **Modal de detalle** (`web/js/detail.js` nuevo + estilos): al clickear una tarjeta:
  - **Referencias**: marca, variedad, origen, añada, denominación, puntaje de crítica y nota de cata profesional.
  - **Ofertas**: precios por tienda + "reservar" (reusa `openCheckout`).
  - **Reseñas de usuarios**: lista (`getWineReviews`) + formulario "Dejar reseña" (estrellas 1-5 + comentario) visible solo con sesión; al enviar, `createReview` y refresca el agregado.

---

## 4. Flujo de datos (feature 4)

```
[dataset abierto winemag CSV]
        │  import-wines.ts (normaliza, deduplica, mapea, lotea)
        ▼
   PostgreSQL: Wine (+criticScore) ──< Availability (2-4 tiendas, precio ± var)
        │
        │  GET /wines?q&filtros&sort&page    GET /wines/facets   GET /wines/bestsellers
        ▼
   CatalogService (paginación + agregado avgRating/reviewCount)
        │
        ▼
   web/js/app.js (catálogo paginado)  ── click ──▶  detail.js (referencias + reseñas)
        │                                              │ POST /reviews (login)
        └── "Reservar" ──▶ checkout.js ──▶ POST /reservations (usa Availability)
```

---

## 5. Manejo de errores

- **Import**: filas inválidas se saltan y se cuentan (log de "N importados, M descartados"); el script es re-ejecutable sin duplicar.
- **Catálogo**: si el backend no responde, el front muestra estado vacío con reintento (ya existe patrón `try/catch` en `loadWines`). `pageSize` se clampa server-side.
- **Reseñas**: validación 1-5 y longitud de comentario; sin sesión, 401; duplicada, upsert (no error). El front deshabilita el botón mientras envía.
- **Reserva**: sin cambios; sigue exigiendo `Availability` válida (ahora existe para todo vino importado).

---

## 6. Testing

- **Backend (unit, sin DB):** mapeo dataset→Wine (tipos derivados de variedad, precio fallback, parse de añada); `computeAmounts` intacto; agregado de reseñas; paginación (límites de `page`/`pageSize`).
- **Backend (servicio reviews):** crear/listar, una-por-usuario (upsert), validación de rating.
- **Import:** correr contra una muestra pequeña del CSV (p. ej. 200 filas) y verificar conteos, dedup e idempotencia (re-correr no duplica).
- **Frontend (manual/humo):** login no abre checkout; hover no desborda; video en bucle limpio; catálogo pagina y filtra; detalle muestra referencias + reseñas; dejar reseña actualiza el promedio.

---

## 7. Unidades y límites (diseño para aislamiento)

- **`import-wines.ts`**: qué hace = poblar Wine+Availability desde CSV; uso = script npm; depende de = CSV + Prisma. Aislado del runtime de la app.
- **`CatalogService`**: qué hace = búsqueda/paginación/facetas/bestsellers + agregado de reseñas; uso = controllers; depende de = Prisma. Sin lógica de UI.
- **`ReviewsService`**: qué hace = CRUD de reseñas + agregado; uso = ReviewsController y CatalogService; depende de = Prisma.
- **`web/js/detail.js`**: qué hace = render del modal de detalle (referencias + reseñas + form); uso = click en tarjeta; depende de = api.js, checkout.js. No conoce internals del catálogo.
- **`web/js/app.js` (catálogo)**: orquesta estado de página/filtros y pide al backend; no calcula calificaciones ni carga todo en memoria.

---

## 8. Riesgos / decisiones tomadas

- **GWDB descartada**: su API no es de autoservicio (requiere acuerdo) y no trae reseñas; documentado tras verificación.
- **Open Food Facts descartada como base**: API abierta real pero data de vinos sucia (verificado en vivo).
- **Precios/tiendas sintéticos**: aprobado generar disponibilidades para que reservas/cercanía funcionen con 32k vinos. Los precios son del dataset ± variación (no precios reales de comercios venezolanos); aceptable para demo académica.
- **Rendimiento**: 32k vinos obligan a paginación/búsqueda/índices server-side; el front ya no carga todo en memoria.
- **Marca**: si la copia del dataset con columna `winery` no está accesible, se usa el fallback con marca derivada del nombre (calidad algo menor). Decisión: priorizar la copia con `winery`.

---

## 9. Orden sugerido de implementación

1. Arreglos rápidos e independientes: 3.1 (login), 3.2 (hover), 3.3 (video).
2. Backend datos: migración (`criticScore`, índices), `import-wines.ts`, generación de disponibilidades.
3. Backend API: catálogo paginado + facets + bestsellers; módulo `reviews`.
4. Frontend: catálogo paginado + calificaciones reales; modal de detalle con reseñas.
5. Pruebas (unit backend + humo manual).
