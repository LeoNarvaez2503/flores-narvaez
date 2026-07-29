# Arreglos UX: login sin checkout sorpresa, hover de tarjetas y video del login — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arreglar tres problemas de UX del front: (1) tras iniciar sesión/registrarse se abre solo el checkout y parece "que ya hay una reserva"; (2) la animación hover de las tarjetas se solapa y se recorta; (3) el "video" del login es un cinemagraph que rebota — reemplazarlo por un `<video>` real en bucle.

**Architecture:** Cambios acotados a `web/` (HTML/CSS/JS vanilla, sin build). No hay framework de tests JS en el front; cada tarea se verifica de forma manual (servir `web/` y observar). Commits frecuentes, una tarea por arreglo.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules. Sin dependencias nuevas.

## Global Constraints

- No introducir frameworks ni build step en `web/`.
- No tocar la landing de la raíz (`index.html`/`main.js`/`index.css` de la raíz del repo); todo el trabajo es dentro de `web/`.
- Idioma de la UI: español neutro.
- Servir el front para verificar: desde la raíz del repo, `npx http-server web -p 8080` y abrir `http://localhost:8080`.
- La Tarea 1 (login) además requiere el backend corriendo (`cd backend && npm run start:dev`, en `http://localhost:3001`) y PostgreSQL activo, porque hace falta autenticarse de verdad.

---

### Task 1: El login no reabre el checkout tras autenticarse

**Files:**
- Modify: `web/js/login.js:56-59` (`redirectAfterAuth`)
- Modify: `web/js/app.js:388-395` (bloque de "return=reserve" en `init`)

**Interfaces:**
- Consumes: `takePendingReturn()` de `web/js/store.js` (existe; lee y borra `cl_return`).
- Produces: nada nuevo; cambia el comportamiento de navegación post-login.

- [ ] **Step 1: Reproducir el bug (verificación manual previa)**

Con backend + front corriendo: en `http://localhost:8080`, sin sesión, clic en "Reservar" de cualquier vino → te manda a `login.html`. Cambia a la pestaña "Crear cuenta", regístrate con un correo nuevo. **Bug actual:** al volver a `index.html` se abre solo el modal de reserva (checkout) → parece que "ya hiciste una reserva". Anota que ocurre.

- [ ] **Step 2: Editar `redirectAfterAuth` en `web/js/login.js`**

Reemplazar (líneas 56-59):

```js
function redirectAfterAuth() {
  const pending = takePendingReturn();
  window.location.href = pending ? 'index.html?' + pending : 'index.html';
}
```

por:

```js
function redirectAfterAuth() {
  // Consumimos y descartamos cualquier reserva pendiente: tras autenticarse
  // el usuario aterriza en el catálogo, sin abrir el checkout automáticamente.
  takePendingReturn();
  window.location.href = 'index.html';
}
```

- [ ] **Step 3: Quitar el auto-open del checkout en `web/js/app.js`**

En `init()`, eliminar por completo este bloque (líneas 388-395):

```js
    var ret = new URLSearchParams(location.search).get('return');
    if (ret && ret.indexOf('reserve:') === 0 && getUser()) {
      var rid = ret.slice('reserve:'.length);
      var w = state.raw.filter(function (x) { return x.id === rid; })[0];
      if (w) openCheckout(w, state.userLoc);
      history.replaceState(null, '', 'index.html');
    }
```

(Dejar intacto el resto de `init()`. `openCheckout` sigue importándose porque lo usa `reserve()`; `setPendingReturn` sigue usándose en `reserve()`.)

- [ ] **Step 4: Verificar el arreglo (manual)**

Repetir Step 1: clic en "Reservar" sin sesión → registrarse → **ahora** debe caer en el catálogo (`index.html`) **sin** abrir el modal. Luego, ya logueado, clic en "Reservar" de un vino → el checkout abre normalmente (flujo explícito intacto).

- [ ] **Step 5: Commit**

```bash
git add web/js/login.js web/js/app.js
git commit -m "fix(web): no abrir el checkout automáticamente tras iniciar sesión"
```

---

### Task 2: La animación hover de las tarjetas no se solapa ni se recorta

**Files:**
- Modify: `web/css/styles.css:146` (`.rail`), `:177` (`.grid`), `:181` (`.card:hover`)

**Interfaces:**
- Consumes: nada.
- Produces: nada; solo presentación.

**Causa:** `.rail` (más vendidos) tiene `overflow-x: auto`, lo que hace que `overflow-y` se compute como `auto` y **recorte** el `translateY(-5px)` del hover; además no tiene padding superior. Y `--shadow-hover` (`0 22px 50px`) es tan grande que se monta sobre las tarjetas vecinas.

- [ ] **Step 1: Reproducir (manual)**

Servir `web/` y abrir `http://localhost:8080`. Pasar el mouse por las tarjetas de "Los más vendidos" y por la grilla: la sombra invade vecinas y, en la fila de más vendidos, el lift se recorta arriba.

- [ ] **Step 2: Dar espacio al lift en `.rail`**

Reemplazar la línea 146:

```css
.rail { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 8px; scroll-snap-type: x mandatory; }
```

por:

```css
.rail { display: flex; gap: 16px; overflow-x: auto; padding: 10px 2px 14px; scroll-snap-type: x mandatory; }
```

- [ ] **Step 3: Dar espacio al lift en la grilla**

Reemplazar la línea 177:

```css
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
```

por:

```css
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 6px 2px; }
```

- [ ] **Step 4: Reducir la sombra del hover a una contenida**

Reemplazar la línea 181:

```css
.card:hover { transform: translateY(-5px); box-shadow: var(--shadow-hover); border-color: var(--gold); }
```

por:

```css
.card:hover { transform: translateY(-5px); box-shadow: 0 10px 24px rgba(42,32,36,0.16); border-color: var(--gold); }
```

- [ ] **Step 5: Verificar (manual)**

Recargar. Hover en más vendidos: el lift ya **no se recorta** arriba. Hover en la grilla: la sombra es contenida y **no** invade las tarjetas vecinas.

- [ ] **Step 6: Commit**

```bash
git add web/css/styles.css
git commit -m "fix(web): hover de tarjetas sin recorte ni solape (rail/grid/sombra)"
```

---

### Task 3: Reemplazar el cinemagraph del login por un `<video>` real en bucle

**Files:**
- Move: `quiero_que_el_viedo_solo_202606241350.mp4` (raíz) → `web/assets/login-pour.mp4`
- Modify: `web/login.html:20` (elemento del aside)
- Modify: `web/js/login.js:122-142` (eliminar `cinemagraph()`)
- Modify: `web/css/login.css:18-21` (comentario; las reglas sirven igual para `<video>`)

**Interfaces:**
- Consumes: nada.
- Produces: nada; cambia el media del aside del login.

- [ ] **Step 1: Mover el video a assets**

```bash
mkdir -p web/assets
git mv "quiero_que_el_viedo_solo_202606241350.mp4" web/assets/login-pour.mp4
```

(Si `git mv` falla porque el archivo no está trackeado, usar `mv "quiero_que_el_viedo_solo_202606241350.mp4" web/assets/login-pour.mp4`.)

- [ ] **Step 2: Reemplazar el `<img>` por `<video>` en `web/login.html`**

Reemplazar la línea 20:

```html
      <img id="login-cine" src="img/pour/p00.webp" alt="Vino tinto sirviéndose sobre un viñedo al atardecer" class="login-aside-img" />
```

por:

```html
      <video id="login-cine" class="login-aside-img" src="assets/login-pour.mp4"
             autoplay muted loop playsinline preload="auto"
             poster="img/pour/p00.webp"
             aria-label="Una copa de vino llenándose"></video>
```

- [ ] **Step 3: Eliminar la IIFE `cinemagraph()` en `web/js/login.js`**

Borrar por completo el bloque final (líneas 122-142), desde el comentario `// ---------- cinemagraph ...` hasta el `})();` que cierra la función:

```js
// ---------- cinemagraph del lado inmersivo (loop de la escena del vino sirviéndose) ----------
(function cinemagraph() {
  const img = document.getElementById('login-cine');
  if (!img) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return; // se queda el primer fotograma estático
  const FRAMES = 18;
  const srcs = [];
  for (let i = 0; i < FRAMES; i++) srcs.push('img/pour/p' + String(i).padStart(2, '0') + '.webp');
  let loaded = 0;
  srcs.forEach((s) => { const im = new Image(); im.onload = im.onerror = () => { if (++loaded === FRAMES) start(); }; im.src = s; });
  let tick = 0;
  function start() {
    const period = (FRAMES - 1) * 2; // ping-pong: 0..17..1
    setInterval(() => {
      const p = tick % period;
      img.src = srcs[p < FRAMES ? p : period - p];
      tick++;
    }, 70);
  }
})();
```

- [ ] **Step 4: Respetar `prefers-reduced-motion` con una IIFE mínima**

Agregar al final de `web/js/login.js` (en lugar del bloque borrado): si el usuario pidió menos movimiento, pausar el video y dejar el `poster`.

```js
// ---------- media del aside: respetar prefers-reduced-motion ----------
(function asideMedia() {
  const v = document.getElementById('login-cine');
  if (!v || typeof v.pause !== 'function') return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { try { v.removeAttribute('autoplay'); v.pause(); } catch (_) {} }
})();
```

- [ ] **Step 5: Actualizar el comentario en `web/css/login.css`**

Reemplazar la línea 20:

```css
  transform: scale(1.06); /* el movimiento lo aporta el cinemagraph (loop de fotogramas) */
```

por:

```css
  transform: scale(1.04); /* leve zoom; el movimiento lo aporta el <video> en bucle */
```

- [ ] **Step 6: Verificar (manual)**

Servir `web/` y abrir `http://localhost:8080/login.html`. El aside izquierdo muestra el video de la copa llenándose **en bucle limpio** (sin rebote/parpadeo). Con "reduce motion" activado en el SO, se ve el `poster` estático.

- [ ] **Step 7: Commit**

```bash
git add web/login.html web/js/login.js web/css/login.css web/assets/login-pour.mp4
git commit -m "feat(web): video real en bucle en el login (reemplaza el cinemagraph)"
```

---

## Self-Review

- **Cobertura del spec:** cubre los puntos 3.1 (login), 3.2 (hover) y 3.3 (video) del spec `2026-06-24-catalogo-vinos-reviews-y-fixes-design.md`. El punto 4 (catálogo) va en el plan separado `2026-06-24-catalogo-32k-vinos-resenas.md`.
- **Placeholders:** ninguno; todo el código a cambiar está mostrado con su versión actual y la nueva.
- **Consistencia:** `takePendingReturn` se usa consistentemente; `#login-cine` se mantiene como id en HTML/JS/CSS al pasar de `<img>` a `<video>`.
