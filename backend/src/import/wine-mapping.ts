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
  if (/ros[eé](?:\b|$|\s)|rosado/.test(s)) return 'Rosado';
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
  return y >= 1900 && y <= new Date().getFullYear() + 1 ? y : null;
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
