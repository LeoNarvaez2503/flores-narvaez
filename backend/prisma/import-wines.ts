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
