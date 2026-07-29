# Plan 1 — Front sublime: reimaginación visual, banners promocionales y login inmersivo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Durante la construcción visual (Tasks 6 y 7), invocar la skill `frontend-design`** para elevar la estética; el código base de este plan es funcional y correcto, `frontend-design` afina tipografía, ritmo, micro-interacciones y detalle.

**Goal:** Reimaginar el front oficial de CavaLocal (quitar ubicación, mover el 5% fuera del home, elevar la estética), agregar banners promocionales con fotos distintas (carrusel + tiles) y un login de página partida inmersivo con Google real.

**Architecture:** Frontend HTML/CSS/JS puro reorganizado en pequeños ES modules (`config`, `api`, `store`, `validators`, `carousel`, `login`, `app`). El login usa los endpoints existentes `/auth/login` y `/auth/register`, más un endpoint nuevo `POST /auth/google` (Google Identity Services). El catálogo sigue consumiendo `/wines`. El flujo de reserva/checkout se implementa en el Plan 2; aquí "Reservar" solo exige sesión.

**Tech Stack:** HTML5, CSS3 (variables ya existentes), JavaScript ES modules (sin frameworks), Google Identity Services (GSI). Backend: NestJS + Prisma + `google-auth-library`. Tests: `node --test` (front, funciones puras), Jest (backend).

## Global Constraints

- **Idioma de toda la UI y mensajes: español rioplatense** (igual que el front actual: "Reservá", "Creá tu cuenta").
- **Identidad de marca:** burdeos `--wine #641E2E`, dorado `--gold #C2912B`, crema `--cream #F3ECDD`; tipografías `Playfair Display` (display) + `Inter` (cuerpo). Logo = pin con copa (SVG ya existente). No cambiar la paleta ni las fuentes.
- **No tocar la landing** de la raíz (`/index.html`, `/main.js`, `/assets/*` salvo COPIAR frames a `web/img/`). Solo se trabaja en `web/` y `backend/`.
- **Sin frameworks ni build step en el front:** ES modules nativos servidos por `http-server` sobre `http://`.
- **Claves de sesión en `localStorage`:** `cl_token` y `cl_user` (no renombrar; el catálogo ya las usa).
- **Backend base URL por defecto:** `http://localhost:3001`. Front servido en `http://localhost:8080`.
- **Persistencia de Google:** un usuario creado por Google recibe un `passwordHash` aleatorio (el campo `passwordHash` sigue siendo obligatorio en Prisma; no se cambia su nulabilidad).
- **El 5% de "primera reserva" NO aparece en el home** (topbar/banner); se mostrará en el checkout (Plan 2).

---

## File Structure

**Frontend (`web/`)**
- `web/js/config.js` *(crear)* — constantes públicas: `API`, `GOOGLE_CLIENT_ID`.
- `web/js/validators.js` *(crear)* — funciones puras: `isValidEmail`, `passwordStrength`.
- `web/js/carousel.js` *(crear)* — math pura (`nextIndex`, `prevIndex`) + controlador DOM `mountCarousel`.
- `web/js/api.js` *(crear)* — wrappers HTTP: `login`, `register`, `googleLogin`, `getWines`.
- `web/js/store.js` *(crear)* — sesión: `getUser`, `getToken`, `setSession`, `logout`, `setPendingReturn`, `takePendingReturn`.
- `web/login.html` *(crear)* — página de login partida.
- `web/css/login.css` *(crear)* — estilos del login.
- `web/js/login.js` *(crear)* — lógica del login (validación viva, mostrar/ocultar, GSI).
- `web/index.html` *(modificar)* — quitar ubicación + descuento; carrusel + tiles; pill → `login.html`; cargar módulos.
- `web/css/styles.css` *(modificar)* — topbar slim, estilos de carrusel y tiles, quitar `.promo-strip` del home, elevación general.
- `web/js/app.js` *(modificar)* — quitar modal de auth; montar carrusel; pill→login; `reserve()` exige sesión.
- `web/img/promo-1.webp … promo-5.webp`, `web/img/tile-1.webp … tile-3.webp` *(crear, copiados de frames distintos)*.
- `web/test/validators.test.mjs`, `web/test/carousel.test.mjs` *(crear)* — tests `node --test`.

**Backend (`backend/`)**
- `backend/prisma/schema.prisma` *(modificar)* — `User.googleId String? @unique`.
- `backend/src/modules/auth/google-verifier.service.ts` *(crear)* — wrapper verificable de GSI.
- `backend/src/modules/auth/dto/google-login.dto.ts` *(crear)* — `{ idToken }`.
- `backend/src/modules/auth/auth.service.ts` *(modificar)* — `googleLogin()`.
- `backend/src/modules/auth/auth.controller.ts` *(modificar)* — `POST /auth/google`.
- `backend/src/modules/auth/auth.module.ts` *(modificar)* — proveer `GoogleVerifierService`.
- `backend/src/modules/auth/auth.service.spec.ts` *(crear)* — tests de `googleLogin`.
- `backend/src/config/configuration.ts` + `env.validation.ts` *(modificar)* — `GOOGLE_CLIENT_ID`.

---

## Task 1: Copiar frames distintos como imágenes de banners

**Files:**
- Create: `web/img/promo-1.webp`, `promo-2.webp`, `promo-3.webp`, `promo-4.webp`, `promo-5.webp`, `tile-1.webp`, `tile-2.webp`, `tile-3.webp`
- Source: `assets/frames/frame-XXXX.webp` (286 frames, `0000`–`0285`)

**Interfaces:**
- Produces: 8 imágenes en `web/img/` con nombres fijos, usadas por `app.js` (carrusel/tiles) en Task 7.

- [ ] **Step 1: Copiar 8 frames separados en la secuencia (tomas visualmente distintas)**

Desde Git Bash, en la raíz `CavaLocal/`:
```bash
cp assets/frames/frame-0015.webp web/img/promo-1.webp
cp assets/frames/frame-0070.webp web/img/promo-2.webp
cp assets/frames/frame-0130.webp web/img/promo-3.webp
cp assets/frames/frame-0195.webp web/img/promo-4.webp
cp assets/frames/frame-0260.webp web/img/promo-5.webp
cp assets/frames/frame-0045.webp web/img/tile-1.webp
cp assets/frames/frame-0160.webp web/img/tile-2.webp
cp assets/frames/frame-0240.webp web/img/tile-3.webp
```

- [ ] **Step 2: Verificar que existen los 8 archivos**

Run:
```bash
ls -1 web/img/promo-*.webp web/img/tile-*.webp | wc -l
```
Expected: `8`

> Nota para el ejecutor: al correr la app (Task 7) revisar visualmente que las 5 fotos del carrusel y las 3 de los tiles se vean **diferentes entre sí**. Si dos quedan muy parecidas, reemplazar copiando otro número de frame (separación ≥ 40).

- [ ] **Step 3: Commit**

```bash
git -C web add img/promo-1.webp img/promo-2.webp img/promo-3.webp img/promo-4.webp img/promo-5.webp img/tile-1.webp img/tile-2.webp img/tile-3.webp
git -C web commit -m "feat(web): imágenes de banners promocionales (frames distintos de la landing)"
```

---

## Task 2: `validators.js` — validación pura de correo y contraseña (TDD)

**Files:**
- Create: `web/js/validators.js`
- Test: `web/test/validators.test.mjs`

**Interfaces:**
- Produces:
  - `isValidEmail(value: string): boolean`
  - `passwordStrength(value: string): { score: 0|1|2|3, label: string, valid: boolean }` — `valid` true si `length >= 6`.

- [ ] **Step 1: Escribir el test que falla**

`web/test/validators.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidEmail, passwordStrength } from '../js/validators.js';

test('isValidEmail acepta correos válidos', () => {
  assert.equal(isValidEmail('ana@example.com'), true);
  assert.equal(isValidEmail('a.b-c@sub.dominio.co'), true);
});

test('isValidEmail rechaza inválidos', () => {
  assert.equal(isValidEmail('ana@'), false);
  assert.equal(isValidEmail('ana example.com'), false);
  assert.equal(isValidEmail(''), false);
});

test('passwordStrength marca inválida si <6 chars', () => {
  const r = passwordStrength('abc');
  assert.equal(r.valid, false);
});

test('passwordStrength sube de score con largo+variedad', () => {
  assert.equal(passwordStrength('abcdef').valid, true);
  assert.ok(passwordStrength('Abcdef1!').score >= passwordStrength('abcdef').score);
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `node --test web/test/validators.test.mjs`
Expected: FAIL (`Cannot find module ... validators.js` o export indefinido).

- [ ] **Step 3: Implementar `validators.js`**

`web/js/validators.js`:
```js
// Validación pura reutilizable por el login (y luego el checkout).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value || '').trim());
}

export function passwordStrength(value) {
  const v = String(value || '');
  const valid = v.length >= 6;
  let score = 0;
  if (v.length >= 6) score++;
  if (v.length >= 10) score++;
  if (/[A-Z]/.test(v) && /[0-9]/.test(v)) score++;
  if (score > 3) score = 3;
  const labels = ['Muy débil', 'Débil', 'Buena', 'Fuerte'];
  return { score, label: labels[score], valid };
}
```

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `node --test web/test/validators.test.mjs`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git -C web add js/validators.js test/validators.test.mjs
git -C web commit -m "feat(web): validadores puros de correo y contraseña con tests"
```

---

## Task 3: `carousel.js` — math pura + controlador DOM (TDD para la math)

**Files:**
- Create: `web/js/carousel.js`
- Test: `web/test/carousel.test.mjs`

**Interfaces:**
- Produces:
  - `nextIndex(current: number, len: number): number` — circular.
  - `prevIndex(current: number, len: number): number` — circular.
  - `mountCarousel(rootEl: HTMLElement, slides: Array<{img,alt,kicker,title,subtitle,ctaLabel,ctaAttr}>, opts?: {interval?: number}): { destroy(): void }` — render + auto-rotación + flechas + puntos + pausa al hover + respeto a `prefers-reduced-motion`.

- [ ] **Step 1: Escribir el test que falla (solo math pura)**

`web/test/carousel.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { nextIndex, prevIndex } from '../js/carousel.js';

test('nextIndex avanza y da la vuelta', () => {
  assert.equal(nextIndex(0, 3), 1);
  assert.equal(nextIndex(2, 3), 0);
});

test('prevIndex retrocede y da la vuelta', () => {
  assert.equal(prevIndex(0, 3), 2);
  assert.equal(prevIndex(2, 3), 1);
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `node --test web/test/carousel.test.mjs`
Expected: FAIL (módulo/exports inexistentes).

- [ ] **Step 3: Implementar `carousel.js`**

`web/js/carousel.js`:
```js
// Math pura (testeable) + controlador DOM del carrusel de banners.
export function nextIndex(current, len) { return (current + 1) % len; }
export function prevIndex(current, len) { return (current - 1 + len) % len; }

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function mountCarousel(rootEl, slides, opts = {}) {
  const interval = opts.interval || 5000;
  const reduce = typeof window !== 'undefined'
    && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0;
  let timer = null;

  rootEl.classList.add('carousel');
  rootEl.innerHTML =
    '<div class="carousel-track">' +
      slides.map((s, idx) =>
        '<div class="carousel-slide' + (idx === 0 ? ' active' : '') + '">' +
          '<img src="' + esc(s.img) + '" alt="' + esc(s.alt || s.title || '') + '"' +
            (idx === 0 ? '' : ' loading="lazy"') + ' />' +
          '<div class="carousel-overlay"></div>' +
          '<div class="carousel-content">' +
            (s.kicker ? '<div class="kicker">' + esc(s.kicker) + '</div>' : '') +
            '<h2>' + esc(s.title) + '</h2>' +
            (s.subtitle ? '<p>' + esc(s.subtitle) + '</p>' : '') +
            (s.ctaLabel ? '<button class="btn-gold" ' + (s.ctaAttr || '') + '>' + esc(s.ctaLabel) + '</button>' : '') +
          '</div>' +
        '</div>'
      ).join('') +
    '</div>' +
    '<button class="carousel-arrow prev" aria-label="Anterior">‹</button>' +
    '<button class="carousel-arrow next" aria-label="Siguiente">›</button>' +
    '<div class="carousel-dots">' +
      slides.map((_, idx) => '<button class="dot' + (idx === 0 ? ' active' : '') +
        '" data-go="' + idx + '" aria-label="Ir al banner ' + (idx + 1) + '"></button>').join('') +
    '</div>';

  const slideEls = Array.from(rootEl.querySelectorAll('.carousel-slide'));
  const dotEls = Array.from(rootEl.querySelectorAll('.dot'));

  function show(n) {
    i = n;
    slideEls.forEach((el, idx) => el.classList.toggle('active', idx === i));
    dotEls.forEach((el, idx) => el.classList.toggle('active', idx === i));
  }
  function start() { if (!reduce && slides.length > 1) timer = setInterval(() => show(nextIndex(i, slides.length)), interval); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  rootEl.querySelector('.next').addEventListener('click', () => { show(nextIndex(i, slides.length)); });
  rootEl.querySelector('.prev').addEventListener('click', () => { show(prevIndex(i, slides.length)); });
  dotEls.forEach((d) => d.addEventListener('click', () => show(Number(d.dataset.go))));
  rootEl.addEventListener('mouseenter', stop);
  rootEl.addEventListener('mouseleave', start);

  start();
  return { destroy() { stop(); rootEl.innerHTML = ''; } };
}
```

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `node --test web/test/carousel.test.mjs`
Expected: PASS (2/2). (El controlador DOM se valida visualmente en Task 7.)

- [ ] **Step 5: Commit**

```bash
git -C web add js/carousel.js test/carousel.test.mjs
git -C web commit -m "feat(web): carrusel de banners (math pura testeada + controlador DOM)"
```

---

## Task 4: `config.js`, `api.js` y `store.js` — base compartida

**Files:**
- Create: `web/js/config.js`, `web/js/api.js`, `web/js/store.js`

**Interfaces:**
- Produces:
  - `config.js`: `export const API`, `export const GOOGLE_CLIENT_ID`.
  - `api.js`: `login({email,password})`, `register({name,email,password})`, `googleLogin(idToken)`, `getWines()` → todas devuelven `Promise` y lanzan `Error` con `.message` legible si la respuesta no es OK.
  - `store.js`: `getUser()`, `getToken()`, `setSession(token,user)`, `logout()`, `setPendingReturn(str)`, `takePendingReturn()`.

- [ ] **Step 1: Crear `config.js`**

`web/js/config.js`:
```js
// Constantes públicas del front. El GOOGLE_CLIENT_ID es público por diseño (va en el navegador).
export const API = (typeof window !== 'undefined' && window.CAVA_API) || 'http://localhost:3001';
// TODO-USUARIO: pegar acá el OAuth Client ID que generes en Google Cloud (Task 5 / guía).
export const GOOGLE_CLIENT_ID =
  (typeof window !== 'undefined' && window.CAVA_GOOGLE_CLIENT_ID) || 'PEGAR_TU_GOOGLE_CLIENT_ID';
```

- [ ] **Step 2: Crear `api.js`**

`web/js/api.js`:
```js
import { API } from './config.js';

async function post(path, body) {
  const r = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data && data.message;
    throw new Error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Ocurrió un error.'));
  }
  return data;
}

export function login(creds) { return post('/auth/login', creds); }
export function register(data) { return post('/auth/register', data); }
export function googleLogin(idToken) { return post('/auth/google', { idToken }); }

export async function getWines() {
  const r = await fetch(API + '/wines');
  if (!r.ok) throw new Error('No se pudo cargar el catálogo.');
  return r.json();
}
```

- [ ] **Step 3: Crear `store.js`**

`web/js/store.js`:
```js
// Sesión persistida en localStorage (claves existentes cl_token / cl_user).
const T = 'cl_token', U = 'cl_user', R = 'cl_return';

export function getToken() { return localStorage.getItem(T); }
export function getUser() { try { return JSON.parse(localStorage.getItem(U) || 'null'); } catch { return null; } }
export function setSession(token, user) {
  localStorage.setItem(T, token);
  localStorage.setItem(U, JSON.stringify(user));
}
export function logout() { localStorage.removeItem(T); localStorage.removeItem(U); }
export function setPendingReturn(value) { localStorage.setItem(R, value); }
export function takePendingReturn() { const v = localStorage.getItem(R); localStorage.removeItem(R); return v; }
```

- [ ] **Step 4: Verificación de sintaxis (carga como módulo en Node)**

Run:
```bash
node --input-type=module -e "import('./web/js/api.js').then(()=>console.log('api ok')); import('./web/js/store.js').catch(e=>console.log('store needs DOM (ok)'));"
```
Expected: imprime `api ok` (store usa `localStorage`, sólo se prueba al correr en el navegador). Si `api ok` aparece, la sintaxis de los módulos es válida.

- [ ] **Step 5: Commit**

```bash
git -C web add js/config.js js/api.js js/store.js
git -C web commit -m "feat(web): módulos base config/api/store (ES modules)"
```

---

## Task 5: Backend — `POST /auth/google` con Google real (TDD)

**Files:**
- Modify: `backend/prisma/schema.prisma` (User.googleId)
- Create: `backend/src/modules/auth/google-verifier.service.ts`
- Create: `backend/src/modules/auth/dto/google-login.dto.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/auth.controller.ts`
- Modify: `backend/src/modules/auth/auth.module.ts`
- Modify: `backend/src/config/configuration.ts`, `backend/src/config/env.validation.ts`
- Create (test): `backend/src/modules/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `AuthService.buildResult(user)` (privado, ya existe), `PrismaService`, `JwtService`.
- Produces:
  - `GoogleVerifierService.verify(idToken: string): Promise<{ email: string; name: string; sub: string }>`
  - `AuthService.googleLogin(idToken: string): Promise<AuthResult>`
  - Ruta `POST /auth/google` body `{ idToken: string }` → `AuthResult` (`{ accessToken, user }`).

- [ ] **Step 1: Instalar dependencia**

Run (en `backend/`):
```bash
npm install google-auth-library
```

- [ ] **Step 2: Agregar `googleId` al modelo User y migrar**

En `backend/prisma/schema.prisma`, dentro de `model User`, agregar bajo `passwordHash`:
```prisma
  googleId       String?         @unique
```
Run (Postgres debe estar arriba — `backend/start-postgres.ps1`):
```bash
npx prisma migrate dev --name add_user_google_id
```
Expected: crea la migración y regenera el cliente Prisma sin error.

- [ ] **Step 3: Agregar `GOOGLE_CLIENT_ID` a config y validación de entorno**

En `backend/src/config/configuration.ts`, agregar dentro del objeto devuelto:
```ts
  googleClientId: process.env.GOOGLE_CLIENT_ID as string,
```
En `backend/src/config/env.validation.ts`, agregar dentro de `EnvironmentVariables`:
```ts
  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_ID?: string;
```
En `backend/.env` agregar (placeholder hasta tener el real):
```
GOOGLE_CLIENT_ID=PEGAR_TU_GOOGLE_CLIENT_ID
```

- [ ] **Step 4: Crear el DTO**

`backend/src/modules/auth/dto/google-login.dto.ts`:
```ts
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @IsNotEmpty()
  @IsString()
  idToken!: string;
}
```

- [ ] **Step 5: Crear `GoogleVerifierService` (wrapper aislado y mockeable)**

`backend/src/modules/auth/google-verifier.service.ts`:
```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleVerifierService {
  private readonly client: OAuth2Client;
  private readonly clientId?: string;

  constructor(config: ConfigService) {
    this.clientId = config.get<string>('googleClientId');
    this.client = new OAuth2Client(this.clientId);
  }

  async verify(idToken: string): Promise<{ email: string; name: string; sub: string }> {
    const ticket = await this.client.verifyIdToken({ idToken, audience: this.clientId });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Token de Google inválido.');
    }
    return { email: payload.email, name: payload.name ?? payload.email.split('@')[0], sub: payload.sub };
  }
}
```

- [ ] **Step 6: Escribir el test que falla (`googleLogin`)**

`backend/src/modules/auth/auth.service.spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { GoogleVerifierService } from './google-verifier.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthService.googleLogin', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const verifier = { verify: jest.fn() };
  const jwt = { sign: jest.fn().mockReturnValue('signed.jwt') };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: GoogleVerifierService, useValue: verifier },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('crea el usuario si no existe y devuelve token', async () => {
    verifier.verify.mockResolvedValue({ email: 'neo@gmail.com', name: 'Neo', sub: 'g-1' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'u1', name: 'Neo', email: 'neo@gmail.com', role: 'CONSUMER', membershipTier: 'GRATUITO',
    });

    const res = await service.googleLogin('fake-token');

    expect(prisma.user.create).toHaveBeenCalled();
    expect(res.accessToken).toBe('signed.jwt');
    expect(res.user.email).toBe('neo@gmail.com');
  });

  it('reusa el usuario existente por email', async () => {
    verifier.verify.mockResolvedValue({ email: 'ana@example.com', name: 'Ana', sub: 'g-2' });
    prisma.user.findUnique.mockResolvedValue({
      id: 'u2', name: 'Ana', email: 'ana@example.com', role: 'CONSUMER', membershipTier: 'GRATUITO', googleId: null,
    });
    prisma.user.update.mockResolvedValue({});

    const res = await service.googleLogin('fake-token');

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(res.user.id).toBe('u2');
  });
});
```

- [ ] **Step 7: Correr el test y ver que falla**

Run (en `backend/`): `npx jest auth.service.spec.ts`
Expected: FAIL (`service.googleLogin is not a function`).

- [ ] **Step 8: Implementar `googleLogin` en `auth.service.ts`**

En `backend/src/modules/auth/auth.service.ts`:
1) Agregar imports arriba:
```ts
import { randomUUID } from 'crypto';
import { GoogleVerifierService } from './google-verifier.service';
```
2) Inyectar el verificador en el constructor (agregar el parámetro):
```ts
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly googleVerifier: GoogleVerifierService,
  ) {}
```
3) Agregar el método (antes de `buildResult`):
```ts
  async googleLogin(idToken: string): Promise<AuthResult> {
    const profile = await this.googleVerifier.verify(idToken);
    const email = profile.email.trim().toLowerCase();

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const passwordHash = await bcrypt.hash(randomUUID(), 10);
      user = await this.prisma.user.create({
        data: { name: profile.name, email, googleId: profile.sub, passwordHash },
      });
    } else if (!user.googleId) {
      await this.prisma.user.update({ where: { id: user.id }, data: { googleId: profile.sub } });
    }
    return this.buildResult(user);
  }
```

- [ ] **Step 9: Correr el test y ver que pasa**

Run: `npx jest auth.service.spec.ts`
Expected: PASS (2/2).

- [ ] **Step 10: Exponer la ruta y proveer el servicio**

En `backend/src/modules/auth/auth.controller.ts` agregar import y ruta:
```ts
import { GoogleLoginDto } from './dto/google-login.dto';
```
```ts
  @Post('google')
  @ApiOperation({ summary: 'Iniciar sesión con Google (ID token) y devolver el token' })
  google(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto.idToken);
  }
```
En `backend/src/modules/auth/auth.module.ts` agregar import y provider:
```ts
import { GoogleVerifierService } from './google-verifier.service';
```
```ts
  providers: [AuthService, JwtStrategy, GoogleVerifierService],
```

- [ ] **Step 11: Verificar compilación + suite completa**

Run (en `backend/`):
```bash
npx jest
npm run build
```
Expected: tests en verde y build sin errores de tipos.

- [ ] **Step 12: Commit**

```bash
git -C backend add -A
git -C backend commit -m "feat(auth): login con Google real (POST /auth/google) con verificador mockeable y tests"
```

---

## Task 6: Login inmersivo — `login.html` + `login.css` + `login.js`

**Files:**
- Create: `web/login.html`, `web/css/login.css`, `web/js/login.js`

**Interfaces:**
- Consumes: `validators.isValidEmail/passwordStrength`, `api.login/register/googleLogin`, `store.setSession/takePendingReturn`, `config.GOOGLE_CLIENT_ID`.
- Produces: al autenticar, guarda sesión y redirige a `index.html` (o reabre la reserva pendiente vía `?return=`).

> **Invocar la skill `frontend-design` en esta task** para elevar la estética del split (foto + formulario): ritmo tipográfico, micro-animaciones de entrada, estados de foco/error/éxito. El código de abajo es la base funcional correcta.

- [ ] **Step 1: Crear `login.html`**

`web/login.html`:
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CavaLocal — Ingresá a tu cuenta</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/styles.css" />
  <link rel="stylesheet" href="css/login.css" />
  <script src="https://accounts.google.com/gsi/client" async defer></script>
</head>
<body class="login-body">
  <div class="login-split">
    <!-- IZQUIERDA: imagen inmersiva -->
    <aside class="login-aside">
      <img src="img/promo-3.webp" alt="Viñedos al atardecer" class="login-aside-img" />
      <div class="login-aside-overlay"></div>
      <a class="login-brand" href="index.html">
        <svg class="logo" viewBox="0 0 100 132" aria-hidden="true">
          <path d="M50 6 C26 6 7 25 7 49 C7 79 50 120 50 120 C50 120 93 79 93 49 C93 25 74 6 50 6 Z" fill="#fff"/>
          <path d="M35 30 H65 C65 48 57 57 50 58 C43 57 35 48 35 30 Z" fill="#641E2E"/>
          <rect x="48.5" y="58" width="3" height="18" fill="#641E2E"/>
          <ellipse cx="50" cy="77" rx="10" ry="2.6" fill="#641E2E"/>
        </svg>
        <span>CavaLocal</span>
      </a>
      <div class="login-aside-copy">
        <h1>Tu cava, cerca tuyo.</h1>
        <p>Descubrí etiquetas, compará precios y reservá en la tienda más cercana.</p>
      </div>
    </aside>

    <!-- DERECHA: formulario -->
    <main class="login-main">
      <div class="login-card">
        <div class="login-tabs">
          <button class="login-tab active" data-mode="login">Iniciar sesión</button>
          <button class="login-tab" data-mode="register">Crear cuenta</button>
        </div>

        <h2 id="login-title">Bienvenido de nuevo</h2>
        <p class="login-sub" id="login-subtitle">Ingresá para seguir descubriendo vinos.</p>

        <form id="login-form" novalidate>
          <div class="field" id="field-name" hidden>
            <label for="in-name">Nombre</label>
            <input id="in-name" type="text" autocomplete="name" placeholder="Tu nombre" />
          </div>

          <div class="field">
            <label for="in-email">Correo</label>
            <input id="in-email" type="email" autocomplete="email" placeholder="tucorreo@ejemplo.com" />
            <small class="hint" id="hint-email"></small>
          </div>

          <div class="field">
            <label for="in-pass">Contraseña</label>
            <div class="pass-wrap">
              <input id="in-pass" type="password" autocomplete="current-password" placeholder="••••••" />
              <button type="button" class="pass-toggle" id="toggle-pass" aria-label="Mostrar contraseña">👁</button>
            </div>
            <div class="strength" id="strength" hidden><span class="bar"></span><small></small></div>
          </div>

          <div class="login-error" id="login-error" hidden></div>

          <button type="submit" class="login-cta" id="login-submit">Iniciar sesión</button>
        </form>

        <div class="login-or"><span>o</span></div>
        <div id="google-btn" class="google-btn"></div>
        <div class="google-fallback" id="google-fallback" hidden>
          Configurá tu <b>GOOGLE_CLIENT_ID</b> para habilitar el ingreso con Google.
        </div>

        <a class="login-back" href="index.html">← Volver a la tienda</a>
      </div>
    </main>
  </div>

  <script type="module" src="js/login.js"></script>
</body>
</html>
```

- [ ] **Step 2: Crear `login.css` (base funcional; `frontend-design` la eleva)**

`web/css/login.css`:
```css
.login-body { min-height: 100vh; background: var(--cream); }
.login-split { display: grid; grid-template-columns: 1.1fr 1fr; min-height: 100vh; }

/* Aside */
.login-aside { position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; padding: 48px; }
.login-aside-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.login-aside-overlay { position: absolute; inset: 0; background: linear-gradient(160deg, rgba(72,18,31,0.55), rgba(20,8,12,0.9)); }
.login-brand { position: absolute; top: 36px; left: 48px; display: flex; align-items: center; gap: 12px; color: #fff; font-family: var(--font-display); font-size: 26px; font-weight: 800; z-index: 1; }
.login-brand .logo { width: 34px; height: 44px; }
.login-aside-copy { position: relative; z-index: 1; max-width: 460px; animation: rise 0.7s ease both; }
.login-aside-copy h1 { font-family: var(--font-display); color: #fff; font-size: 46px; line-height: 1.05; margin-bottom: 14px; }
.login-aside-copy p { color: rgba(255,255,255,0.8); font-size: 17px; }
@keyframes rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }

/* Main / card */
.login-main { display: flex; align-items: center; justify-content: center; padding: 40px 24px; }
.login-card { width: 100%; max-width: 420px; animation: rise 0.6s ease both; }
.login-tabs { display: flex; background: var(--surface); border: 1px solid var(--border); border-radius: 50px; padding: 4px; margin-bottom: 28px; }
.login-tab { flex: 1; padding: 10px; border-radius: 50px; font-weight: 700; font-size: 14px; color: var(--muted); transition: var(--transition); }
.login-tab.active { background: var(--wine); color: #fff; }
.login-card h2 { font-family: var(--font-display); font-size: 30px; color: var(--wine); }
.login-sub { color: var(--muted); font-size: 14px; margin: 6px 0 22px; }
.field { margin-bottom: 16px; }
.field label { display: block; font-size: 13px; font-weight: 700; margin-bottom: 6px; }
.field input { width: 100%; height: 50px; border: 1px solid var(--border); background: var(--surface); border-radius: var(--radius-md); padding: 0 14px; font-size: 15px; outline: none; transition: var(--transition); }
.field input:focus { border-color: var(--gold); box-shadow: 0 0 0 3px var(--gold-soft); }
.field input.invalid { border-color: var(--danger); }
.field input.valid { border-color: var(--green); }
.hint { display: block; font-size: 12px; margin-top: 5px; min-height: 14px; color: var(--danger); }
.pass-wrap { position: relative; }
.pass-wrap input { padding-right: 46px; }
.pass-toggle { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); width: 34px; height: 34px; border-radius: 8px; font-size: 16px; }
.strength { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.strength .bar { flex: 1; height: 6px; border-radius: 4px; background: var(--border); position: relative; overflow: hidden; }
.strength .bar::after { content: ''; position: absolute; inset: 0 100% 0 0; transition: right .3s, background .3s; }
.strength[data-score="1"] .bar::after { right: 66%; background: var(--danger); }
.strength[data-score="2"] .bar::after { right: 33%; background: var(--amber); }
.strength[data-score="3"] .bar::after { right: 0; background: var(--green); }
.strength small { font-size: 12px; color: var(--muted); min-width: 56px; }
.login-error { background: #fbeaea; color: var(--danger); border-radius: var(--radius-md); padding: 11px 14px; font-size: 13px; margin-bottom: 14px; }
.login-cta { width: 100%; background: var(--wine); color: #fff; padding: 15px; border-radius: var(--radius-md); font-weight: 800; font-size: 16px; transition: var(--transition); }
.login-cta:hover { background: var(--wine-soft); }
.login-cta[disabled] { opacity: 0.6; cursor: default; }
.login-or { display: flex; align-items: center; gap: 12px; color: var(--muted); font-size: 13px; margin: 20px 0; }
.login-or::before, .login-or::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.google-btn { display: flex; justify-content: center; min-height: 44px; }
.google-fallback { font-size: 12px; color: var(--muted); text-align: center; background: var(--surface); border: 1px dashed var(--border); border-radius: var(--radius-md); padding: 10px; }
.login-back { display: inline-block; margin-top: 22px; color: var(--muted); font-size: 14px; }
.login-back:hover { color: var(--wine); }

@media (max-width: 880px) {
  .login-split { grid-template-columns: 1fr; }
  .login-aside { min-height: 240px; padding: 28px; }
  .login-aside-copy h1 { font-size: 32px; }
  .login-brand { top: 20px; left: 28px; }
}
```

- [ ] **Step 3: Crear `login.js`**

`web/js/login.js`:
```js
import { isValidEmail, passwordStrength } from './validators.js';
import * as api from './api.js';
import { setSession, takePendingReturn } from './store.js';
import { GOOGLE_CLIENT_ID } from './config.js';

const $ = (s) => document.querySelector(s);
let mode = 'login';

const el = {
  tabs: document.querySelectorAll('.login-tab'),
  fieldName: $('#field-name'),
  name: $('#in-name'), email: $('#in-email'), pass: $('#in-pass'),
  hintEmail: $('#hint-email'), strength: $('#strength'),
  title: $('#login-title'), subtitle: $('#login-subtitle'),
  submit: $('#login-submit'), error: $('#login-error'),
  form: $('#login-form'), toggle: $('#toggle-pass'),
};

function setMode(next) {
  mode = next;
  const isLogin = mode === 'login';
  el.tabs.forEach((t) => t.classList.toggle('active', t.dataset.mode === mode));
  el.fieldName.hidden = isLogin;
  el.title.textContent = isLogin ? 'Bienvenido de nuevo' : 'Creá tu cuenta';
  el.subtitle.textContent = isLogin ? 'Ingresá para seguir descubriendo vinos.' : 'Sumate y empezá a reservar en segundos.';
  el.submit.textContent = isLogin ? 'Iniciar sesión' : 'Crear cuenta';
  el.pass.setAttribute('autocomplete', isLogin ? 'current-password' : 'new-password');
  el.strength.hidden = isLogin;
  hideError();
}

function showError(msg) { el.error.textContent = msg; el.error.hidden = false; }
function hideError() { el.error.hidden = true; }

function validateLive() {
  const emailOk = isValidEmail(el.email.value);
  el.email.classList.toggle('valid', emailOk && el.email.value.length > 0);
  el.email.classList.toggle('invalid', !emailOk && el.email.value.length > 0);
  el.hintEmail.textContent = (!emailOk && el.email.value.length > 0) ? 'Correo no válido' : '';

  if (mode === 'register') {
    const s = passwordStrength(el.pass.value);
    el.strength.dataset.score = String(s.score);
    el.strength.querySelector('small').textContent = el.pass.value ? s.label : '';
  }
}

function redirectAfterAuth() {
  const pending = takePendingReturn();
  if (pending) { window.location.href = 'index.html?' + pending; return; }
  window.location.href = 'index.html';
}

async function submit(e) {
  e.preventDefault();
  hideError();
  const email = el.email.value.trim();
  const pass = el.pass.value;
  if (!isValidEmail(email)) return showError('Ingresá un correo válido.');
  if (!passwordStrength(pass).valid) return showError('La contraseña debe tener al menos 6 caracteres.');
  if (mode === 'register' && !el.name.value.trim()) return showError('Ingresá tu nombre.');

  el.submit.disabled = true;
  el.submit.textContent = 'Un momento…';
  try {
    const data = mode === 'login'
      ? await api.login({ email, password: pass })
      : await api.register({ name: el.name.value.trim(), email, password: pass });
    setSession(data.accessToken, data.user);
    redirectAfterAuth();
  } catch (err) {
    showError(err.message || 'No se pudo conectar con el servidor.');
    el.submit.disabled = false;
    el.submit.textContent = mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta';
  }
}

async function onGoogle(response) {
  hideError();
  try {
    const data = await api.googleLogin(response.credential);
    setSession(data.accessToken, data.user);
    redirectAfterAuth();
  } catch (err) {
    showError(err.message || 'No se pudo iniciar sesión con Google.');
  }
}

function initGoogle() {
  const configured = GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('PEGAR_');
  if (!configured || !window.google || !window.google.accounts) {
    $('#google-fallback').hidden = false;
    return;
  }
  window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onGoogle });
  window.google.accounts.id.renderButton($('#google-btn'), {
    theme: 'outline', size: 'large', width: 360, text: 'continue_with', shape: 'pill',
  });
}

// init
el.tabs.forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode)));
el.email.addEventListener('input', validateLive);
el.pass.addEventListener('input', validateLive);
el.toggle.addEventListener('click', () => {
  const showing = el.pass.type === 'text';
  el.pass.type = showing ? 'password' : 'text';
  el.toggle.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
});
el.form.addEventListener('submit', submit);
// preseleccionar modo registro si viene ?register
if (new URLSearchParams(location.search).has('register')) setMode('register');
// Google se inicializa cuando cargó el script GSI
window.addEventListener('load', () => setTimeout(initGoogle, 300));
```

- [ ] **Step 4: Verificación manual (skill `run`/`verify`)**

1. Levantar backend (`cd backend && npm run start:dev`) con Postgres arriba.
2. Servir el front: `npx http-server web -p 8080`.
3. Abrir `http://localhost:8080/login.html`. Verificar:
   - Layout partido (foto + formulario), animación de entrada.
   - Tabs Iniciar sesión / Crear cuenta alternan; en registro aparece "Nombre" y la barra de fuerza.
   - Mostrar/ocultar contraseña funciona; validación de correo en vivo (rojo/verde).
   - Login con `ana@example.com` / `1234` → redirige a `index.html` y queda logueado.
   - Si `GOOGLE_CLIENT_ID` no está configurado, aparece el aviso de fallback (sin romper el resto).

- [ ] **Step 5: Commit**

```bash
git -C web add login.html css/login.css js/login.js
git -C web commit -m "feat(web): login inmersivo de página partida con validación viva y Google (GSI)"
```

---

## Task 7: Reimaginar el home — quitar ubicación/descuento, carrusel + tiles, elevación visual

**Files:**
- Modify: `web/index.html`, `web/css/styles.css`, `web/js/app.js`

**Interfaces:**
- Consumes: `mountCarousel` (carousel.js), `getWines` (api.js), `getUser/logout/setPendingReturn` (store.js).
- Produces: home reimaginado; `reserve(id)` exige sesión (el checkout llega en el Plan 2).

> **Invocar la skill `frontend-design` en esta task** para la elevación estética (espaciados, sombras, micro-interacciones, jerarquía). El código de abajo aplica los cambios estructurales requeridos.

- [ ] **Step 1: `index.html` — topbar sin ubicación ni descuento, hero→carrusel, tiles, pill→login, módulos**

En `web/index.html`:
1) Reemplazar el bloque `<!-- TOPBAR -->` por una barra slim sin ubicación ni descuento:
```html
  <!-- TOPBAR -->
  <div class="topbar">
    <div class="container">
      <div>Vinos seleccionados · Reservá y retirá cerca de ti</div>
      <div class="topbar-right"><a href="#" data-cat="">Explorar catálogo</a></div>
    </div>
  </div>
```
2) En la navbar, el contenedor `#account` se mantiene (el JS lo llena), pero el "Iniciar sesión" llevará a `login.html` (se ajusta en `app.js`, Step 3).
3) Reemplazar TODO el `<section class="hero" id="hero">…</section>` por el contenedor del carrusel + la fila de tiles:
```html
    <!-- CARRUSEL PROMOCIONAL -->
    <section class="hero-carousel"><div id="carousel"></div></section>

    <!-- TILES PROMOCIONALES -->
    <section class="promo-tiles" id="promoTiles"></section>
```
4) Eliminar por completo el bloque `<!-- PROMO STRIP -->` (`<div class="promo-strip">…</div>`): el 5% se va del home (irá al checkout en el Plan 2).
5) Cambiar el script del final:
```html
  <script type="module" src="js/app.js"></script>
```
6) Eliminar el `<div id="modal" class="modal-bg hidden"></div>` (el login ahora es página propia).

- [ ] **Step 2: `styles.css` — topbar slim, carrusel, tiles, quitar promo-strip**

En `web/css/styles.css`:
1) Reemplazar la regla `.topbar .topbar-right` (y dejar la topbar más sobria); agregar al final del bloque Topbar:
```css
.topbar .topbar-right a { color: var(--gold); font-weight: 700; }
```
2) **Eliminar** el bloque `/* ---------- Discount banner ---------- */` completo (las reglas `.promo-strip …`).
3) Agregar (p. ej. después del bloque Hero) los estilos del carrusel y tiles:
```css
/* ---------- Carrusel promocional ---------- */
.hero-carousel { padding: 20px 0 6px; }
.carousel { position: relative; border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-md); }
.carousel-track { position: relative; height: 380px; }
.carousel-slide { position: absolute; inset: 0; opacity: 0; transition: opacity .8s ease; }
.carousel-slide.active { opacity: 1; }
.carousel-slide img { width: 100%; height: 100%; object-fit: cover; }
.carousel-overlay { position: absolute; inset: 0; background: linear-gradient(to right, rgba(20,8,12,0.86) 0%, rgba(20,8,12,0.35) 55%, transparent 100%); }
.carousel-content { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; gap: 10px; padding: 0 56px; max-width: 620px; }
.carousel-content .kicker { color: var(--gold); font-weight: 800; font-size: 12px; letter-spacing: 2px; }
.carousel-content h2 { font-family: var(--font-display); color: #fff; font-size: 44px; line-height: 1.05; }
.carousel-content p { color: rgba(255,255,255,0.85); font-size: 16px; max-width: 80%; }
.carousel-content .btn-gold { align-self: flex-start; background: var(--gold); color: var(--wine-dark); padding: 12px 26px; border-radius: 50px; font-weight: 800; font-size: 13px; transition: var(--transition); margin-top: 6px; }
.carousel-content .btn-gold:hover { background: #d8a63a; }
.carousel-arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.85); color: var(--wine); font-size: 26px; line-height: 1; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-sm); transition: var(--transition); }
.carousel-arrow:hover { background: #fff; }
.carousel-arrow.prev { left: 16px; } .carousel-arrow.next { right: 16px; }
.carousel-dots { position: absolute; bottom: 16px; left: 56px; display: flex; gap: 8px; }
.carousel-dots .dot { width: 9px; height: 9px; border-radius: 50%; background: rgba(255,255,255,0.5); transition: var(--transition); }
.carousel-dots .dot.active { background: var(--gold); width: 26px; border-radius: 6px; }

/* ---------- Tiles promocionales ---------- */
.promo-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 14px 0 8px; }
.promo-tile { position: relative; height: 150px; border-radius: var(--radius-lg); overflow: hidden; cursor: pointer; }
.promo-tile img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
.promo-tile:hover img { transform: scale(1.06); }
.promo-tile .tile-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(20,8,12,0.85), transparent 70%); }
.promo-tile .tile-text { position: absolute; left: 18px; bottom: 16px; color: #fff; z-index: 1; }
.promo-tile .tile-text .tk { color: var(--gold); font-size: 11px; font-weight: 800; letter-spacing: 1px; }
.promo-tile .tile-text h4 { font-family: var(--font-display); font-size: 22px; }

@media (max-width: 860px) {
  .carousel-track { height: 300px; }
  .carousel-content { padding: 0 28px; }
  .carousel-content h2 { font-size: 30px; }
  .carousel-dots { left: 28px; }
  .promo-tiles { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: `app.js` — quitar modal de auth, montar carrusel + tiles, pill→login, reserve con sesión**

En `web/js/app.js`:
1) Al inicio del IIFE, convertir el archivo a módulo: agregar imports arriba de `(function(){`… En esta base sin frameworks, lo más simple es **transformar `app.js` a ES module** (ya se carga con `type="module"`). Reemplazar la cabecera del IIFE por imports y quitar el wrapper IIFE final, o mantener el IIFE e importar arriba. Mantener el IIFE e importar arriba:
```js
import { mountCarousel } from './carousel.js';
import { getWines } from './api.js';
import { getUser, logout, setPendingReturn } from './store.js';
```
2) Quitar la línea `var API = ...` y la función `loadWines()` que hace `fetch(API + '/wines')`: reemplazar el cuerpo de `loadWines` por:
```js
  async function loadWines() {
    try {
      state.raw = (await getWines()).map(transform);
    } catch (e) {
      state.raw = [];
      console.warn('No se pudo cargar el backend:', e);
    }
    state.loaded = true;
  }
```
3) Ampliar el import de `store.js` para incluir `getToken` (reemplaza el import del item 1 de este step):
```js
import { getUser, getToken, logout, setPendingReturn } from './store.js';
```
   y en el objeto `state` reemplazar las líneas `token:`/`user:` por:
```js
    token: getToken(),
    user: getUser(),
```
4) **Eliminar** las funciones `openModal`, `closeModal`, `submitAuth` (el login es página aparte).
5) En `renderAccount`, el botón de iniciar sesión navega a `login.html`:
```js
  function renderAccount() {
    var el = $('#account');
    var user = getUser();
    if (user) {
      el.innerHTML = '<div class="user-pill" data-logout="1"><div class="avatar">' + esc(initials(user.name)) + '</div><span class="uname">' + esc(user.name.split(' ')[0]) + '</span></div>';
    } else {
      el.innerHTML = '<a class="btn-login" href="login.html">Iniciar sesión</a>';
    }
  }
```
6) Reemplazar `reserve(id)` para exigir sesión (sin checkout todavía):
```js
  function reserve(id) {
    if (!getUser()) {
      setPendingReturn('return=reserve:' + id);
      window.location.href = 'login.html';
      return;
    }
    // Plan 2: abrir el checkout (reserva + seña). Por ahora, confirmación temporal:
    var w = state.raw.filter(function (x) { return x.id === id; })[0];
    toast('Reserva iniciada para ' + (w ? w.name : 'el vino') + ' — el pago llega en el próximo paso.');
  }
```
7) En el handler de `data-open` (que abría el modal), reemplazar por navegación:
```js
      else if (t.hasAttribute('data-open')) { e.preventDefault(); window.location.href = 'login.html' + (t.getAttribute('data-open') === 'register' ? '?register' : ''); }
```
8) En `data-logout`, usar `logout()`:
```js
      else if (t.hasAttribute('data-logout')) { logout(); state.user = null; state.token = null; render(); }
```
9) Agregar el render del carrusel y los tiles. Definir los datos y funciones, y llamarlas en `render()`:
```js
  var SLIDES = [
    { img: 'img/promo-1.webp', kicker: 'BODEGA DESTACADA', title: 'Pomar, de Carora a tu copa', subtitle: 'El vino venezolano que conquista paladares, cerca tuyo.', ctaLabel: 'Ver Pomar', ctaAttr: 'data-cat="Pomar"' },
    { img: 'img/promo-2.webp', kicker: 'PARA CELEBRAR', title: 'Espumantes para brindar', subtitle: 'Burbujas nacionales e importadas para cada ocasión.', ctaLabel: 'Ver espumantes', ctaAttr: 'data-cat="Espumante"' },
    { img: 'img/promo-4.webp', kicker: 'TINTOS CON CARÁCTER', title: 'Malbec, Cabernet y más', subtitle: 'Los tintos más buscados, al mejor precio cerca de ti.', ctaLabel: 'Ver tintos', ctaAttr: 'data-cat="Tinto"' },
    { img: 'img/promo-5.webp', kicker: 'HECHO EN VENEZUELA', title: 'Orgullo nacional', subtitle: 'Apoyá lo local: etiquetas venezolanas seleccionadas.', ctaLabel: 'Ver nacionales', ctaAttr: 'data-cat="Venezuela"' },
  ];
  var TILES = [
    { img: 'img/tile-1.webp', tk: 'BLANCOS', title: 'Frescos y livianos', attr: 'data-cat="Blanco"' },
    { img: 'img/tile-2.webp', tk: 'IMPORTADOS', title: 'Vuelta al mundo', attr: 'data-cat="Argentina"' },
    { img: 'img/tile-3.webp', tk: 'OFERTAS', title: 'Hasta $15', attr: 'data-price="lt15"' },
  ];
  var carouselCtl = null;
  function renderCarousel() {
    var root = $('#carousel'); if (!root) return;
    if (carouselCtl) carouselCtl.destroy();
    carouselCtl = mountCarousel(root, SLIDES, { interval: 5000 });
  }
  function renderTiles() {
    var host = $('#promoTiles'); if (!host) return;
    host.innerHTML = TILES.map(function (t) {
      return '<div class="promo-tile" ' + t.attr + '><img src="' + t.img + '" alt="' + esc(t.title) + '" /><div class="tile-overlay"></div><div class="tile-text"><div class="tk">' + esc(t.tk) + '</div><h4>' + esc(t.title) + '</h4></div></div>';
    }).join('');
  }
```
10) En `render()`, agregar las llamadas y actualizar `toggleHome()` para mostrar/ocultar el carrusel y los tiles en vez del hero/promo-strip:
```js
  function render() {
    renderAccount();
    renderCarousel();
    renderTiles();
    renderCatbar();
    renderBestsellers();
    renderFilters();
    renderToolbar();
    renderView();
    toggleHome();
  }
```
```js
  function toggleHome() {
    var showHome = state.term === '' && state.price === 'all' && state.mode === 'lista';
    ['.hero-carousel', '.promo-tiles', '.section'].forEach(function (sel) {
      var el = $(sel); if (el) el.style.display = showHome ? '' : 'none';
    });
  }
```
11) En `init()`, quitar la llamada inicial a `renderAccount(); renderCatbar();` que dependía del modal si hiciera falta; mantener el flujo (carga catálogo → render).

- [ ] **Step 4: Verificación manual (skill `run`/`verify`)**

Con backend + `http-server` arriba, abrir `http://localhost:8080/`:
- **No** aparece "Caracas · Chacao" ni el "5% en tu primera reserva" en el topbar, ni el banner `.promo-strip`.
- El **carrusel** rota cada ~5 s, con flechas y puntos; las **5 fotos son distintas**; los **3 tiles** muestran fotos distintas entre sí y del carrusel.
- "Iniciar sesión" lleva a `login.html`; tras loguear, aparece el pill con el nombre; "Cerrar sesión" (click en el pill) vuelve a "Iniciar sesión".
- Click en "Reservar" sin sesión → te manda a `login.html`; con sesión → muestra el toast temporal.
- Buscar/filtrar oculta el carrusel y los tiles (igual que antes ocultaba el hero).
- Responsive: en móvil el carrusel baja a 300px y los tiles se apilan.

- [ ] **Step 5: Commit**

```bash
git -C web add index.html css/styles.css js/app.js
git -C web commit -m "feat(web): home reimaginado — sin ubicación/descuento, carrusel + tiles promocionales, login en página propia"
```

---

## Self-Review (cobertura del spec, Plan 1)

- **Quitar ubicación** → Task 7 Step 1 (topbar reescrito). ✓
- **Mover el 5% fuera del home** → Task 7 Steps 1/2 (se elimina topbar-discount y `.promo-strip`); aparecerá en checkout (Plan 2). ✓
- **Banners con fotos distintas (carrusel + tiles)** → Tasks 1, 3, 7. ✓
- **Login no genérico (página partida, mostrar/ocultar, validación viva, Google real)** → Tasks 2, 5, 6. ✓
- **Elevación estética sublime** → Tasks 6 y 7 invocan `frontend-design`. ✓
- **Sin placeholders de código:** todos los steps de código incluyen el código real. (Único marcador intencional: `PEGAR_TU_GOOGLE_CLIENT_ID`, que es input del usuario y tiene fallback en `login.js`/`config.js`.) ✓
- **Consistencia de tipos/nombres:** `mountCarousel/nextIndex/prevIndex`, `setSession/getUser/getToken/logout/takePendingReturn/setPendingReturn`, `login/register/googleLogin/getWines`, `GoogleVerifierService.verify`, `AuthService.googleLogin` — usados con las mismas firmas entre tasks. ✓
- **Fuera de alcance (Plan 2):** checkout reserva+seña, `reservations`/`payments`/`notifications`, factura por correo. `reserve()` queda como gate de sesión + toast temporal. ✓

## Execution Handoff

Al ejecutar: **Subagent-Driven (recomendado)** con la skill `superpowers:subagent-driven-development` (un subagente por task + revisión entre tasks), o **Inline** con `superpowers:executing-plans`. En las Tasks 6 y 7, el subagente/ejecutor debe **invocar `frontend-design`** para la elevación visual.
