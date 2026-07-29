# CavaLocal — Reimaginación del front: login inmersivo, reserva con seña, pago y factura por correo

**Fecha:** 2026-06-21
**Estado:** Diseño aprobado (pendiente de revisión final del usuario)
**Alcance:** frontend `web/` (centro del trabajo) + backend `backend/` (NestJS) para correo real y persistencia.

---

## 1. Objetivo

Reimaginar el frontend oficial de CavaLocal (`web/`, HTML/CSS/JS puro) para que se vea **sublime** y, sobre el modelo intermediario del negocio, incorporar:

1. **Quitar la ubicación** (`Caracas · Chacao`) del topbar.
2. **Mover el descuento del 5%** del topbar/banner a la **sección de pago** (se aplica en el checkout como línea "−5% primera reserva").
3. **Plataforma de pago** mediante un flujo **Reserva + Seña online** (seña 20% online, saldo 80% al retirar en tienda).
4. **Factura emitida al correo REAL del usuario** (Nodemailer + Gmail SMTP).
5. **Login no genérico**: página completa partida e inmersiva, con "Entrar con Google" (real), mostrar/ocultar contraseña y validación en vivo.
6. **Banners promocionales** en la página principal: carrusel rotador + tiles secundarios, **cada uno con una foto diferente** (reutilizando frames distintos de la landing).

### Decisiones tomadas con el usuario
- **Arquitectura:** Enfoque A — backend NestJS completo (módulos reales + Postgres), no mock de navegador.
- **Correo:** real, vía **Gmail SMTP (Nodemailer)** con la cuenta del usuario (contraseña de aplicación).
- **Pago:** **simulado** (no cobra dinero real); el formulario valida y "aprueba" en modo prueba.
- **Flujo:** **Reserva + seña online** (no carrito multi-ítem).
- **Login:** **página partida inmersiva** con **Google real** (Google Identity Services + Client ID).
- **Seña:** **20% online / 80% al retirar**.

### No-objetivos (YAGNI)
- No tocar la **landing** de la raíz (`index.html`/`main.js` de marketing). Solo se trabaja en `web/` y `backend/`.
- No carrito multi-ítem ni pasarela de pago real (Stripe/MercadoPago).
- No generación de PDF con librería pesada: la factura es **HTML** (email enriquecido + vista imprimible en el front).
- No panel B2B ni reportes BI en este spec.

---

## 2. Arquitectura general

```
Navegador (web/)                         Backend NestJS (backend/)            Servicios
─────────────────                        ─────────────────────────           ─────────
login.html  ──/auth/login|register|google──▶  AuthModule  ──▶ Prisma/Postgres
index.html  ──/wines────────────────────▶  CatalogModule ──▶ Prisma/Postgres
  └─ checkout overlay
       ├─ POST /reservations ───────────▶  ReservationsModule ─▶ Postgres
       └─ POST /reservations/:id/pay ───▶  PaymentsService (simulado)
                                              └─▶ NotificationsModule ──▶ Gmail SMTP (Nodemailer) ──▶ correo del usuario
```

Se respeta la arquitectura por capas existente del backend: **Controller → Service → Repository (interfaz) → Prisma**, criterio SOLID.

---

## 3. Frontend (`web/`)

### 3.1 Módulos de JS (split enfocado, ES modules)
El `app.js` actual (IIFE monolítico) se separa en módulos pequeños con responsabilidad única. Es un split **al servicio de esta tarea** (se agrega checkout y se mueve el auth a página propia), no un refactor gratuito:

| Archivo | Responsabilidad | Depende de |
|---|---|---|
| `js/api.js` | Base URL, headers con token, wrappers `login/register/google/createReservation/payReservation/myReservations`. Única puerta al backend. | — |
| `js/store.js` | Estado de sesión (token/user en `localStorage`, claves existentes `cl_token`/`cl_user`) y helpers. | — |
| `js/app.js` | Catálogo: carga `/wines`, render de carrusel/catbar/bestsellers/filtros/grilla/comparar/mapa, búsqueda. (Se le **quita** todo el código del modal de auth). | api, store, checkout, carousel |
| `js/carousel.js` | Carrusel de banners promocionales (auto-rotación, flechas, puntos, swipe, pausa al hover). | — |
| `js/checkout.js` | Overlay multipaso de reserva→datos→pago→confirmación. Llama a `api`. | api, store |
| `js/login.js` | Lógica de la página de login partida (validación en vivo, mostrar/ocultar, Google Identity Services). | api, store |

> Nota: se sirve con `http-server`; los `type="module"` funcionan en `http://`. Si el usuario abriera por `file://` no cargarían, pero el flujo oficial es `http-server`.

### 3.2 Reimaginación visual ("sublime")
- **Topbar:** se elimina la ubicación y el mensaje de descuento. Queda una barra slim elegante con una frase de marca (p. ej. *"Vinos seleccionados · Reservá y retirá cerca de ti"*) o se reduce al mínimo.
- **Banner promo del 5%** (`.promo-strip`) y mención en topbar: **se quitan**; el 5% reaparece en el checkout.
- **Elevación estética** guiada por la skill `frontend-design` durante la construcción: ritmo tipográfico (Playfair Display + Inter ya presentes), micro-interacciones en tarjetas/botones (hover, focus, transición de elevación), hero más premium, uso intencional de burdeos/dorado/crema, espaciados y sombras coherentes con las variables CSS existentes (`--wine`, `--gold`, `--cream`, etc.). Se mantiene la identidad de marca (pin con copa) y la estructura 212 Global.
- **Accesibilidad:** foco visible, `aria-label` en botones de íconos, contraste suficiente, navegación por teclado en el checkout y el login.

### 3.2.1 Banners promocionales en la página principal (carrusel)
Requisito del usuario: en el menú principal, **banners promocionales con fotos diferentes** (reutilizando los frames de la landing, pero distintos entre sí).

- **Carrusel principal (hero rotador):** reemplaza/eleva el hero actual. 3–5 slides a todo el ancho, cada uno con **una foto diferente**, kicker + título + subtítulo + CTA (`data-cat`/`data-open`). Auto-rota cada ~5 s, con **flechas**, **puntos indicadores**, pausa al hover, swipe en móvil y respeto a `prefers-reduced-motion` (si está activo, no auto-rota).
- **Fila de banners secundarios:** debajo, 2–3 tiles promocionales más chicos (p. ej. "Nacionales", "Espumantes para celebrar", "Ofertas"), **cada uno con su propia foto distinta**.
- **Origen de las imágenes:** se copian **frames distintos y separados en la secuencia** desde `assets/frames/` (286 disponibles, `frame-0000`…`frame-0285`) hacia `web/img/` con nombres descriptivos (`promo-1.webp`, `promo-2.webp`, … / `tile-*.webp`). Se eligen tomas visualmente diferentes (espaciadas, p. ej. ~frames 20/80/140/200/260) y se afina la selección final con la skill `frontend-design`. Se conservan los `hero-*.webp` actuales como opciones.
- **Accesibilidad/perf:** `alt` descriptivo por slide; primera imagen con prioridad de carga, resto diferido; overlay para contraste del texto.
- Render por JS (en `app.js` o un pequeño `js/carousel.js`) a partir de un array de slides configurable.

### 3.3 Login — página partida inmersiva (`login.html`, `css/login.css`, `js/login.js`)
- Layout 2 columnas (en desktop). **Izquierda:** imagen de viñedo/copa a sangre, overlay burdeos, logo + frase de marca, micro-animación de entrada (fade/slide suave por CSS). **Derecha:** tarjeta de formulario.
- **Formulario:** alterna *Iniciar sesión* / *Crear cuenta* sin recargar; campos correo + contraseña (+ nombre en registro).
- **Interacciones:** botón mostrar/ocultar contraseña; **validación en vivo** (formato de correo, fuerza/longitud de contraseña); estados de error y éxito cuidados; botón con estado de carga.
- **"Entrar con Google" (real):** Google Identity Services (GIS) en el front con el `GOOGLE_CLIENT_ID`; al obtener el `credential` (ID token) se hace `POST /auth/google`. El backend verifica el token, crea/vincula el usuario y devuelve el JWT.
- **Éxito:** guarda `cl_token`/`cl_user` en `localStorage` y redirige a `index.html` (o a `?return=` si venía del checkout).
- **Responsive:** en móvil, la imagen pasa a una franja superior y el formulario debajo.

### 3.4 Flujo de reserva + pago (overlay en `checkout.js`)
Disparador: botón **"Reservar"** de una tarjeta de vino.
- Si **no hay sesión** → redirige a `login.html?return=reserve:<wineId>` (tras loguear, vuelve y reabre el checkout de ese vino).
- Si **hay sesión** → abre overlay multipaso:

1. **Reserva:** muestra el vino; selector de **tienda** (por defecto la más barata de `w.offers`, se puede cambiar); selector de **cantidad** (1–6).
2. **Tus datos:** nombre y correo precargados desde `cl_user` (editables), teléfono, fecha de retiro (date picker, mínimo hoy).
3. **Pago (seña):** método **tarjeta** con formulario simulado y validación linda (número con formato y Luhn, vencimiento MM/AA no vencido, CVV 3–4 dígitos, titular). **Resumen de orden:**
   - Subtotal = precio tienda × cantidad
   - **−5% primera reserva** (si aplica)
   - **Total**
   - **Seña a pagar ahora = 20% del total**
   - Saldo a pagar al retirar = 80% del total
4. **Confirmación:** "¡Reserva confirmada! Código **#CL-XXXXXX**. Te enviamos la factura a **<correo>**." Vista previa de la factura + botón **"Descargar/Imprimir factura"** (`window.print` sobre una vista imprimible, sin librería pesada).

Llamadas: paso 3 hace `POST /reservations` (crea pendiente, devuelve montos + `id` + `invoiceNumber`) y luego `POST /reservations/:id/pay` (simula pago, confirma, dispara correo, devuelve factura).

### 3.5 Manejo de errores (front)
- Backend caído → mensajes amables (patrón ya usado: "No se pudo conectar con el servidor").
- Validación de tarjeta/campos → inline, sin avanzar de paso.
- Si el correo no se pudo enviar (lo informa el backend) → confirmación igual válida + aviso "no pudimos enviar el correo, podés descargar la factura".
- Token de Google inválido → mensaje claro en el login.

---

## 4. Backend (`backend/`, NestJS + Prisma)

### 4.1 Prisma — modelo nuevo
```prisma
model Reservation {
  id             String   @id @default(cuid())
  invoiceNumber  String   @unique          // p.ej. "CL-000123"
  userId         String
  wineId         String
  establishmentId String
  quantity       Int
  unitPrice      Decimal  @db.Decimal(10,2)
  subtotal       Decimal  @db.Decimal(10,2)
  discountPct    Int      @default(0)       // 5 si primera reserva, si no 0
  discountAmount Decimal  @db.Decimal(10,2)
  total          Decimal  @db.Decimal(10,2)
  deposit        Decimal  @db.Decimal(10,2) // 20% del total
  balance        Decimal  @db.Decimal(10,2) // 80% del total
  customerName   String
  customerEmail  String
  customerPhone  String?
  pickupDate     DateTime?
  status         String   @default("pending_payment") // -> "confirmed"
  emailSent      Boolean  @default(false)
  createdAt      DateTime @default(now())

  user           User          @relation(fields: [userId], references: [id])
  wine           Wine          @relation(fields: [wineId], references: [id])
  establishment  Establishment @relation(fields: [establishmentId], references: [id])
}
```
- `User` gana opcional `googleId String? @unique` (para vincular cuentas de Google) y la relación inversa `reservations`.
- Migración Prisma + `prisma generate`. (Postgres portátil local ya documentado.)

### 4.2 Módulo `reservations`
- `POST /reservations` (JwtAuthGuard). Body: `{ wineId, establishmentId, quantity, customer: { name, email, phone }, pickupDate }`.
  - Service: toma el precio de la `availability` (vino+tienda); calcula subtotal; determina **primera reserva** (count de reservas previas del user === 0 → `discountPct = 5`); `total = subtotal − discountAmount`; `deposit = round(total*0.20)`; `balance = total − deposit`; genera `invoiceNumber` correlativo; crea registro `pending_payment`.
  - Devuelve el desglose completo + `id` + `invoiceNumber`.
- `POST /reservations/:id/pay` (JwtAuthGuard). Body: datos de tarjeta (no se persisten datos sensibles; solo se valida formato).
  - `PaymentsService.charge()` **simulado**: valida formato/Luhn; **aprueba** en modo prueba; devuelve `paymentId`.
  - Marca la reserva `confirmed`; dispara `NotificationsService.sendInvoice()`; setea `emailSent`.
  - Devuelve la reserva confirmada + estado del correo.
- `GET /reservations/me` (JwtAuthGuard): lista las reservas del usuario.
- Capas: `ReservationsController → ReservationsService → ReservationsRepository (interfaz) → Prisma`. DTOs con `class-validator`.

### 4.3 Módulo `payments` (simulado)
- `PaymentsService.charge(amount, card)`: valida tarjeta (Luhn, vencimiento, CVV); siempre aprueba en modo prueba; **no** guarda PAN/CVV. Devuelve `{ status: 'approved', paymentId }`. Aislado para poder cambiarlo por una pasarela real en el futuro sin tocar reservations.

### 4.4 Módulo `notifications` (correo real)
- `EmailService` con **Nodemailer** y transporte **Gmail SMTP** (`service: 'gmail'`, auth con `MAIL_USER` + `MAIL_APP_PASSWORD` desde env).
- `sendInvoice(reservation)`: renderiza la **factura HTML** (plantilla con logo/marca, datos de la tienda, ítems, subtotal, −5%, total, seña pagada, saldo pendiente, nº de factura, leyenda legal "Bebé con moderación · +18") y la envía a `customerEmail`.
- Falla de envío: se captura, se loguea, **no** tumba la confirmación de la reserva (devuelve `emailSent: false`).

### 4.5 `auth` — Google real
- `POST /auth/google`: recibe `{ idToken }`; verifica con `google-auth-library` (`OAuth2Client.verifyIdToken`) usando `GOOGLE_CLIENT_ID`; busca usuario por `googleId`/email, lo crea/vincula; emite JWT con el mismo shape que `/auth/login` (`{ accessToken, user }`).

### 4.6 Configuración / env (`backend/.env`)
Se añaden y validan (en `env.validation.ts` + `configuration.ts`):
- `MAIL_USER` = correo Gmail del usuario
- `MAIL_APP_PASSWORD` = contraseña de aplicación de Gmail (16 caracteres)
- `GOOGLE_CLIENT_ID` = OAuth Client ID
- (front) el `GOOGLE_CLIENT_ID` también se inyecta en `login.js` (constante o `window.CAVA_GOOGLE_CLIENT_ID`).

---

## 5. Flujo de datos (camino feliz)
1. Usuario entra a `index.html` → catálogo desde `/wines`.
2. Click **Reservar** → sin sesión: va a `login.html?return=reserve:<id>`; con sesión: abre checkout.
3. Login (correo/clave o Google) → guarda token/user → vuelve y reabre checkout del vino.
4. Pasos reserva → datos → pago (seña 20%). Front: `POST /reservations` → `POST /reservations/:id/pay`.
5. Backend confirma, **envía la factura por correo real**, responde con factura.
6. Front muestra confirmación + descarga; el correo llega a la bandeja del usuario.

---

## 6. Estrategia de pruebas
- **Backend (Jest, ya configurado):**
  - `ReservationsService`: cálculo de subtotal/total, **detección de primera reserva** (5% solo la primera vez), seña 20% / saldo 80%, generación de `invoiceNumber`.
  - `PaymentsService`: validación Luhn/vencimiento/CVV y aprobación simulada.
  - `EmailService`: mock del transporte Nodemailer (verifica que se arma y "envía" con los datos correctos; sin enviar de verdad en tests).
  - `auth/google`: mock del verificador de Google (token válido/ inválido).
- **Frontend (vanilla):** funciones puras testeables aisladas (cálculo de montos, validación de tarjeta/correo) con un runner liviano si está disponible; el resto se valida **manualmente ejecutando la app** (skill `run`/`verify`).
- **Verificación end-to-end manual:** levantar Postgres (`backend/start-postgres.ps1`), backend (`npm run start:dev`), front (`http-server`), y completar una reserva real comprobando que **la factura llega al correo**.

---

## 7. Requisitos de configuración del usuario (una sola vez)
1. **Gmail → contraseña de aplicación:** activar verificación en 2 pasos y generar una "Contraseña de aplicación" de 16 caracteres → cargar `MAIL_USER` y `MAIL_APP_PASSWORD` en `backend/.env`. (Se guía paso a paso.)
2. **Google OAuth Client ID:** crear proyecto en Google Cloud Console → pantalla de consentimiento → credenciales OAuth (orígenes `http://localhost:8080` y `http://localhost:3001`) → copiar el Client ID a `backend/.env` (`GOOGLE_CLIENT_ID`) y al front. (Se guía paso a paso.)

---

## 8. Riesgos y mitigaciones
- **Gmail puede bloquear el primer envío** → usar contraseña de aplicación (no la normal); probar con un envío de verificación.
- **Google OAuth requiere orígenes exactos** → documentar puertos exactos del front/back; fallback temporal: botón con aviso si el Client ID no está cargado.
- **Datos de tarjeta** → nunca se persisten; solo validación de formato. Dejarlo explícito en código y factura ("pago de prueba").
- **Decimales monetarios** → usar `Decimal` en Prisma y redondeo consistente (2 decimales) para evitar descuadres seña/saldo.
- **Backend/Postgres apagados** → mensajes claros en el front; documentar el orden de arranque.

---

## 9. Componentes y límites (resumen)
- **`api.js`**: qué hace = única interfaz HTTP del front; uso = `api.createReservation(...)`; depende de = fetch + token.
- **`checkout.js`**: qué hace = orquesta el overlay multipaso; uso = `openCheckout(wine)`; depende de = api, store.
- **`login.js`**: qué hace = página de login (validación + Google); uso = autoinit en `login.html`; depende de = api, store, GIS.
- **`ReservationsService`**: qué hace = reglas de negocio de la reserva (descuento, seña, factura); uso = lo llama el controller; depende de = repo + payments + notifications.
- **`EmailService`**: qué hace = render + envío de la factura; uso = `sendInvoice(reservation)`; depende de = Nodemailer + env.
- **`PaymentsService`**: qué hace = validación + aprobación simulada; uso = `charge(amount, card)`; depende de = nada externo (aislado).
