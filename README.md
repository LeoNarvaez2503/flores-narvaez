# CavaLocal

Marketplace intermediario de vinos para Caracas: descubre etiquetas, compara precios entre tiendas y **reserva** en la más cercana pagando una **seña online**; la **factura llega por correo**.

> Proyecto en desarrollo. Identidad: burdeos `#641E2E` · dorado `#C2912B` · crema `#F3ECDD`.

## Estructura del repo

| Carpeta | Qué es | Stack |
|---|---|---|
| `web/` | **Frontend oficial** (e-commerce) | HTML/CSS/JS puro (ES modules), sin frameworks |
| `backend/` | **API REST** | NestJS + TypeScript + Prisma + PostgreSQL |
| Raíz (`index.html`, `main.js`, `assets/`) | **Landing** de marketing | HTML + GSAP (scroll-storytelling) |
| `app/` | App móvil previa (**deprecada**) | React Native + Expo |

## Funcionalidades

- **Login** por correo/contraseña y **"Continuar con Google"** (Google Identity Services), en página partida inmersiva.
- **Catálogo** de vinos con búsqueda, filtros, comparación de precios por tienda y vista de mapa.
- **Reserva + seña**: checkout de 4 pasos (reserva → datos → pago → confirmación). Seña **20%** online, saldo **80%** al retirar. **5%** de descuento en la primera reserva.
- **Pago simulado** (validación Luhn/vencimiento/CVV; no se cobra dinero real ni se guardan datos de tarjeta).
- **Factura por correo real** (Nodemailer + Gmail SMTP) + factura imprimible.

## Cómo correrlo en local

### 1. Base de datos (PostgreSQL)
Necesitas un PostgreSQL accesible (local o en la nube, p. ej. Neon/Supabase). Crea una base `cavalocal`.

### 2. Backend (NestJS)
```bash
cd backend
cp .env.example .env          # completa las variables (ver abajo)
npm install
npx prisma migrate deploy     # aplica las migraciones
npx prisma generate
npm run prisma:seed           # datos de ejemplo (incluye ana@example.com / 1234)
npm run start:dev             # API en http://localhost:3001 (Swagger en /docs)
```

Variables de entorno (`backend/.env`):
- `DATABASE_URL` — cadena de conexión a PostgreSQL.
- `JWT_SECRET` — secreto para los tokens.
- `GOOGLE_CLIENT_ID` — OAuth Client ID de Google Cloud (para el login con Google).
- `MAIL_USER` / `MAIL_APP_PASSWORD` — correo Gmail + **contraseña de aplicación** (para enviar la factura).

> Sin `GOOGLE_CLIENT_ID` el login con Google muestra un aviso y el resto funciona. Sin `MAIL_*` la reserva igual se confirma, pero no se envía el correo.

### 3. Frontend (web)
```bash
npx http-server web -p 8080   # http://localhost:8080
```
El front consume el backend en `http://localhost:3001` (configurable en `web/js/config.js`). Pega ahí también tu `GOOGLE_CLIENT_ID`.

## Tests
```bash
cd backend && npm test        # Jest (auth, payments, reservations, notifications)
cd web && npm test            # node --test (validadores, carrusel, tarjeta)
```

## Licencia
Privado / académico. Todos los derechos reservados a sus autores.
