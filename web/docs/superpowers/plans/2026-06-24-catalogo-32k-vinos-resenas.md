# Catálogo de ~32.000 vinos (dataset abierto) + reseñas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los 29 vinos sembrados a mano y las calificaciones inventadas por un catálogo de ~32.000 vinos reales con sus marcas (importados de un dataset abierto), con referencias (ficha técnica + nota de cata + puntaje de crítica), reseñas de usuarios, y un catálogo con búsqueda/paginación server-side.

**Architecture:** Backend NestJS + Prisma + PostgreSQL: migración (campos nuevos + índices), script de import idempotente que mapea el CSV y genera disponibilidades en las 8 tiendas, catálogo paginado con filtros/orden/facetas, y módulo `reviews` (usa la tabla `Review` existente). Frontend vanilla: catálogo paginado que consulta al backend en cada filtro/búsqueda/orden, calificaciones reales y modal de detalle con reseñas. Helpers puros aislados en `src/import/` para poder testearlos con Jest.

**Tech Stack:** NestJS 10, Prisma 5 + PostgreSQL, class-validator, Jest (backend). HTML/CSS/JS ES modules (frontend, sin tests). Dataset: `alfredodeza/wine-ratings` (Hugging Face, CSV, 32.780 filas: name, region, variety, rating, notes). Dependencia nueva backend: `csv-parse`.

## Global Constraints

- Fuente de datos: `https://huggingface.co/datasets/alfredodeza/wine-ratings/resolve/main/train.csv` (columnas exactas: `name,region,variety,rating,notes`). Marca derivada del nombre; país por tabla de regiones; precio derivado del puntaje (sintético, aprobado).
- Tamaño objetivo del catálogo: todos los vinos únicos del dataset (~32.000).
- Foto de botella: campo `imageUrl` opcional en `Wine`, **no** se puebla ahora; el front muestra la foto si existe y la botella SVG como respaldo.
- Precios y tiendas son sintéticos (precio del dataset ± variación, asignados a 2-4 de las 8 tiendas existentes). Aprobado.
- Backend en `http://localhost:3001`; correr en dev: `cd backend && npm run start:dev`. PostgreSQL debe estar activo (ver `memory` del proyecto para arrancar el Postgres portátil).
- Tests backend: `cd backend && npm test`. Jest descubre `*.spec.ts` bajo `src/` (por eso los helpers testeables viven en `src/import/`).
- ValidationPipe global ya usa `{ whitelist: true, transform: true, forbidNonWhitelisted: true }` (`src/main.ts:13-15`): el front solo debe enviar parámetros del whitelist del DTO.
- No tocar la landing de la raíz del repo. Frontend del e-commerce vive en `web/`.
- `enum AvailabilityStatus` solo tiene `DISPONIBLE` y `AGOTADO` (no usar otros valores).

---

## Phase A — Datos backend (modelo + import)

### Task 1: Migración Prisma (criticScore, country, imageUrl, índices, unique de reseña)

**Files:**
- Modify: `backend/prisma/schema.prisma` (modelo `Wine` líneas 108-129; modelo `Review` líneas 146-159)

**Interfaces:**
- Produces: campos `Wine.criticScore Int?`, `Wine.country String?`, `Wine.imageUrl String?`; índices nuevos; `@@unique([userId, wineId])` en `Review`. Consumidos por Tasks 2-7.

- [ ] **Step 1: Editar el modelo `Wine`**

Reemplazar el bloque del modelo `Wine` (líneas 108-129) por:

```prisma
model Wine {
  id                   String         @id @default(uuid())
  name                 String
  type                 String
  wineryName           String
  origin               String
  country              String?
  grape                String
  vintage              Int?
  tastingNote          String?
  pairing              String?
  denominationOfOrigin String?
  aging                String?
  descriptors          Json?
  referencePrice       Decimal        @db.Decimal(10, 2)
  criticScore          Int?
  imageUrl             String?
  verified             Boolean        @default(false)
  availabilities       Availability[]
  reservations         Reservation[]
  createdAt            DateTime       @default(now())

  @@index([grape])
  @@index([origin])
  @@index([type])
  @@index([country])
  @@index([wineryName])
  @@index([criticScore])
}
```

- [ ] **Step 2: Editar el modelo `Review`**

Agregar el unique al final del modelo `Review` (después de los `@@index` existentes):

```prisma
model Review {
  id              String       @id @default(uuid())
  userId          String
  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  targetType      ReviewTarget
  wineId          String?
  establishmentId String?
  rating          Int
  comment         String?
  createdAt       DateTime     @default(now())

  @@index([targetType, wineId])
  @@index([targetType, establishmentId])
  @@unique([userId, wineId])
}
```

- [ ] **Step 3: Crear la migración y regenerar el cliente**

Run:
```bash
cd backend && npx prisma migrate dev --name catalog_critic_country_reviews
```
Expected: crea `prisma/migrations/<ts>_catalog_critic_country_reviews/`, aplica sin error y corre `prisma generate` (mensaje "✔ Generated Prisma Client").

- [ ] **Step 4: Verificar el esquema**

Run:
```bash
cd backend && npx prisma validate
```
Expected: `The schema at prisma/schema.prisma is valid 🚀`.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat(db): Wine.criticScore/country/imageUrl + índices y unique de reseña por vino"
```

---

### Task 2: Helpers de mapeo dataset→Wine (puros, con tests)

**Files:**
- Create: `backend/src/import/wine-mapping.ts`
- Test: `backend/src/import/wine-mapping.spec.ts`

**Interfaces:**
- Produces:
  - `interface WineRow { name: string; region: string; variety: string; rating: string; notes: string }`
  - `interface MappedWine { name: string; type: string; wineryName: string; country: string; origin: string; grape: string; vintage: number | null; tastingNote: string | null; criticScore: number | null; referencePrice: number; descriptors: { source: string } }`
  - `deriveType(name: string, variety: string): string`
  - `deriveCountry(region: string): string`
  - `parseVintage(name: string): number | null`
  - `deriveWinery(name: string): string`
  - `derivePrice(score: number): number`
  - `mapRowToWine(row: WineRow): MappedWine | null`
- Consumed by: Task 4 (script de import).

- [ ] **Step 1: Escribir los tests (fallan primero)**

Create `backend/src/import/wine-mapping.spec.ts`:

```ts
import {
  deriveType, deriveCountry, parseVintage, deriveWinery, derivePrice, mapRowToWine,
} from './wine-mapping';

describe('deriveType', () => {
  it('detecta espumante, blanco, rosado, fortificado y tinto por defecto', () => {
    expect(deriveType('Pommery Brut', 'Champagne Blend')).toBe('Espumante');
    expect(deriveType('Cloudy Bay', 'Sauvignon Blanc')).toBe('Blanco');
    expect(deriveType('Whispering Angel', 'Rosé')).toBe('Rosado');
    expect(deriveType('Graham’s 20 Year', 'Port')).toBe('Fortificado');
    expect(deriveType('Catena Malbec', 'Malbec')).toBe('Tinto');
  });
});

describe('deriveCountry', () => {
  it('mapea regiones conocidas a país', () => {
    expect(deriveCountry('Mendoza')).toBe('Argentina');
    expect(deriveCountry('Napa Valley, California')).toBe('US');
    expect(deriveCountry('Rioja')).toBe('España');
    expect(deriveCountry('Tuscany')).toBe('Italia');
  });
  it('usa el último segmento si no conoce la región', () => {
    expect(deriveCountry('Algún Valle, Uruguay')).toBe('Uruguay');
  });
  it('devuelve "Otro" si viene vacío', () => {
    expect(deriveCountry('')).toBe('Otro');
  });
});

describe('parseVintage', () => {
  it('extrae el año del nombre', () => {
    expect(parseVintage('Catena Malbec 2016')).toBe(2016);
  });
  it('devuelve null si no hay año válido', () => {
    expect(parseVintage('Catena Malbec')).toBeNull();
  });
});

describe('deriveWinery', () => {
  it('toma la marca al inicio del nombre, cortando en la cepa/año', () => {
    expect(deriveWinery('Catena Zapata Malbec 2016')).toBe('Catena Zapata');
    expect(deriveWinery('1000 Stories Bourbon Barrel Aged Red 2016')).toBe('1000 Stories Bourbon');
  });
  it('devuelve algo no vacío aun con nombres raros', () => {
    expect(deriveWinery('Tinto')).not.toBe('');
  });
});

describe('derivePrice', () => {
  it('crece con el puntaje y es estable', () => {
    expect(derivePrice(80)).toBeCloseTo(6, 1);
    expect(derivePrice(90)).toBeGreaterThan(derivePrice(85));
  });
});

describe('mapRowToWine', () => {
  it('mapea una fila completa', () => {
    const m = mapRowToWine({
      name: 'Catena Zapata Malbec 2016', region: 'Mendoza', variety: 'Malbec',
      rating: '93.0', notes: 'Ciruela y violetas.',
    });
    expect(m).not.toBeNull();
    expect(m!.name).toBe('Catena Zapata Malbec 2016');
    expect(m!.wineryName).toBe('Catena Zapata');
    expect(m!.type).toBe('Tinto');
    expect(m!.country).toBe('Argentina');
    expect(m!.origin).toContain('Mendoza');
    expect(m!.origin).toContain('Argentina');
    expect(m!.vintage).toBe(2016);
    expect(m!.criticScore).toBe(93);
    expect(m!.tastingNote).toBe('Ciruela y violetas.');
    expect(m!.descriptors.source).toBe('wine-ratings');
    expect(m!.referencePrice).toBeGreaterThan(0);
  });
  it('devuelve null si no hay nombre', () => {
    expect(mapRowToWine({ name: '  ', region: 'x', variety: 'y', rating: '90', notes: '' })).toBeNull();
  });
});
```

- [ ] **Step 2: Correr los tests (deben fallar)**

Run: `cd backend && npx jest src/import/wine-mapping.spec.ts`
Expected: FAIL — `Cannot find module './wine-mapping'`.

- [ ] **Step 3: Implementar `wine-mapping.ts`**

Create `backend/src/import/wine-mapping.ts`:

```ts
export interface WineRow {
  name: string;
  region: string;
  variety: string;
  rating: string;
  notes: string;
}

export interface MappedWine {
  name: string;
  type: string;
  wineryName: string;
  country: string;
  origin: string;
  grape: string;
  vintage: number | null;
  tastingNote: string | null;
  criticScore: number | null;
  referencePrice: number;
  descriptors: { source: string };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function deriveType(name: string, variety: string): string {
  const s = (variety + ' ' + name).toLowerCase();
  if (/sparkling|champagne|prosecco|\bcava\b|espumante|brut|spumante/.test(s)) return 'Espumante';
  if (/ros[eé]\b|rosado/.test(s)) return 'Rosado';
  if (/\bport\b|porto|sherry|jerez|madeira|fortified|fortificado/.test(s)) return 'Fortificado';
  if (/white|blanc|blanco|chardonnay|sauvignon|riesling|pinot gris|pinot grigio|gew[üu]rz|albari|verdejo|chenin|viognier|moscato|sémillon|semillon|gr[üu]ner/.test(s)) return 'Blanco';
  return 'Tinto';
}

// Regiones (en minúscula) → país. Cubre las más comunes del dataset.
const REGION_TO_COUNTRY: Array<[string, string]> = [
  ['mendoza', 'Argentina'], ['patagonia', 'Argentina'], ['salta', 'Argentina'], ['san juan', 'Argentina'],
  ['california', 'US'], ['napa', 'US'], ['sonoma', 'US'], ['oregon', 'US'], ['washington', 'US'],
  ['new york', 'US'], ['willamette', 'US'], ['paso robles', 'US'], ['columbia', 'US'], ['finger lakes', 'US'],
  ['rioja', 'España'], ['ribera del duero', 'España'], ['priorat', 'España'], ['rías baixas', 'España'],
  ['rias baixas', 'España'], ['penedès', 'España'], ['penedes', 'España'], ['jerez', 'España'], ['spain', 'España'],
  ['bordeaux', 'Francia'], ['burgundy', 'Francia'], ['bourgogne', 'Francia'], ['champagne', 'Francia'],
  ['rhône', 'Francia'], ['rhone', 'Francia'], ['loire', 'Francia'], ['alsace', 'Francia'], ['provence', 'Francia'],
  ['languedoc', 'Francia'], ['france', 'Francia'],
  ['tuscany', 'Italia'], ['piedmont', 'Italia'], ['piemonte', 'Italia'], ['veneto', 'Italia'], ['sicily', 'Italia'],
  ['toscana', 'Italia'], ['italy', 'Italia'],
  ['maipo', 'Chile'], ['colchagua', 'Chile'], ['casablanca', 'Chile'], ['rapel', 'Chile'], ['chile', 'Chile'],
  ['douro', 'Portugal'], ['alentejo', 'Portugal'], ['dão', 'Portugal'], ['dao', 'Portugal'], ['portugal', 'Portugal'],
  ['mosel', 'Alemania'], ['rheingau', 'Alemania'], ['germany', 'Alemania'],
  ['marlborough', 'Nueva Zelanda'], ['central otago', 'Nueva Zelanda'], ['new zealand', 'Nueva Zelanda'],
  ['barossa', 'Australia'], ['mclaren', 'Australia'], ['margaret river', 'Australia'], ['australia', 'Australia'],
  ['stellenbosch', 'Sudáfrica'], ['swartland', 'Sudáfrica'], ['south africa', 'Sudáfrica'],
  ['venezuela', 'Venezuela'], ['carora', 'Venezuela'], ['lara', 'Venezuela'],
];

export function deriveCountry(region: string): string {
  const r = (region || '').toLowerCase();
  if (!r.trim()) return 'Otro';
  for (const [k, v] of REGION_TO_COUNTRY) if (r.includes(k)) return v;
  const parts = (region || '').split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : 'Otro';
}

export function parseVintage(name: string): number | null {
  const m = (name || '').match(/\b(19\d{2}|20\d{2})\b/);
  if (!m) return null;
  const y = Number(m[1]);
  return y >= 1900 && y <= 2025 ? y : null;
}

const WINERY_STOP = [
  ' red', ' white', ' ros', ' cabernet', ' merlot', ' malbec', ' syrah', ' shiraz',
  ' pinot', ' chardonnay', ' sauvignon', ' tempranillo', ' riesling', ' zinfandel',
  ' sangiovese', ' nebbiolo', ' grenache', ' blend', ' reserve', ' reserva', ' brut',
  ' carmen', ' carmén', ' tinto', ' blanco', ' rosé', ' rose',
];

export function deriveWinery(name: string): string {
  if (!name || !name.trim()) return 'Sin marca';
  let s = name.replace(/\b(19\d{2}|20\d{2})\b.*$/, '').trim(); // cortar en el año
  const lower = s.toLowerCase();
  let idx = -1;
  for (const w of WINERY_STOP) {
    const i = lower.indexOf(w);
    if (i > 0 && (idx === -1 || i < idx)) idx = i;
  }
  if (idx > 0) s = s.slice(0, idx).trim();
  const words = s.split(/\s+/).filter(Boolean);
  const brand = words.slice(0, Math.min(3, words.length)).join(' ');
  return brand || name.trim();
}

export function derivePrice(score: number): number {
  const s = Number(score) || 86;
  const base = 6 + Math.max(0, s - 80) * 1.6; // 80→6, 90→22, 96→31.6
  return round2(base);
}

export function mapRowToWine(row: WineRow): MappedWine | null {
  const name = (row.name || '').trim();
  if (!name) return null;
  const ratingNum = Math.round(Number(row.rating));
  const criticScore = Number.isFinite(ratingNum) ? ratingNum : null;
  const country = deriveCountry(row.region);
  const region = (row.region || '').trim();
  const origin = region && country && !region.toLowerCase().includes(country.toLowerCase())
    ? `${region}, ${country}`
    : (region || country);
  return {
    name,
    type: deriveType(name, row.variety || ''),
    wineryName: deriveWinery(name),
    country,
    origin,
    grape: (row.variety || '').trim() || 'Otra',
    vintage: parseVintage(name),
    tastingNote: (row.notes || '').trim() || null,
    criticScore,
    referencePrice: derivePrice(criticScore ?? 86),
    descriptors: { source: 'wine-ratings' },
  };
}
```

- [ ] **Step 4: Correr los tests (deben pasar)**

Run: `cd backend && npx jest src/import/wine-mapping.spec.ts`
Expected: PASS (todas las suites verdes).

- [ ] **Step 5: Commit**

```bash
git add backend/src/import/wine-mapping.ts backend/src/import/wine-mapping.spec.ts
git commit -m "feat(import): helpers puros de mapeo dataset→Wine con tests"
```

---

### Task 3: Helper de disponibilidades sintéticas (puro, con tests)

**Files:**
- Modify: `backend/src/import/wine-mapping.ts` (agregar función)
- Modify: `backend/src/import/wine-mapping.spec.ts` (agregar tests)

**Interfaces:**
- Produces: `buildAvailabilitiesForWine(wineId: string, index: number, establishmentIds: string[], basePrice: number): Array<{ wineId: string; establishmentId: string; price: number; status: 'DISPONIBLE' | 'AGOTADO' }>`
- Consumed by: Task 4.

- [ ] **Step 1: Agregar tests (fallan primero)**

Añadir a `backend/src/import/wine-mapping.spec.ts`:

```ts
import { buildAvailabilitiesForWine } from './wine-mapping';

describe('buildAvailabilitiesForWine', () => {
  const stores = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  it('asigna entre 2 y 4 tiendas únicas por vino', () => {
    for (let i = 0; i < 12; i++) {
      const rows = buildAvailabilitiesForWine('w' + i, i, stores, 20);
      const ids = rows.map((r) => r.establishmentId);
      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(rows.length).toBeLessThanOrEqual(4);
      expect(new Set(ids).size).toBe(ids.length); // sin duplicados
    }
  });

  it('precios cercanos a la base y status válido', () => {
    const rows = buildAvailabilitiesForWine('w', 1, stores, 20);
    rows.forEach((r) => {
      expect(r.price).toBeGreaterThan(0);
      expect(r.price).toBeLessThan(20 * 1.3);
      expect(['DISPONIBLE', 'AGOTADO']).toContain(r.status);
    });
  });

  it('es determinista', () => {
    expect(buildAvailabilitiesForWine('w', 3, stores, 15))
      .toEqual(buildAvailabilitiesForWine('w', 3, stores, 15));
  });
});
```

- [ ] **Step 2: Correr (debe fallar)**

Run: `cd backend && npx jest src/import/wine-mapping.spec.ts -t buildAvailabilitiesForWine`
Expected: FAIL — `buildAvailabilitiesForWine is not a function`.

- [ ] **Step 3: Implementar la función**

Agregar al final de `backend/src/import/wine-mapping.ts`:

```ts
export function buildAvailabilitiesForWine(
  wineId: string,
  index: number,
  establishmentIds: string[],
  basePrice: number,
): Array<{ wineId: string; establishmentId: string; price: number; status: 'DISPONIBLE' | 'AGOTADO' }> {
  const factors = [0.95, 1.0, 1.07, 1.12];
  const count = 2 + (index % 3); // 2..4
  const rows: Array<{ wineId: string; establishmentId: string; price: number; status: 'DISPONIBLE' | 'AGOTADO' }> = [];
  const used = new Set<string>();
  for (let k = 0; k < count && used.size < establishmentIds.length; k++) {
    let ei = (index * 2 + k * 3) % establishmentIds.length;
    // avanzar hasta una tienda no usada (mantiene unicidad por vino)
    let guard = 0;
    while (used.has(establishmentIds[ei]) && guard < establishmentIds.length) {
      ei = (ei + 1) % establishmentIds.length;
      guard++;
    }
    const establishmentId = establishmentIds[ei];
    if (used.has(establishmentId)) break;
    used.add(establishmentId);
    const price = round2(basePrice * factors[k % factors.length]);
    const status: 'DISPONIBLE' | 'AGOTADO' = (index + k) % 17 === 0 ? 'AGOTADO' : 'DISPONIBLE';
    rows.push({ wineId, establishmentId, price, status });
  }
  return rows;
}
```

- [ ] **Step 4: Correr (debe pasar)**

Run: `cd backend && npx jest src/import/wine-mapping.spec.ts`
Expected: PASS (todas).

- [ ] **Step 5: Commit**

```bash
git add backend/src/import/wine-mapping.ts backend/src/import/wine-mapping.spec.ts
git commit -m "feat(import): generación determinista de disponibilidades con tests"
```

---

### Task 4: Script de import + descarga del CSV + dependencia csv-parse

**Files:**
- Create: `backend/prisma/import-wines.ts`
- Create: `backend/prisma/data/` (carpeta para el CSV, ignorada por git)
- Modify: `backend/package.json` (script `import:wines` + dependencia `csv-parse`)
- Modify: `.gitignore` (raíz) — ignorar `backend/prisma/data/`

**Interfaces:**
- Consumes: `mapRowToWine`, `buildAvailabilitiesForWine` (Task 2/3); establecimientos sembrados (`prisma/seed.ts`).
- Produces: ~32.000 filas en `Wine` (con `descriptors.source = "wine-ratings"`) y sus `Availability`.

- [ ] **Step 1: Instalar csv-parse**

Run: `cd backend && npm install -D csv-parse`
Expected: agrega `csv-parse` a devDependencies.

- [ ] **Step 2: Ignorar la carpeta de datos**

Añadir al `.gitignore` de la raíz del repo una línea:

```
backend/prisma/data/
```

- [ ] **Step 3: Descargar el CSV**

Run:
```bash
mkdir -p backend/prisma/data
curl -L -o backend/prisma/data/wine-ratings.csv "https://huggingface.co/datasets/alfredodeza/wine-ratings/resolve/main/train.csv"
```
Expected: archivo > 1 MB. Verificar cabecera:
```bash
head -1 backend/prisma/data/wine-ratings.csv
```
Expected: `name,region,variety,rating,notes`.

- [ ] **Step 4: Escribir el script de import**

Create `backend/prisma/import-wines.ts`:

```ts
import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { mapRowToWine, buildAvailabilitiesForWine, WineRow } from '../src/import/wine-mapping';

const prisma = new PrismaClient();
const CSV_PATH = path.join(__dirname, 'data', 'wine-ratings.csv');

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`No se encontró el CSV en ${CSV_PATH}. Descárgalo (ver plan, Task 4 Step 3).`);
  }
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const rows: WineRow[] = parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true, trim: false });

  // Mapear + deduplicar por (marca|nombre)
  const seen = new Set<string>();
  const mapped = [];
  for (const r of rows) {
    const m = mapRowToWine(r);
    if (!m) continue;
    const key = (m.wineryName + '|' + m.name).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    mapped.push(m);
  }
  // eslint-disable-next-line no-console
  console.log(`Filas CSV: ${rows.length} · vinos únicos mapeados: ${mapped.length}`);

  const establishments = await prisma.establishment.findMany({ select: { id: true } });
  const establishmentIds = establishments.map((e) => e.id);
  if (!establishmentIds.length) {
    throw new Error('No hay establecimientos. Corre primero: npm run prisma:seed');
  }

  // Idempotencia: borrar import previo (las Availability caen por onDelete: Cascade)
  const del = await prisma.wine.deleteMany({
    where: { descriptors: { path: ['source'], equals: 'wine-ratings' } },
  });
  // eslint-disable-next-line no-console
  console.log(`Vinos importados previos borrados: ${del.count}`);

  // Asignar ids ahora para poder construir las disponibilidades
  const wineRecords = mapped.map((m, idx) => ({ id: randomUUID(), idx, ...m }));

  const CHUNK = 1000;
  let winesInserted = 0;
  for (let i = 0; i < wineRecords.length; i += CHUNK) {
    const slice = wineRecords.slice(i, i + CHUNK);
    await prisma.wine.createMany({
      data: slice.map((w) => ({
        id: w.id,
        name: w.name,
        type: w.type,
        wineryName: w.wineryName,
        origin: w.origin,
        country: w.country,
        grape: w.grape,
        vintage: w.vintage,
        tastingNote: w.tastingNote,
        descriptors: w.descriptors,
        referencePrice: w.referencePrice,
        criticScore: w.criticScore,
        verified: true,
      })),
      skipDuplicates: true,
    });
    winesInserted += slice.length;
    // eslint-disable-next-line no-console
    if (i % 5000 === 0) console.log(`  vinos insertados: ${winesInserted}`);
  }

  // Construir e insertar disponibilidades
  const availRows = [];
  for (const w of wineRecords) {
    const rowsForWine = buildAvailabilitiesForWine(w.id, w.idx, establishmentIds, Number(w.referencePrice));
    availRows.push(...rowsForWine);
  }
  let availInserted = 0;
  for (let i = 0; i < availRows.length; i += CHUNK) {
    const slice = availRows.slice(i, i + CHUNK);
    await prisma.availability.createMany({ data: slice, skipDuplicates: true });
    availInserted += slice.length;
  }

  // eslint-disable-next-line no-console
  console.log(`Import OK: ${winesInserted} vinos, ${availInserted} disponibilidades.`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 5: Agregar el script npm**

En `backend/package.json`, dentro de `"scripts"`, agregar:

```json
    "import:wines": "ts-node prisma/import-wines.ts",
```

- [ ] **Step 6: Asegurar establecimientos y correr el import**

Run (Postgres activo):
```bash
cd backend && npm run prisma:seed && npm run import:wines
```
Expected: el seed crea 8 establecimientos; el import imprime "Import OK: ~32000 vinos, ~9xxxx disponibilidades."

- [ ] **Step 7: Verificar conteos e idempotencia**

Run:
```bash
cd backend && npx prisma studio
```
…o una verificación rápida por script:
```bash
cd backend && node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.wine.count().then(c=>console.log('wines',c)).then(()=>p.availability.count()).then(c=>console.log('avail',c)).finally(()=>p.\$disconnect())"
```
Expected: `wines` ~32000, `avail` > 60000. Re-correr `npm run import:wines` y verificar que el conteo de vinos NO se duplica (idempotente).

- [ ] **Step 8: Commit**

```bash
git add backend/prisma/import-wines.ts backend/package.json backend/package-lock.json .gitignore
git commit -m "feat(import): script idempotente de ~32k vinos + disponibilidades desde dataset abierto"
```

---

## Phase B — Backend API

### Task 5: Catálogo paginado con filtros, orden y agregado de reseñas

**Files:**
- Create: `backend/src/modules/catalog/dto/list-wines-query.dto.ts`
- Modify: `backend/src/modules/catalog/catalog.service.ts`
- Modify: `backend/src/modules/catalog/catalog.controller.ts`
- Test: `backend/src/modules/catalog/catalog.service.spec.ts`

**Interfaces:**
- Produces:
  - `WineCard = { id, name, wineryName, type, grape, origin, country, vintage, criticScore, imageUrl, referencePrice, bestPrice, storeCount, offers: Array<{ establishmentId, storeName, price, lat, lng, status }>, avgRating: number | null, reviewCount: number }`
  - `listWines(query): Promise<{ items: WineCard[]; total: number; page: number; pageSize: number }>`
  - `getWine(id): Promise<WineCard & { tastingNote, pairing, denominationOfOrigin, aging }>`
- Consumed by: frontend (Task 8/9), bestsellers (Task 6).

- [ ] **Step 1: Crear el DTO de query**

Create `backend/src/modules/catalog/dto/list-wines-query.dto.ts`:

```ts
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListWinesQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() grape?: string;
  @IsOptional() @Type(() => Number) @IsNumber() priceMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() priceMax?: number;
  @IsOptional() @IsIn(['relevancia', 'precio_asc', 'precio_desc', 'calificacion', 'nombre']) sort?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(60) pageSize?: number;
}
```

- [ ] **Step 2: Escribir el test del servicio (falla primero)**

Create `backend/src/modules/catalog/catalog.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { CatalogService } from './catalog.service';
import { PrismaService } from '../../prisma/prisma.service';

function wineRow(id: string, price = 20) {
  return {
    id, name: 'Vino ' + id, wineryName: 'Bodega', type: 'Tinto', grape: 'Malbec',
    origin: 'Mendoza, Argentina', country: 'Argentina', vintage: 2018, criticScore: 90,
    imageUrl: null, referencePrice: price,
    availabilities: [
      { establishmentId: 'a', price: price + 1, status: 'DISPONIBLE', establishment: { name: 'Tienda A', lat: 10, lng: -66 } },
      { establishmentId: 'b', price: price - 1, status: 'DISPONIBLE', establishment: { name: 'Tienda B', lat: 11, lng: -67 } },
    ],
  };
}

describe('CatalogService.listWines', () => {
  let service: CatalogService;
  const prisma: any = {
    $transaction: jest.fn(),
    wine: { count: jest.fn(), findMany: jest.fn() },
    review: { groupBy: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [CatalogService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(CatalogService);
  });

  it('pagina, calcula bestPrice/storeCount y mezcla el promedio de reseñas', async () => {
    prisma.$transaction.mockResolvedValue([1, [wineRow('w1', 20)]]);
    prisma.review.groupBy.mockResolvedValue([{ wineId: 'w1', _avg: { rating: 4 }, _count: { _all: 3 } }]);

    const res = await service.listWines({ page: 1, pageSize: 24 } as any);

    expect(res.total).toBe(1);
    expect(res.page).toBe(1);
    const card = res.items[0];
    expect(card.bestPrice).toBe(19); // min(21, 19)
    expect(card.storeCount).toBe(2);
    expect(card.avgRating).toBe(4);
    expect(card.reviewCount).toBe(3);
  });

  it('clampa pageSize a 60 y page a >=1', async () => {
    prisma.$transaction.mockResolvedValue([0, []]);
    prisma.review.groupBy.mockResolvedValue([]);
    const res = await service.listWines({ page: 0, pageSize: 999 } as any);
    expect(res.pageSize).toBe(60);
    expect(res.page).toBe(1);
  });
});
```

- [ ] **Step 3: Correr (debe fallar)**

Run: `cd backend && npx jest src/modules/catalog/catalog.service.spec.ts`
Expected: FAIL (la firma actual de `listWines(q?)` no devuelve `{items,total,...}`).

- [ ] **Step 4: Reimplementar `catalog.service.ts`**

Reemplazar el contenido de `backend/src/modules/catalog/catalog.service.ts` por:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListWinesQueryDto } from './dto/list-wines-query.dto';

type AggRow = { wineId: string | null; _avg: { rating: number | null }; _count: { _all: number } };

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: ListWinesQueryDto): Prisma.WineWhereInput {
    const where: Prisma.WineWhereInput = {};
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { grape: { contains: query.q, mode: 'insensitive' } },
        { origin: { contains: query.q, mode: 'insensitive' } },
        { wineryName: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.type) where.type = query.type;
    if (query.country) where.country = query.country;
    if (query.grape) where.grape = query.grape;
    if (query.priceMin != null || query.priceMax != null) {
      where.referencePrice = {};
      if (query.priceMin != null) (where.referencePrice as Prisma.DecimalFilter).gte = query.priceMin;
      if (query.priceMax != null) (where.referencePrice as Prisma.DecimalFilter).lte = query.priceMax;
    }
    return where;
  }

  private buildOrderBy(sort?: string): Prisma.WineOrderByWithRelationInput | Prisma.WineOrderByWithRelationInput[] {
    switch (sort) {
      case 'precio_asc': return { referencePrice: 'asc' };
      case 'precio_desc': return { referencePrice: 'desc' };
      case 'nombre': return { name: 'asc' };
      case 'calificacion':
      case 'relevancia':
      default:
        return [{ criticScore: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }];
    }
  }

  private toCard(w: any, agg?: AggRow) {
    const offers = (w.availabilities || [])
      .map((a: any) => ({
        establishmentId: a.establishmentId,
        storeName: a.establishment?.name ?? '',
        price: Number(a.price),
        lat: a.establishment?.lat,
        lng: a.establishment?.lng,
        status: a.status,
      }))
      .sort((x: any, y: any) => x.price - y.price);
    return {
      id: w.id,
      name: w.name,
      wineryName: w.wineryName,
      type: w.type,
      grape: w.grape,
      origin: w.origin,
      country: w.country,
      vintage: w.vintage,
      criticScore: w.criticScore,
      imageUrl: w.imageUrl,
      referencePrice: Number(w.referencePrice),
      bestPrice: offers.length ? offers[0].price : Number(w.referencePrice),
      storeCount: offers.length,
      offers,
      avgRating: agg && agg._avg.rating != null ? Math.round(agg._avg.rating * 10) / 10 : null,
      reviewCount: agg ? agg._count._all : 0,
    };
  }

  private async aggregateReviews(wineIds: string[]): Promise<Map<string, AggRow>> {
    if (!wineIds.length) return new Map();
    const rows = (await this.prisma.review.groupBy({
      by: ['wineId'],
      where: { wineId: { in: wineIds }, targetType: 'WINE' },
      _avg: { rating: true },
      _count: { _all: true },
    })) as unknown as AggRow[];
    return new Map(rows.filter((r) => r.wineId).map((r) => [r.wineId as string, r]));
  }

  async listWines(query: ListWinesQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(60, Math.max(1, Number(query.pageSize) || 24));
    const where = this.buildWhere(query);
    const orderBy = this.buildOrderBy(query.sort);

    const [total, wines] = await this.prisma.$transaction([
      this.prisma.wine.count({ where }),
      this.prisma.wine.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { availabilities: { include: { establishment: true } } },
      }),
    ]);

    const aggMap = await this.aggregateReviews(wines.map((w) => w.id));
    const items = wines.map((w) => this.toCard(w, aggMap.get(w.id)));
    return { items, total, page, pageSize };
  }

  async getWine(id: string) {
    const wine = await this.prisma.wine.findUnique({
      where: { id },
      include: { availabilities: { include: { establishment: true } } },
    });
    if (!wine) throw new NotFoundException('Vino no encontrado');
    const aggMap = await this.aggregateReviews([wine.id]);
    return {
      ...this.toCard(wine, aggMap.get(wine.id)),
      tastingNote: wine.tastingNote,
      pairing: wine.pairing,
      denominationOfOrigin: wine.denominationOfOrigin,
      aging: wine.aging,
    };
  }
}
```

- [ ] **Step 5: Actualizar el controller**

Reemplazar `backend/src/modules/catalog/catalog.controller.ts` por:

```ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { ListWinesQueryDto } from './dto/list-wines-query.dto';

@ApiTags('catalog')
@Controller('wines')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo paginado de vinos (filtros, orden, agregado de reseñas)' })
  list(@Query() query: ListWinesQueryDto) {
    return this.catalogService.listWines(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ficha de un vino con precios por tienda y referencias' })
  get(@Param('id') id: string) {
    return this.catalogService.getWine(id);
  }
}
```

- [ ] **Step 6: Correr el test (debe pasar)**

Run: `cd backend && npx jest src/modules/catalog/catalog.service.spec.ts`
Expected: PASS.

- [ ] **Step 7: Verificación E2E rápida (con backend corriendo)**

Run: `cd backend && npm run start:dev` y en otra terminal:
```bash
curl "http://localhost:3001/wines?pageSize=2&sort=calificacion"
```
Expected: JSON `{ items: [2 vinos con bestPrice/offers/avgRating], total: ~32000, page: 1, pageSize: 2 }`.

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/catalog
git commit -m "feat(catalog): catálogo paginado con filtros, orden y agregado de reseñas"
```

---

### Task 6: Endpoints de facetas y más vendidos

**Files:**
- Modify: `backend/src/modules/catalog/catalog.service.ts` (agregar `facets`, `bestsellers`)
- Modify: `backend/src/modules/catalog/catalog.controller.ts` (rutas `facets` y `bestsellers` ANTES de `:id`)
- Modify: `backend/src/modules/catalog/catalog.service.spec.ts` (tests)

**Interfaces:**
- Produces:
  - `facets(): Promise<{ types: Array<{key,count}>; countries: Array<{key,count}>; grapes: Array<{key,count}> }>`
  - `bestsellers(limit?): Promise<WineCard[]>`
- Consumed by: frontend (Task 9).

- [ ] **Step 1: Agregar tests (fallan primero)**

Añadir a `backend/src/modules/catalog/catalog.service.spec.ts`:

```ts
describe('CatalogService.facets', () => {
  let service: CatalogService;
  const prisma: any = { wine: { groupBy: jest.fn() } };
  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [CatalogService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(CatalogService);
  });

  it('devuelve conteos por tipo/país/cepa ordenados desc', async () => {
    prisma.wine.groupBy
      .mockResolvedValueOnce([{ type: 'Tinto', _count: { _all: 5 } }, { type: 'Blanco', _count: { _all: 9 } }])
      .mockResolvedValueOnce([{ country: 'Argentina', _count: { _all: 7 } }])
      .mockResolvedValueOnce([{ grape: 'Malbec', _count: { _all: 4 } }]);
    const f = await service.facets();
    expect(f.types[0]).toEqual({ key: 'Blanco', count: 9 });
    expect(f.countries[0]).toEqual({ key: 'Argentina', count: 7 });
    expect(f.grapes[0]).toEqual({ key: 'Malbec', count: 4 });
  });
});
```

- [ ] **Step 2: Correr (debe fallar)**

Run: `cd backend && npx jest src/modules/catalog/catalog.service.spec.ts -t facets`
Expected: FAIL — `service.facets is not a function`.

- [ ] **Step 3: Implementar `facets` y `bestsellers` en el servicio**

Agregar estos métodos dentro de `CatalogService` (antes del cierre de la clase):

```ts
  async facets() {
    const [types, countries, grapes] = await Promise.all([
      this.prisma.wine.groupBy({ by: ['type'], _count: { _all: true } }),
      this.prisma.wine.groupBy({ by: ['country'], _count: { _all: true } }),
      this.prisma.wine.groupBy({ by: ['grape'], _count: { _all: true } }),
    ]);
    const fmt = (rows: any[], key: string, limit?: number) => {
      const out = rows
        .filter((r) => r[key])
        .map((r) => ({ key: r[key] as string, count: r._count._all as number }))
        .sort((a, b) => b.count - a.count);
      return limit ? out.slice(0, limit) : out;
    };
    return {
      types: fmt(types, 'type'),
      countries: fmt(countries, 'country', 20),
      grapes: fmt(grapes, 'grape', 30),
    };
  }

  async bestsellers(limit = 10) {
    const wines = await this.prisma.wine.findMany({
      orderBy: [{ criticScore: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }],
      take: limit,
      include: { availabilities: { include: { establishment: true } } },
    });
    const aggMap = await this.aggregateReviews(wines.map((w) => w.id));
    return wines.map((w) => this.toCard(w, aggMap.get(w.id)));
  }
```

- [ ] **Step 4: Agregar las rutas (ANTES de `:id`)**

En `backend/src/modules/catalog/catalog.controller.ts`, agregar estos dos métodos **entre** `list()` y `get(':id')` (el orden importa: `facets`/`bestsellers` deben declararse antes que `:id` para no ser capturados por el parámetro):

```ts
  @Get('facets')
  @ApiOperation({ summary: 'Conteos por tipo, país y cepa para filtros' })
  facets() {
    return this.catalogService.facets();
  }

  @Get('bestsellers')
  @ApiOperation({ summary: 'Top de vinos por puntaje de crítica' })
  bestsellers() {
    return this.catalogService.bestsellers(10);
  }
```

- [ ] **Step 5: Correr el test (debe pasar)**

Run: `cd backend && npx jest src/modules/catalog/catalog.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Verificación E2E (backend corriendo)**

```bash
curl "http://localhost:3001/wines/facets"
curl "http://localhost:3001/wines/bestsellers"
```
Expected: facetas con conteos; 10 vinos en bestsellers. (Confirma que `/wines/facets` NO devuelve "Vino no encontrado": eso significaría que `:id` lo capturó.)

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/catalog
git commit -m "feat(catalog): endpoints de facetas y más vendidos"
```

---

### Task 7: Módulo `reviews` (crear y listar reseñas de usuarios)

**Files:**
- Create: `backend/src/modules/reviews/dto/create-review.dto.ts`
- Create: `backend/src/modules/reviews/reviews.service.ts`
- Create: `backend/src/modules/reviews/reviews.controller.ts`
- Create: `backend/src/modules/reviews/reviews.module.ts`
- Test: `backend/src/modules/reviews/reviews.service.spec.ts`
- Modify: `backend/src/app.module.ts` (registrar `ReviewsModule`)

**Interfaces:**
- Produces:
  - `createOrUpdate(userId, dto): Promise<{ review, avgRating, reviewCount }>`
  - `listForWine(wineId, page?, pageSize?): Promise<{ items: Array<{ id, rating, comment, createdAt, userName }>, total, avgRating, reviewCount }>`
  - Rutas: `POST /reviews` (auth), `GET /wines/:wineId/reviews`.
- Consumed by: frontend (Task 9/10).

- [ ] **Step 1: Escribir el test del servicio (falla primero)**

Create `backend/src/modules/reviews/reviews.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  const prisma: any = {
    review: {
      findFirst: jest.fn(), create: jest.fn(), update: jest.fn(),
      findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [ReviewsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ReviewsService);
  });

  it('crea la reseña si no existe y devuelve el agregado', async () => {
    prisma.review.findFirst.mockResolvedValue(null);
    prisma.review.create.mockResolvedValue({ id: 'r1', rating: 5 });
    prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 5 }, _count: { _all: 1 } });

    const res = await service.createOrUpdate('u1', { wineId: 'w1', rating: 5, comment: 'Top' });

    expect(prisma.review.create).toHaveBeenCalled();
    expect(res.avgRating).toBe(5);
    expect(res.reviewCount).toBe(1);
  });

  it('actualiza la reseña existente (una por usuario por vino)', async () => {
    prisma.review.findFirst.mockResolvedValue({ id: 'r9' });
    prisma.review.update.mockResolvedValue({ id: 'r9', rating: 3 });
    prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 3 }, _count: { _all: 1 } });

    const res = await service.createOrUpdate('u1', { wineId: 'w1', rating: 3 });

    expect(prisma.review.update).toHaveBeenCalledWith({ where: { id: 'r9' }, data: { rating: 3, comment: null } });
    expect(prisma.review.create).not.toHaveBeenCalled();
    expect(res.avgRating).toBe(3);
  });

  it('lista reseñas de un vino con nombre de usuario y agregado', async () => {
    prisma.$transaction.mockResolvedValue([
      [{ id: 'r1', rating: 4, comment: 'Bueno', createdAt: new Date('2026-01-01'), user: { name: 'Ana Pérez' } }],
      1,
      { _avg: { rating: 4 } },
    ]);
    const res = await service.listForWine('w1', 1, 10);
    expect(res.total).toBe(1);
    expect(res.avgRating).toBe(4);
    expect(res.items[0].userName).toBe('Ana Pérez');
  });
});
```

- [ ] **Step 2: Correr (debe fallar)**

Run: `cd backend && npx jest src/modules/reviews/reviews.service.spec.ts`
Expected: FAIL — `Cannot find module './reviews.service'`.

- [ ] **Step 3: Crear el DTO**

Create `backend/src/modules/reviews/dto/create-review.dto.ts`:

```ts
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty() @IsString() wineId!: string;
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() @MaxLength(800) comment?: string;
}
```

- [ ] **Step 4: Crear el servicio**

Create `backend/src/modules/reviews/reviews.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

const round1 = (n: number | null) => (n != null ? Math.round(n * 10) / 10 : null);

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrUpdate(userId: string, dto: CreateReviewDto) {
    const existing = await this.prisma.review.findFirst({
      where: { userId, wineId: dto.wineId, targetType: 'WINE' },
    });
    const data = { rating: dto.rating, comment: dto.comment ?? null };
    const review = existing
      ? await this.prisma.review.update({ where: { id: existing.id }, data })
      : await this.prisma.review.create({
          data: { userId, targetType: 'WINE', wineId: dto.wineId, ...data },
        });
    const agg = await this.prisma.review.aggregate({
      where: { wineId: dto.wineId, targetType: 'WINE' },
      _avg: { rating: true },
      _count: { _all: true },
    });
    return { review, avgRating: round1(agg._avg.rating), reviewCount: agg._count._all };
  }

  async listForWine(wineId: string, page = 1, pageSize = 10) {
    const take = Math.min(50, Math.max(1, pageSize));
    const skip = (Math.max(1, page) - 1) * take;
    const [items, total, agg] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where: { wineId, targetType: 'WINE' },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { user: { select: { name: true } } },
      }),
      this.prisma.review.count({ where: { wineId, targetType: 'WINE' } }),
      this.prisma.review.aggregate({ where: { wineId, targetType: 'WINE' }, _avg: { rating: true } }),
    ]);
    return {
      items: items.map((r: any) => ({
        id: r.id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, userName: r.user.name,
      })),
      total,
      avgRating: round1(agg._avg.rating),
      reviewCount: total,
    };
  }
}
```

- [ ] **Step 5: Crear el controller**

Create `backend/src/modules/reviews/reviews.controller.ts`:

```ts
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Post('reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Crear o actualizar mi reseña de un vino' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReviewDto) {
    return this.service.createOrUpdate(user.userId, dto);
  }

  @Get('wines/:wineId/reviews')
  @ApiOperation({ summary: 'Reseñas de un vino (paginadas) + promedio' })
  list(@Param('wineId') wineId: string, @Query('page') page?: string) {
    return this.service.listForWine(wineId, Number(page) || 1, 10);
  }
}
```

- [ ] **Step 6: Crear el módulo y registrarlo**

Create `backend/src/modules/reviews/reviews.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
```

En `backend/src/app.module.ts`: importar y agregar `ReviewsModule` a `imports`:

```ts
import { ReviewsModule } from './modules/reviews/reviews.module';
```
y añadir `ReviewsModule,` al array `imports` (después de `ReservationsModule`).

- [ ] **Step 7: Correr el test (debe pasar)**

Run: `cd backend && npx jest src/modules/reviews/reviews.service.spec.ts`
Expected: PASS.

- [ ] **Step 8: Verificación E2E (backend corriendo)**

Obtener un token (login del seed) y crear una reseña:
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login -H "Content-Type: application/json" -d '{"email":"ana@example.com","password":"1234"}' | python -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
WID=$(curl -s "http://localhost:3001/wines?pageSize=1" | python -c "import sys,json;print(json.load(sys.stdin)['items'][0]['id'])")
curl -s -X POST http://localhost:3001/reviews -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"wineId\":\"$WID\",\"rating\":5,\"comment\":\"Excelente\"}"
curl -s "http://localhost:3001/wines/$WID/reviews"
```
Expected: la creación devuelve `{review, avgRating:5, reviewCount:1}`; el listado muestra la reseña con `userName: "Ana Pérez"`.

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/reviews backend/src/app.module.ts
git commit -m "feat(reviews): módulo de reseñas de usuarios (crear/actualizar + listar)"
```

---

## Phase C — Frontend

### Task 8: `api.js` — parámetros de catálogo y nuevos wrappers

**Files:**
- Modify: `web/js/api.js`

**Interfaces:**
- Produces: `getWines(params)→{items,total,page,pageSize}`, `getWine(id)`, `getWineReviews(id,page)`, `getFacets()`, `getBestsellers()`, `createReview(payload)`.
- Consumed by: Tasks 9 y 10.

- [ ] **Step 1: Reemplazar `getWines` y agregar wrappers**

En `web/js/api.js`, reemplazar la función `getWines` (líneas 22-26) por el bloque siguiente y dejar el resto del archivo igual:

```js
function qs(params) {
  const p = new URLSearchParams();
  Object.keys(params || {}).forEach((k) => {
    const v = params[k];
    if (v !== undefined && v !== null && v !== '') p.append(k, v);
  });
  const s = p.toString();
  return s ? '?' + s : '';
}

export async function getWines(params) {
  const r = await fetch(API + '/wines' + qs(params));
  if (!r.ok) throw new Error('No se pudo cargar el catálogo.');
  return r.json(); // { items, total, page, pageSize }
}

export async function getWine(id) {
  const r = await fetch(API + '/wines/' + encodeURIComponent(id));
  if (!r.ok) throw new Error('No se pudo cargar el vino.');
  return r.json();
}

export async function getFacets() {
  const r = await fetch(API + '/wines/facets');
  if (!r.ok) throw new Error('No se pudieron cargar los filtros.');
  return r.json();
}

export async function getBestsellers() {
  const r = await fetch(API + '/wines/bestsellers');
  if (!r.ok) throw new Error('No se pudieron cargar los más vendidos.');
  return r.json();
}

export async function getWineReviews(id, page) {
  const r = await fetch(API + '/wines/' + encodeURIComponent(id) + '/reviews' + qs({ page }));
  if (!r.ok) throw new Error('No se pudieron cargar las reseñas.');
  return r.json();
}
```

- [ ] **Step 2: Agregar `createReview` (usa `authFetch`)**

Al final de `web/js/api.js`, después de `myReservations`, agregar:

```js
export function createReview(payload) { return authFetch('/reviews', { method: 'POST', body: JSON.stringify(payload) }); }
```

- [ ] **Step 3: Verificación (manual, backend corriendo)**

Servir `web/` y en la consola del navegador (en `http://localhost:8080`):
```js
import('./js/api.js').then(a => a.getWines({ pageSize: 2 })).then(console.log);
```
Expected: objeto con `items` (2), `total`, `page`, `pageSize`.

- [ ] **Step 4: Commit**

```bash
git add web/js/api.js
git commit -m "feat(web/api): catálogo con parámetros + wrappers de detalle, facetas y reseñas"
```

---

### Task 9: `app.js` — catálogo paginado server-side

**Files:**
- Modify: `web/js/app.js`
- Modify: `web/index.html:87-89` (botones de orden)
- Modify: `web/css/styles.css` (regla `.bottle-img` y `.load-more`)

**Interfaces:**
- Consumes: `getWines/getFacets/getBestsellers` (Task 8), `openDetail` (Task 10, se cablea aquí el click pero la función se crea en Task 10 — hasta entonces el click de detalle no hace nada).
- Produces: estado paginado y render del catálogo desde el backend.

- [ ] **Step 1: Actualizar imports y estado**

En `web/js/app.js`, reemplazar la línea de import de la API (línea 6):
```js
import { getWines } from './api.js';
```
por:
```js
import { getWines, getFacets, getBestsellers } from './api.js';
```

Reemplazar el objeto `state` (líneas 35-46) por:
```js
  var state = {
    items: [],
    raw: [], // alias de items, para los modos comparar/mapa
    total: 0,
    page: 1,
    pageSize: 24,
    term: '',
    type: '',
    country: '',
    sort: 'relevancia',
    mode: 'lista',
    price: 'all',
    facets: { types: [], countries: [], grapes: [] },
    bestsellers: [],
    token: getToken(),
    user: getUser(),
    loading: false,
    userLoc: USER_LOC,
  };
```

- [ ] **Step 2: Reemplazar `transform`, `filtered` y quitar helpers muertos**

Reemplazar `transform` (líneas 72-100) por:
```js
  function transform(w) {
    var offers = (w.offers || []).map(function (o) {
      return {
        storeId: o.establishmentId, storeName: o.storeName, lat: o.lat, lng: o.lng,
        price: Number(o.price), status: o.status,
        dist: round1(haversineKm(state.userLoc.lat, state.userLoc.lng, o.lat, o.lng)), best: false,
      };
    }).sort(function (a, b) { return a.price - b.price; });
    if (offers.length) offers[0].best = true;
    var nearest = offers.slice().sort(function (a, b) { return a.dist - b.dist; })[0] || null;
    var agotado = offers.length > 0 && offers.every(function (o) { return o.status === 'AGOTADO'; });
    return {
      id: w.id, name: w.name, vintage: w.vintage, winery: w.wineryName, grape: w.grape,
      country: w.country, region: (w.origin || '').split(',')[0].trim(), type: w.type,
      imageUrl: w.imageUrl, offers: offers,
      bestPrice: w.bestPrice != null ? Number(w.bestPrice) : Number(w.referencePrice),
      storeCount: w.storeCount != null ? w.storeCount : offers.length,
      nearest: nearest, criticScore: w.criticScore,
      rating: w.avgRating, reviews: w.reviewCount || 0,
      stock: agotado
        ? { kind: 'agotado', text: 'Agotado', color: '#C0392B' }
        : { kind: 'disponible', text: 'Disponible', color: '#2E8B57' },
    };
  }
```

Reemplazar `filtered` (líneas 113-119) por (el backend ya filtró y ordenó; aquí solo se devuelve lo cargado):
```js
  function filtered() { return state.items; }
```

Eliminar las funciones `matchTerm` (102-106), `priceOk` (107-112) y `counts` (120-124): ya no se usan (el filtrado y los conteos son server-side).

- [ ] **Step 3: Reemplazar `loadWines` por carga paginada**

Reemplazar `loadWines` (líneas 126-135) por:
```js
  function priceParams() {
    if (state.price === 'lt15') return { priceMax: 15 };
    if (state.price === 'mid') return { priceMin: 15, priceMax: 25 };
    if (state.price === 'gt25') return { priceMin: 25 };
    return {};
  }

  async function loadPage(reset) {
    if (state.loading) return;
    state.loading = true;
    if (reset) { state.page = 1; state.items = []; }
    var params = Object.assign({
      q: state.term, type: state.type, country: state.country,
      sort: state.sort, page: state.page, pageSize: state.pageSize,
    }, priceParams());
    try {
      var res = await getWines(params);
      state.total = res.total;
      var mapped = res.items.map(transform);
      state.items = reset ? mapped : state.items.concat(mapped);
      state.raw = state.items;
    } catch (e) {
      if (reset) { state.items = []; state.raw = []; state.total = 0; }
      // eslint-disable-next-line no-console
      console.warn('No se pudo cargar el catálogo:', e);
    } finally {
      state.loading = false;
    }
  }

  // recarga desde cero ante cualquier cambio de filtro/búsqueda/orden
  async function reload() {
    renderToolbar();
    $('#view').innerHTML = '<div style="text-align:center;padding:48px;color:var(--muted)">Cargando…</div>';
    await loadPage(true);
    renderView();
    renderToolbar();
    toggleHome();
  }
```

- [ ] **Step 4: Reemplazar `renderFilters` (usa facetas) y `renderBestsellers` (usa API)**

Reemplazar `renderFilters` (líneas 203-217) por:
```js
  function frow(field, key, label, count) {
    var active = (field === 'type' && state.type === key) ||
                 (field === 'country' && state.country === key) ||
                 (field === 'price' && state.price === key);
    return '<div class="frow ' + (active ? 'active' : '') + '" data-' + field + '="' + esc(key) + '">' +
      '<span>' + esc(label) + '</span>' + (count != null ? '<span class="fcount">' + count + '</span>' : '') + '</div>';
  }
  function renderFilters() {
    var f = state.facets;
    var html = '';
    html += '<div class="filter-group"><div class="ftitle">Tipo</div>' +
      f.types.map(function (c) { return frow('type', c.key, c.key, c.count); }).join('') + '</div>';
    html += '<div class="filter-group"><div class="ftitle">País</div>' +
      f.countries.map(function (c) { return frow('country', c.key, c.key, c.count); }).join('') + '</div>';
    html += '<div class="filter-group" style="border-bottom:none"><div class="ftitle">Precio</div>' +
      PRICES.map(function (p) { return frow('price', p.key, p.label, null); }).join('') + '</div>';
    $('#filters').innerHTML = html;
  }
```

Reemplazar `renderBestsellers` (líneas 172-176) por:
```js
  function renderBestsellers() {
    var list = (state.bestsellers || []).map(transform);
    $('#bestsellers').innerHTML = list.map(miniCard).join('');
  }
```

- [ ] **Step 5: Helpers de media/rating y tarjetas reales**

Agregar (cerca de `bottleSVG`, p. ej. después de la línea 69) estos helpers:
```js
  function mediaHtml(w) {
    if (w.imageUrl) return '<img class="bottle-img" src="' + esc(w.imageUrl) + '" alt="' + esc(w.name) + '" loading="lazy" />';
    return bottleSVG(w.type);
  }
  function ratingHtml(w) {
    var parts = [];
    if (w.criticScore != null) parts.push('★ <b>' + w.criticScore + '</b> <span>crítica</span>');
    if (w.reviews > 0 && w.rating != null) parts.push('<span>' + Number(w.rating).toFixed(1) + '★ · ' + w.reviews + '</span>');
    if (!parts.length) return '<div class="rating"><span>Sin reseñas aún</span></div>';
    return '<div class="rating">' + parts.join(' · ') + '</div>';
  }
```

Reemplazar `miniCard` (líneas 164-171) por:
```js
  function miniCard(w) {
    return '<div class="card mini" data-detail="' + w.id + '">' +
      '<div class="card-img"><span class="top-tag">TOP</span>' + mediaHtml(w) + '</div>' +
      '<div class="card-body"><div class="winery">' + esc(w.winery) + '</div>' +
      '<div class="pname">' + esc(w.name) + '</div>' +
      ratingHtml(w) +
      '<div class="price-row"><span class="from">desde</span><span class="price">' + money(w.bestPrice) + '</span></div></div></div>';
  }
```

Reemplazar `gridCard` (líneas 229-244) por:
```js
  function gridCard(w) {
    return '<div class="card" data-detail="' + w.id + '">' +
      '<div class="card-img">' + mediaHtml(w) +
        '<button class="wish" title="Favorito"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#641E2E" stroke-width="2"><path d="M12 20s-7-4.4-9.3-8.4C1.2 8.7 2.9 5.5 6.2 5.5c1.9 0 3.2 1 3.8 1.9C10.6 6.5 11.9 5.5 13.8 5.5c3.3 0 5 3.2 3.5 6.1C19 15.6 12 20 12 20z"/></svg></button>' +
        '<div class="stock" style="color:' + w.stock.color + '"><span class="dot" style="background:' + w.stock.color + '"></span>' + w.stock.text + '</div>' +
      '</div>' +
      '<div class="card-body">' +
        '<div class="winery">' + esc(w.winery) + '</div>' +
        '<div class="pname">' + esc(w.name) + (w.vintage ? ' ' + w.vintage : '') + '</div>' +
        '<div class="pchip">' + esc(w.grape) + ' · ' + esc(w.region) + '</div>' +
        ratingHtml(w) +
        '<div class="price-row"><span class="from">desde</span><span class="price">' + money(w.bestPrice) + '</span></div>' +
        '<div class="stores">en ' + w.storeCount + ' tiendas</div>' +
        '<button class="btn-reserve" data-reserve="' + w.id + '">Reservar</button>' +
      '</div></div>';
  }
```

En `compareCard` (líneas 246-257), reemplazar las dos apariciones de `'★ <b>' + w.rating.toFixed(1) + '</b> <span>(' + w.reviews + ')</span>'` por una llamada equivalente: dejar la línea del rating como `ratingHtml(w)`. Es decir, reemplazar el fragmento:
```js
'<div class="winery">' + esc(w.winery) + '</div><div class="rating">★ <b>' + w.rating.toFixed(1) + '</b> <span>(' + w.reviews + ')</span></div></div></div>' +
```
por:
```js
'<div class="winery">' + esc(w.winery) + '</div>' + ratingHtml(w) + '</div></div>' +
```

- [ ] **Step 6: `renderToolbar` con total + "Cargar más" en `renderView`**

Reemplazar `renderToolbar` (líneas 219-227) por:
```js
  function renderToolbar() {
    $('#resCount').textContent = state.total;
    document.querySelectorAll('#sortOpts .opt').forEach(function (b) { b.classList.toggle('active', b.dataset.sort === state.sort); });
    document.querySelectorAll('#modes .mode').forEach(function (b) { b.classList.toggle('active', b.dataset.mode === state.mode); });
  }
```

Reemplazar `renderView` (líneas 259-272) por (agrega botón "Cargar más" en modo lista):
```js
  function renderView() {
    var view = $('#view');
    var list = filtered();
    if (state.mode === 'lista') {
      if (!list.length) { view.innerHTML = emptyState(); return; }
      var more = state.items.length < state.total
        ? '<div class="load-more-wrap"><button class="load-more" id="loadMore">Cargar más (' + state.items.length + ' de ' + state.total + ')</button></div>'
        : '';
      view.innerHTML = '<div class="grid">' + list.map(gridCard).join('') + '</div>' + more;
    } else if (state.mode === 'comparar') {
      var cmp = list.filter(function (w) { return w.offers.length > 1; }).sort(function (a, b) { return b.offers.length - a.offers.length; });
      if (!cmp.length) { view.innerHTML = emptyState(); return; }
      view.innerHTML = '<div class="compare-wrap">' + cmp.map(compareCard).join('') + '</div>';
    } else {
      view.innerHTML = mapView(list);
    }
  }
```

- [ ] **Step 7: Reescribir `bind` (handlers de filtros server-side + detalle + cargar más)**

Reemplazar `bind` (líneas 348-371) por:
```js
  function bind() {
    var searchTimer = null;
    $('#search').addEventListener('input', function (e) {
      state.term = e.target.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { reload(); }, 300);
    });

    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-cat],[data-sort],[data-mode],[data-open],[data-reserve],[data-detail],[data-type],[data-country],[data-price],[data-logout],#loadMore,#clearFilters');
      if (!t) return;
      if (t.id === 'clearFilters') { state.term = ''; state.type = ''; state.country = ''; state.price = 'all'; $('#search').value = ''; reload(); return; }
      if (t.id === 'loadMore') { e.preventDefault(); state.page += 1; loadPage(false).then(function () { renderView(); }); return; }
      if (t.hasAttribute('data-cat')) {
        e.preventDefault();
        var v = t.getAttribute('data-cat');
        var TYPES = ['Tinto', 'Blanco', 'Espumante', 'Rosado', 'Fortificado'];
        var COUNTRIES = ['Venezuela', 'Argentina', 'Chile', 'España', 'Italia', 'Francia', 'Portugal', 'US'];
        state.type = ''; state.country = ''; state.term = ''; state.price = 'all'; $('#search').value = '';
        if (TYPES.indexOf(v) !== -1) state.type = v;
        else if (COUNTRIES.indexOf(v) !== -1) state.country = v;
        else if (v) state.term = v;
        reload(); window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (t.hasAttribute('data-type')) { state.type = (state.type === t.getAttribute('data-type') ? '' : t.getAttribute('data-type')); reload(); }
      else if (t.hasAttribute('data-country')) { state.country = (state.country === t.getAttribute('data-country') ? '' : t.getAttribute('data-country')); reload(); }
      else if (t.hasAttribute('data-price')) { state.price = t.getAttribute('data-price'); reload(); }
      else if (t.hasAttribute('data-sort')) { state.sort = t.getAttribute('data-sort'); reload(); }
      else if (t.hasAttribute('data-mode')) { state.mode = t.getAttribute('data-mode'); renderToolbar(); renderView(); toggleHome(); }
      else if (t.hasAttribute('data-open')) { e.preventDefault(); window.location.href = 'login.html' + (t.getAttribute('data-open') === 'register' ? '?register' : ''); }
      else if (t.hasAttribute('data-reserve')) { e.stopPropagation(); reserve(t.getAttribute('data-reserve')); }
      else if (t.hasAttribute('data-detail')) { e.preventDefault(); if (window.CavaDetail) window.CavaDetail.open(t.getAttribute('data-detail')); }
      else if (t.hasAttribute('data-logout')) { logout(); state.user = null; render(); }
    });
  }
```

- [ ] **Step 8: Reescribir `init` (carga facetas + bestsellers + primera página)**

Reemplazar `init` (líneas 373-396) por:
```js
  async function init() {
    bind();
    renderCarousel(); renderTiles();
    renderAccount(); renderCatbar();
    $('#view').innerHTML = '<div style="text-align:center;padding:60px;color:var(--muted)">Cargando catálogo…</div>';

    try {
      var f = await getFacets();
      state.facets = f;
    } catch (e) { /* filtros vacíos si falla */ }
    try {
      state.bestsellers = await getBestsellers();
    } catch (e) { state.bestsellers = []; }
    renderFilters(); renderBestsellers();

    await loadPage(true);
    render();

    getUserLocation().then(function (loc) {
      state.userLoc = loc;
      state.items = state.items.map(function (w) { return w; }); // recalcular distancias en próximos renders
      renderView();
      var chip = $('#locchip');
      if (chip) chip.textContent = loc.source === 'gps' ? '📍 Tu ubicación' : '📍 Caracas (aprox.)';
    });
  }
```

Nota: `render()` (líneas 138-146) llama `renderAccount/renderCatbar/renderBestsellers/renderFilters/renderToolbar/renderView/toggleHome`; todas existen tras estos cambios. Dejar `render()` como está.

- [ ] **Step 9: Botones de orden en `index.html`**

Reemplazar las líneas 87-89 de `web/index.html`:
```html
            <button class="opt active" data-sort="cercania">Cercanía</button>
            <button class="opt" data-sort="precio">Precio</button>
            <button class="opt" data-sort="calificacion">Calificación</button>
```
por:
```html
            <button class="opt active" data-sort="relevancia">Relevancia</button>
            <button class="opt" data-sort="precio_asc">Precio</button>
            <button class="opt" data-sort="calificacion">Calificación</button>
```

- [ ] **Step 10: CSS de imagen y "cargar más"**

Agregar al final de `web/css/styles.css`:
```css
/* Foto de botella (si existe; si no, se usa la SVG) */
.card .card-img .bottle-img { width: 100%; height: 100%; object-fit: contain; padding: 8px; }
/* Cargar más */
.load-more-wrap { display: flex; justify-content: center; margin: 22px 0; }
.load-more { background: var(--card); border: 1px solid var(--gold); color: var(--wine); font-weight: 700; padding: 11px 26px; border-radius: 50px; transition: var(--transition); }
.load-more:hover { background: var(--gold-soft); }
```

- [ ] **Step 11: Verificación (manual, backend corriendo)**

Servir `web/` y abrir `http://localhost:8080`. Verificar:
- El catálogo carga vinos reales con marcas y un contador grande de vinos (~32.000).
- Buscar (p. ej. "malbec") filtra; los filtros de Tipo/País muestran conteos; Precio filtra; Orden cambia el listado.
- "Cargar más" agrega 24 vinos más.
- Las estrellas son reales ("★ 92 crítica" o "Sin reseñas aún"), ya no inventadas.
- Modo Comparar y Mapa siguen funcionando sobre los vinos cargados.

- [ ] **Step 12: Commit**

```bash
git add web/js/app.js web/index.html web/css/styles.css
git commit -m "feat(web): catálogo paginado server-side con filtros, orden y calificaciones reales"
```

---

### Task 10: Modal de detalle del vino con referencias + reseñas

**Files:**
- Create: `web/js/detail.js`
- Create: `web/css/detail.css`
- Modify: `web/index.html` (link a `detail.css`; `<div id="detail">`; cargar `detail.js`)

**Interfaces:**
- Consumes: `getWine`, `getWineReviews`, `createReview` (Task 8); `getUser` (`store.js`); `openCheckout` (`checkout.js`).
- Produces: `window.CavaDetail.open(wineId)` (lo invoca el handler `data-detail` de `app.js` Task 9 Step 7).

- [ ] **Step 1: Enlazar CSS, contenedor y script en `index.html`**

En `web/index.html`, en el `<head>` después de la línea 12 (`<link rel="stylesheet" href="css/checkout.css" />`), agregar:
```html
  <link rel="stylesheet" href="css/detail.css" />
```

Después de la línea 135 (`<div id="checkout"></div>`), agregar:
```html
  <div id="detail"></div>
```

Después de la línea 136 (`<script type="module" src="js/app.js"></script>`), agregar:
```html
  <script type="module" src="js/detail.js"></script>
```

- [ ] **Step 2: Crear `web/js/detail.js`**

Create `web/js/detail.js`:

```js
import * as api from './api.js';
import { getUser } from './store.js';
import { money } from './money.js';
import { openCheckout } from './checkout.js';

const $ = (s, r) => (r || document).querySelector(s);
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

let current = null; // { wine, reviews }

function bottleSVG(type) {
  const t = (type || '').toLowerCase();
  const c = t === 'blanco' ? '#C9B560' : t === 'rosado' ? '#E08AA0' : t === 'espumante' ? '#D9B45A' : t === 'fortificado' ? '#5A1622' : '#641E2E';
  return '<svg viewBox="0 0 30 48" aria-hidden="true"><path d="M12 1 h6 v9 c0 2 3 4 3 9 v25 c0 2 -1 3 -3 3 h-6 c-2 0 -3 -1 -3 -3 V19 c0 -5 3 -7 3 -9 z" fill="' + c + '"/><rect x="9" y="26" width="12" height="11" rx="1.5" fill="#fff" opacity="0.92"/></svg>';
}

function media(w) {
  if (w.imageUrl) return '<img src="' + esc(w.imageUrl) + '" alt="' + esc(w.name) + '" />';
  return bottleSVG(w.type);
}

function stars(n) {
  const full = Math.round(n || 0);
  let s = '';
  for (let i = 1; i <= 5; i++) s += '<span class="star ' + (i <= full ? 'on' : '') + '">★</span>';
  return s;
}

function referenciasHtml(w) {
  const rows = [
    ['Bodega', w.wineryName],
    ['Tipo', w.type],
    ['Uva', w.grape],
    ['Origen', w.origin],
    ['Añada', w.vintage],
    ['Denominación', w.denominationOfOrigin],
    ['Crianza', w.aging],
    ['Puntaje de crítica', w.criticScore != null ? w.criticScore + ' / 100' : null],
  ].filter((r) => r[1] != null && r[1] !== '');
  return '<div class="dt-facts">' + rows.map((r) =>
    '<div class="dt-fact"><span class="k">' + esc(r[0]) + '</span><span class="v">' + esc(r[1]) + '</span></div>').join('') + '</div>' +
    (w.tastingNote ? '<p class="dt-note">“' + esc(w.tastingNote) + '”</p>' : '');
}

function offersHtml(w) {
  const offers = (w.offers || []).slice().sort((a, b) => a.price - b.price);
  if (!offers.length) return '';
  return '<div class="dt-offers"><h4>Disponible en</h4>' + offers.map((o, i) =>
    '<div class="dt-offer"><span>' + esc(o.storeName) + (i === 0 ? ' <b class="best">más barato</b>' : '') + '</span>' +
    '<span class="op">' + money(o.price) + (o.status === 'AGOTADO' ? ' · agotado' : '') + '</span></div>').join('') + '</div>';
}

function reviewsHtml(rev) {
  const head = '<div class="dt-rev-head"><h4>Reseñas</h4>' +
    (rev.reviewCount > 0 ? '<span>' + stars(rev.avgRating) + ' ' + (rev.avgRating != null ? rev.avgRating.toFixed(1) : '') + ' · ' + rev.reviewCount + '</span>' : '<span>Sé el primero en opinar</span>') + '</div>';
  const list = rev.items.length
    ? rev.items.map((r) =>
        '<div class="dt-rev"><div class="dt-rev-top"><b>' + esc(r.userName) + '</b><span>' + stars(r.rating) + '</span></div>' +
        (r.comment ? '<p>' + esc(r.comment) + '</p>' : '') + '</div>').join('')
    : '<p class="dt-empty">Aún no hay reseñas de usuarios.</p>';
  return '<div class="dt-reviews">' + head + list + '</div>';
}

function formHtml() {
  if (!getUser()) return '<div class="dt-form-login">Inicia sesión para dejar tu reseña. <a href="login.html">Entrar</a></div>';
  return '<form class="dt-form" id="dt-form">' +
    '<div class="dt-stars-input" id="dt-stars">' +
    [1, 2, 3, 4, 5].map((i) => '<button type="button" class="star-btn" data-star="' + i + '">★</button>').join('') + '</div>' +
    '<textarea id="dt-comment" maxlength="800" placeholder="¿Qué te pareció este vino?"></textarea>' +
    '<div class="dt-err" id="dt-err" hidden></div>' +
    '<button class="dt-submit" type="submit">Publicar reseña</button></form>';
}

function render() {
  const { wine, reviews } = current;
  const el = $('#detail');
  el.innerHTML =
    '<div class="dt-bg"><div class="dt-modal">' +
      '<button class="dt-close" aria-label="Cerrar">✕</button>' +
      '<div class="dt-hero"><div class="dt-img">' + media(wine) + '</div>' +
        '<div class="dt-hero-info"><div class="dt-winery">' + esc(wine.wineryName) + '</div>' +
        '<h3>' + esc(wine.name) + (wine.vintage ? ' ' + wine.vintage : '') + '</h3>' +
        '<div class="dt-price">desde <b>' + money(wine.bestPrice) + '</b></div>' +
        '<button class="dt-reserve" id="dt-reserve">Reservar</button></div></div>' +
      '<div class="dt-body">' + referenciasHtml(wine) + offersHtml(wine) + reviewsHtml(reviews) + formHtml() + '</div>' +
    '</div></div>';
  bind();
}

let pickedStar = 0;
function bind() {
  $('#detail .dt-close').onclick = close;
  $('#detail .dt-bg').onclick = (e) => { if (e.target.classList.contains('dt-bg')) close(); };
  const resBtn = $('#dt-reserve');
  if (resBtn) resBtn.onclick = () => { close(); openCheckout(toCheckoutWine(current.wine), null); };

  const starsBox = $('#dt-stars');
  if (starsBox) {
    starsBox.querySelectorAll('.star-btn').forEach((b) => {
      b.onclick = () => {
        pickedStar = Number(b.dataset.star);
        starsBox.querySelectorAll('.star-btn').forEach((x) => x.classList.toggle('on', Number(x.dataset.star) <= pickedStar));
      };
    });
  }
  const form = $('#dt-form');
  if (form) form.onsubmit = submitReview;
}

function toCheckoutWine(w) {
  // openCheckout espera { winery, name, vintage, offers:[{storeName,price,dist,lat,lng,...}] }
  return {
    winery: w.wineryName, name: w.name, vintage: w.vintage,
    offers: (w.offers || []).map((o) => ({
      storeId: o.establishmentId, storeName: o.storeName, price: Number(o.price), lat: o.lat, lng: o.lng,
    })),
  };
}

async function submitReview(e) {
  e.preventDefault();
  const err = $('#dt-err');
  const comment = $('#dt-comment').value.trim();
  if (!pickedStar) { err.textContent = 'Elige cuántas estrellas (1 a 5).'; err.hidden = false; return; }
  const btn = $('#dt-form .dt-submit');
  btn.disabled = true; btn.textContent = 'Publicando…';
  try {
    await api.createReview({ wineId: current.wine.id, rating: pickedStar, comment });
    current.reviews = await api.getWineReviews(current.wine.id, 1);
    pickedStar = 0;
    render();
  } catch (e2) {
    err.textContent = e2.message || 'No se pudo publicar.'; err.hidden = false;
    btn.disabled = false; btn.textContent = 'Publicar reseña';
  }
}

async function open(wineId) {
  const el = $('#detail');
  el.innerHTML = '<div class="dt-bg"><div class="dt-modal"><div class="dt-loading">Cargando…</div></div></div>';
  try {
    const [wine, reviews] = await Promise.all([api.getWine(wineId), api.getWineReviews(wineId, 1)]);
    current = { wine, reviews };
    render();
  } catch (e) {
    el.innerHTML = '<div class="dt-bg"><div class="dt-modal"><button class="dt-close" aria-label="Cerrar">✕</button><div class="dt-loading">No se pudo cargar el vino.</div></div></div>';
    $('#detail .dt-close').onclick = close;
  }
}

function close() { $('#detail').innerHTML = ''; current = null; pickedStar = 0; }

window.CavaDetail = { open };
```

- [ ] **Step 3: Crear `web/css/detail.css`**

Create `web/css/detail.css`:

```css
/* CavaLocal — Modal de detalle del vino (referencias + reseñas) */
.dt-bg { position: fixed; inset: 0; background: rgba(20,8,12,0.55); display: flex; align-items: flex-start; justify-content: center; padding: 40px 16px; z-index: 1500; overflow-y: auto; }
.dt-modal { background: var(--card); border-radius: var(--radius-xl); border-top: 3px solid var(--gold); width: 100%; max-width: 640px; box-shadow: var(--shadow-lg); position: relative; animation: coRise 0.3s cubic-bezier(0.2,0.7,0.2,1); }
.dt-close { position: absolute; top: 14px; right: 14px; width: 34px; height: 34px; border-radius: 50%; background: var(--surface); font-size: 16px; z-index: 2; }
.dt-loading { padding: 60px; text-align: center; color: var(--muted); }
.dt-hero { display: flex; gap: 18px; padding: 26px 26px 16px; border-bottom: 1px solid var(--border); }
.dt-img { width: 110px; height: 150px; background: var(--thumb); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.dt-img svg { height: 80%; } .dt-img img { width: 100%; height: 100%; object-fit: contain; padding: 8px; }
.dt-winery { font-size: 11px; letter-spacing: 0.6px; font-weight: 800; color: var(--gold); text-transform: uppercase; }
.dt-hero-info h3 { font-family: var(--font-display); color: var(--ink); font-size: 22px; margin: 4px 0 8px; }
.dt-price { color: var(--muted); font-size: 14px; } .dt-price b { color: var(--wine); font-size: 20px; }
.dt-reserve { margin-top: 12px; background: var(--wine); color: #fff; border-radius: var(--radius-sm); padding: 10px 22px; font-weight: 700; }
.dt-body { padding: 20px 26px 28px; }
.dt-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; }
.dt-fact { display: flex; justify-content: space-between; gap: 10px; border-bottom: 1px dashed var(--border); padding: 5px 0; font-size: 13px; }
.dt-fact .k { color: var(--muted); } .dt-fact .v { font-weight: 700; color: var(--ink); text-align: right; }
.dt-note { font-style: italic; color: var(--ink); background: var(--surface); border-left: 3px solid var(--gold); padding: 12px 14px; border-radius: 8px; margin: 16px 0; }
.dt-offers { margin: 18px 0; } .dt-offers h4, .dt-rev-head h4 { font-size: 14px; color: var(--wine); margin-bottom: 8px; }
.dt-offer { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
.dt-offer .best { color: var(--wine); font-size: 10px; } .dt-offer .op { font-weight: 800; }
.dt-reviews { margin-top: 20px; }
.dt-rev-head { display: flex; align-items: center; justify-content: space-between; }
.dt-rev { border-top: 1px solid var(--border); padding: 10px 0; }
.dt-rev-top { display: flex; justify-content: space-between; font-size: 14px; }
.dt-rev p { color: var(--muted); font-size: 13px; margin-top: 4px; }
.dt-empty { color: var(--muted); font-size: 13px; padding: 8px 0; }
.star { color: var(--border); } .star.on { color: var(--gold); }
.dt-form { margin-top: 16px; display: flex; flex-direction: column; gap: 10px; }
.dt-stars-input { display: flex; gap: 4px; }
.star-btn { font-size: 26px; color: var(--border); background: none; line-height: 1; } .star-btn.on { color: var(--gold); }
.dt-form textarea { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px; font: inherit; resize: vertical; min-height: 70px; }
.dt-submit { align-self: flex-start; background: var(--wine); color: #fff; padding: 10px 22px; border-radius: var(--radius-sm); font-weight: 700; }
.dt-err { color: #C0392B; font-size: 13px; }
.dt-form-login { margin-top: 16px; color: var(--muted); font-size: 14px; } .dt-form-login a { color: var(--wine); font-weight: 700; }
```

- [ ] **Step 4: Verificación (manual, backend corriendo)**

Servir `web/` y abrir `http://localhost:8080`. Click en una tarjeta de vino → abre el modal con: ficha técnica (referencias), nota de cata, precios por tienda, y la sección de reseñas. Sin sesión: muestra "Inicia sesión para dejar tu reseña". Con sesión (login del seed): elegir estrellas + comentario → "Publicar reseña" → la reseña aparece y el promedio se actualiza. Cerrar con la ✕ o clic fuera. Probar también "Reservar" desde el modal → abre el checkout.

- [ ] **Step 5: Commit**

```bash
git add web/js/detail.js web/css/detail.css web/index.html
git commit -m "feat(web): modal de detalle del vino con referencias y reseñas de usuarios"
```

---

## Self-Review

**1. Cobertura del spec** (`2026-06-24-catalogo-vinos-reviews-y-fixes-design.md`, sección 3.4 y 4-7):
- 3.4.1 Fuente de datos → Tasks 2/4 (dataset `wine-ratings`).
- 3.4.2 Import idempotente + disponibilidades → Tasks 3/4.
- 3.4.3 Modelo/migración (criticScore, country, imageUrl, unique reseña) → Task 1.
- 3.4.4 Catálogo paginado + facetas + bestsellers → Tasks 5/6.
- 3.4.5 Módulo reviews → Task 7.
- 3.4.6 Frontend paginado + detalle con reseñas → Tasks 8/9/10.
- (Los puntos 3.1/3.2/3.3 del spec — login/hover/video — están en el plan `2026-06-24-fixes-login-hover-video.md`.)

**2. Placeholders:** ninguno; cada paso muestra el código completo. Único “best-effort” documentado y aprobado: la marca derivada del nombre y precios/disponibilidades sintéticos.

**3. Consistencia de tipos:** `WineCard` (Task 5) se consume igual en `transform` (Task 9) y `detail.js` (Task 10): `offers[].establishmentId/storeName/price/lat/lng/status`, `bestPrice`, `avgRating`, `reviewCount`, `criticScore`, `imageUrl`. `mapRowToWine`/`buildAvailabilitiesForWine` (Tasks 2/3) se usan con esas firmas en el script (Task 4). El handler `data-detail` (Task 9) llama `window.CavaDetail.open` que define `detail.js` (Task 10).

**4. Notas de riesgo:** Task 6 exige declarar `facets`/`bestsellers` ANTES de `:id` en el controller (verificado en Step 6). Task 9 deja el modo "comparar"/"mapa" operando sobre la página cargada (no sobre los 32k), consistente con el spec ("distancia/cercanía sobre la página actual").
