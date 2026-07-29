# CavaLocal — Diseño del Backend (Esqueleto + Núcleo Funcional)

- **Fecha:** 2026-06-21
- **Estado:** Aprobado (diseño)
- **Alcance:** Backend (API REST) + base de datos PostgreSQL. **No** incluye la app móvil ni el panel web (frontends que consumen este API). **No** se modifica la landing estática existente (`index.html`, `index.css`, `main.js`, `assets/`).
- **Metodología:** Cascada — fases secuenciales (infra → modelo de datos → módulos núcleo → stubs → pulido), cada una verificable antes de pasar a la siguiente.

---

## 1. Objetivo

Construir el **esqueleto** del backend de CavaLocal con:

- Arquitectura **modular** y criterio **SOLID**.
- **Endpoints debugueables** (Swagger, health, logging, errores uniformes, seed).
- **Núcleo funcional** conectado a PostgreSQL en los módulos centrales; el resto como **stubs estructurados** (estructura completa + interfaces + `TODO`), listos para implementarse en fases posteriores.

CavaLocal es un marketplace intermediario de vinos: no tiene inventario propio; conecta consumidores con establecimientos y monetiza por comisiones, membresías, publicidad, Premium y reportes.

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Lenguaje | TypeScript |
| Framework | NestJS |
| Base de datos | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (access token) + bcrypt |
| Validación | class-validator / class-transformer (ValidationPipe global) |
| Docs/Debug | Swagger / OpenAPI (`/docs`) |
| Config | @nestjs/config con validación de `.env` al arranque |
| Tests | Jest (scaffold) |

Justificación: NestJS aporta modularidad e inyección de dependencias nativas (alineado con SOLID y "ordenado por módulos"); Swagger automático hace los endpoints debugueables desde el navegador; TypeScript permite reutilizar tipos con una eventual app React Native.

---

## 3. Arquitectura por capas (SOLID)

Cada módulo sigue el flujo:

```
HTTP Request
  → Controller   (rutas, valida DTO, Swagger; sin lógica de negocio)
  → Service      (lógica de negocio; depende de la INTERFAZ del repositorio)
  → Repository   (acceso a datos; implementación Prisma detrás de una interfaz)
  → PostgreSQL   (vía PrismaService global)
```

**Mapeo SOLID:**

- **S (SRP):** controller = HTTP; service = negocio; repository = datos.
- **O (OCP):** comportamiento extensible agregando providers, sin modificar services.
- **L (LSP):** las implementaciones Prisma respetan el contrato de la interfaz; sustituibles por mocks en tests.
- **I (ISP):** interfaces de repositorio/servicio chicas y específicas por módulo.
- **D (DIP):** los services dependen de un **token de interfaz** inyectado por DI (`provider { provide: TOKEN, useClass: PrismaRepo }`), no de Prisma directamente.

---

## 4. Estructura de carpetas

El backend vive en una carpeta nueva y aislada `backend/` (la landing existente no se toca).

```
backend/
├─ src/
│  ├─ main.ts                 # bootstrap: Swagger, ValidationPipe global, filtros, interceptores
│  ├─ app.module.ts
│  ├─ config/
│  │  ├─ configuration.ts
│  │  └─ env.validation.ts
│  ├─ prisma/
│  │  ├─ prisma.module.ts     # @Global
│  │  └─ prisma.service.ts    # connect/disconnect lifecycle + query logging en dev
│  ├─ common/
│  │  ├─ filters/http-exception.filter.ts      # sobre de error uniforme
│  │  ├─ interceptors/logging.interceptor.ts   # método, ruta, status, ms
│  │  ├─ interceptors/transform.interceptor.ts # envelope de respuesta
│  │  ├─ guards/jwt-auth.guard.ts
│  │  ├─ guards/roles.guard.ts                 # RBAC
│  │  ├─ decorators/current-user.decorator.ts
│  │  ├─ decorators/roles.decorator.ts
│  │  └─ dto/pagination.dto.ts
│  └─ modules/
│     ├─ health/  auth/  users/  catalog/  establishments/
│     ├─ availability/  search/  geolocation/  reviews/  admin/
│     └─ content/ recommendations/ orders/ payments/ b2b/ reports/ notifications/
├─ prisma/
│  ├─ schema.prisma
│  ├─ seed.ts
│  └─ migrations/
├─ test/
├─ requests.http              # peticiones listas para debuggear (VS Code REST Client)
├─ .env.example
├─ README.md
├─ tsconfig.json
├─ nest-cli.json
└─ package.json
```

**Forma de un módulo núcleo** (ejemplo `catalog/`):

```
catalog/
├─ catalog.module.ts
├─ catalog.controller.ts
├─ catalog.service.ts
├─ catalog.repository.ts             # implementación Prisma de ICatalogRepository
├─ catalog.repository.interface.ts   # contrato + token de inyección (DIP)
└─ dto/
   ├─ create-wine.dto.ts
   ├─ update-wine.dto.ts
   ├─ query-wine.dto.ts
   └─ wine-response.dto.ts
```

---

## 5. Módulos: núcleo funcional vs stub

🟢 = lógica real contra Postgres · 🟡 = estructura SOLID completa + Swagger + interfaces + `TODO`.

| Módulo | RF cubiertos | Estado |
|---|---|---|
| auth + users | RF-01, RF-02, RF-03, RF-04 | 🟢 Núcleo |
| catalog (vinos) | RF-05, RF-06, RF-08, RF-09 | 🟢 Núcleo |
| establishments | RF-07, RF-28, RF-32 | 🟢 Núcleo |
| availability | RF-07, RF-09, RF-18 | 🟢 Núcleo |
| search | RF-10, RF-11, RF-12, RF-13 | 🟢 Núcleo |
| geolocation | RF-14, RF-15, RF-16, RF-18 | 🟢 Núcleo (Haversine) |
| reviews | RF-19, RF-20 | 🟢 Núcleo |
| admin | RF-08 | 🟢 Núcleo parcial (verificación de catálogo) |
| content (sumiller/educativo) | RF-22, RF-23 | 🟡 Stub |
| recommendations | RF-21 | 🟡 Stub |
| orders (reserva/pickup/delivery) | RF-24, RF-25, RF-27 | 🟡 Stub (comisión 7% + tarifa/km en el modelo) |
| payments (pasarela) | RF-26, RF-38 | 🟡 Stub (interfaz `PaymentGateway`) |
| b2b (métricas/ads/fidelización) | RF-29, RF-30, RF-31 | 🟡 Stub |
| reports (BI) | RF-33, RF-34, RF-35 | 🟡 Stub (agregado/anónimo) |
| notifications | RF-36, RF-37 | 🟡 Stub (alertas/push/referidos) |
| geolocation — rutas (RF-17) | RF-17 | 🟡 Stub (proxy a API de mapas externa) |

### Endpoints núcleo (resumen)

- **auth:** `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.
- **users:** `GET/PATCH /users/me`, `PUT /users/me/preferences`, `PATCH /users/me/membership`.
- **catalog:** `GET /wines`, `GET /wines/:id`, `POST /wines`, `PATCH /wines/:id`, `DELETE /wines/:id`, `PATCH /wines/:id/verify` (admin).
- **establishments:** `GET /establishments`, `GET /establishments/:id`, `POST /establishments`, `PATCH /establishments/:id`.
- **availability:** `GET /wines/:id/availability`, `PUT /availability` (upsert vino↔local), `PATCH /availability/:id/price`, `PATCH /availability/:id/status`.
- **search:** `GET /search/wines?grape=&region=&priceMin=&priceMax=&q=&sort=price|distance&lat=&lng=`, `GET /search/wines/:id/compare` (precios entre locales).
- **geolocation:** `GET /geo/establishments/nearby?lat=&lng=&radiusKm=`, `GET /geo/wines/nearby?wineId=&lat=&lng=`.
- **reviews:** `POST /reviews`, `GET /reviews?targetType=&targetId=`, `GET /reviews/summary?targetType=&targetId=`.
- **admin:** `GET /admin/wines/unverified`, `PATCH /admin/wines/:id/verify`.
- **health:** `GET /health`.

Los módulos stub exponen sus rutas con `@ApiOperation` documentado y devuelven `501 Not Implemented` o un placeholder marcado, con la interfaz de servicio/repositorio ya definida.

---

## 6. Modelo de datos (Prisma)

Enums: `UserRole {CONSUMER, ESTABLISHMENT, SOMMELIER, ADMIN}`, `MembershipTier {GRATUITO, PREMIUM}`, `EstablishmentType {LICORERIA, BODEGON, SUPERMERCADO, RESTAURANTE, BODEGA, IMPORTADOR}`, `EstablishmentTier {BASICA, DESTACADA}`, `AvailabilityStatus {DISPONIBLE, AGOTADO}`, `ReviewTarget {WINE, ESTABLISHMENT}`, `OrderType {RESERVA, PICKUP, DELIVERY}`, `OrderStatus {PENDIENTE, CONFIRMADA, COMPLETADA, CANCELADA}`.

**Entidades:**

- **User** — id, email (unique), phone (unique, opcional), passwordHash, name, role, membershipTier, createdAt, updatedAt.
- **UserPreference** — id, userId (unique), grapes `String[]`, regions `String[]`, budgetMin, budgetMax.
- **Establishment** — id, name, type, lat (Float), lng (Float), address, membershipTier, contactPhone, contactEmail, authorized (Boolean, RNF-13), ownerUserId (opcional), createdAt.
- **Wine** — id, name, type, wineryName, origin, grape, vintage (Int), tastingNote (Text), pairing, denominationOfOrigin, aging, descriptors (Json: `{ tannins, body, ... }`), referencePrice (Decimal), verified (Boolean), createdAt.
- **Availability** — id, wineId, establishmentId, price (Decimal), status, updatedAt · **@@unique([wineId, establishmentId])**.
- **Review** — id, userId, targetType, wineId?, establishmentId?, rating (Int 1–5), comment (Text), createdAt.
- **Order** *(stub)* — id, userId, establishmentId, type, amount (Decimal), commission (Decimal, 7%), deliveryFee (Decimal), status, createdAt.
- **Subscription** *(stub)* — id, userId?, establishmentId?, plan, status, startedAt, renewsAt (Premium / Bodega Destacada).
- **Content** *(stub)* — id, wineId?, type, body (Text), authorId.
- **B2BReport** *(stub)* — id, scope, period, dataJson (Json, agregado/anónimo).
- **Notification** *(stub)* — id, userId, type, payload (Json), readAt.
- **Referral** *(stub)* — id, referrerUserId, referredEmail, status.

**Relaciones clave:** Wine 1—N Availability N—1 Establishment; User 1—1 UserPreference; User 1—N Review; Wine/Establishment 1—N Review (polimórfico por `targetType`).

**Geolocalización:** `lat`/`lng` como `Float`. Distancia por **fórmula de Haversine** en consulta `$queryRaw` (`6371 * acos(...)`), con filtro por radio y orden por distancia. PostGIS anotado como mejora futura (no requerido en el esqueleto).

---

## 7. Debuggability

1. **Swagger UI en `/docs`** — explorar y ejecutar cada endpoint; esquemas DTO documentados.
2. **`GET /health`** — estado del servicio + ping a la DB.
3. **LoggingInterceptor** — log de método, ruta, status y tiempo (ms) por request.
4. **HttpExceptionFilter** — error uniforme: `{ statusCode, message, error, path, timestamp, requestId }`.
5. **Request-ID** por petición, propagado en logs y en el sobre de error.
6. **Prisma query logging** activable en dev (`log: ['query','error','warn']`).
7. **`seed.ts`** — vinos, establecimientos, disponibilidad y usuarios de ejemplo: ningún endpoint responde vacío.
8. **`requests.http`** — colección de peticiones de ejemplo lista para ejecutar.

---

## 8. Seguridad y cumplimiento

- **Auth JWT** (access token; refresh opcional, fuera del MVP del esqueleto). Passwords con **bcrypt**.
- **RBAC** vía `@Roles()` + `RolesGuard` (CONSUMER / ESTABLISHMENT / SOMMELIER / ADMIN).
- **ValidationPipe global** (`whitelist: true`, `transform: true`) sobre todos los DTO (RNF-10).
- `authorized` en Establishment para operar solo con locales habilitados (RNF-13).
- `.env` validado al arranque; secretos (JWT, DB URL) fuera del código (RNF-12 base).
- CORS configurable por entorno.

---

## 9. Plan en cascada (fases)

| Fase | Contenido | Verificación |
|---|---|---|
| 0 — Infra | Scaffold NestJS, config + validación `.env`, PrismaModule/Service, `/health`, Swagger | `GET /health` responde y `/docs` carga |
| 1 — Modelo de datos | `schema.prisma` completo, migración inicial, `seed.ts` | `prisma migrate` + `seed` corren sin error |
| 2 — auth + users | Registro/login JWT, perfil, preferencias, membresía | Login devuelve token; `GET /auth/me` con token |
| 3 — catalog | CRUD de vinos + verificación + precio referencia | CRUD funciona contra DB |
| 4 — establishments | Alta/edición, tipo, ubicación, nivel membresía | CRUD funciona contra DB |
| 5 — availability | Upsert vino↔local, precio/estado dinámicos | Upsert + actualización reflejan en DB |
| 6 — search + geolocation | Filtros, orden, comparación de precios, cercanía (Haversine) | Búsqueda y `nearby` devuelven resultados ordenados |
| 7 — reviews | Reseñas/ratings + agregados | Crear reseña + summary correctos |
| 8 — admin | Verificación de catálogo | Listar no verificados + verificar |
| 9 — stubs | content, recommendations, orders, payments, b2b, reports, notifications, rutas | Rutas documentadas en Swagger; interfaces definidas |
| 10 — pulido | Filtros/interceptores/guards finales, `requests.http`, `README` | App levanta limpia; debug operativo |

---

## 10. Fuera de alcance (YAGNI para el esqueleto)

- App móvil y panel web (frontends).
- Integración real con pasarela de pago y APIs de mapas (solo interfaces/stubs).
- Motor de recomendaciones/ML y generación real de reportes BI.
- Refresh tokens, rate limiting avanzado, multi-tenancy.
- PostGIS (Haversine cubre el esqueleto).

Estas piezas tienen su interfaz/punto de extensión definido para implementarse en fases posteriores sin rediseñar el núcleo (RNF-07).
