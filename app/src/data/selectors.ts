/**
 * Selectores: transforman un Dataset (vinos + establecimientos + disponibilidad)
 * en las estructuras que consume la UI. El Dataset puede ser local (catalog.ts)
 * o traído del backend (remote.ts) — la lógica es la misma.
 * La distancia usa Haversine desde la ubicación del usuario.
 */
import { userLocation } from './catalog';
import {
  CatalogWine,
  CategoryCount,
  Dataset,
  MapPin,
  PriceComparison,
  SortKey,
  StoreOffer,
  WineSearchResult,
} from '../types';

const RADIUS_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(toRad(aLat)) * Math.cos(toRad(bLat));
  return RADIUS_KM * 2 * Math.asin(Math.sqrt(h));
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function getWineRating(id: string): { rating: number; reviewCount: number } {
  const h = hash(id);
  return { rating: Math.round((4.0 + (h % 10) / 10) * 10) / 10, reviewCount: 40 + (h % 560) };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function makeIndex(data: Dataset) {
  const storeById = new Map(data.establishments.map((e) => [e.id, e]));
  const wineById = new Map(data.wines.map((w) => [w.id, w]));
  const distance = (storeId: string) => {
    const s = storeById.get(storeId);
    return s ? haversineKm(userLocation.lat, userLocation.lng, s.lat, s.lng) : Infinity;
  };
  return { storeById, wineById, distance };
}

function matches(wine: CatalogWine | undefined, term: string): boolean {
  if (!term.trim()) return true;
  if (!wine) return false;
  const hay = `${wine.name} ${wine.grape} ${wine.country} ${wine.region} ${wine.wineryName} ${wine.type}`.toLowerCase();
  return hay.includes(term.trim().toLowerCase());
}

function offersForWine(
  data: Dataset,
  idx: ReturnType<typeof makeIndex>,
  wineId: string,
): (StoreOffer & { units?: number })[] {
  const offers = data.availabilities
    .filter((a) => a.wineId === wineId)
    .map((a) => {
      const store = idx.storeById.get(a.establishmentId)!;
      return {
        store: { id: store.id, name: store.name, distanceKm: round1(idx.distance(store.id)), lat: store.lat, lng: store.lng },
        price: a.price,
        status: a.status,
        bestPrice: false,
        units: a.units,
      };
    })
    .filter((o) => o.store.id);
  offers.sort((x, y) => x.price - y.price);
  if (offers.length) offers[0].bestPrice = true;
  return offers;
}

export function getSearchResults(data: Dataset, term: string, sort: SortKey): WineSearchResult[] {
  const idx = makeIndex(data);
  const results: WineSearchResult[] = [];
  for (const wine of data.wines) {
    if (!matches(wine, term)) continue;
    const offers = offersForWine(data, idx, wine.id);
    if (offers.length === 0) continue;
    const nearest = [...offers].sort((a, b) => a.store.distanceKm - b.store.distanceKm)[0];
    const cheapest = offers[0];
    const { rating, reviewCount } = getWineRating(wine.id);
    const low = offers.find((o) => o.units && o.units <= 3);
    results.push({
      id: wine.id,
      name: wine.name,
      vintage: wine.vintage,
      wineryName: wine.wineryName,
      grape: wine.grape,
      region: wine.region,
      rating,
      reviewCount,
      bestPrice: cheapest.price,
      storeCount: offers.length,
      nearestStore: nearest.store,
      stock: low ? { kind: 'ultimas', text: `Últimas ${low.units}` } : { kind: 'disponible', text: 'Disponible' },
      favorite: false,
    });
  }

  switch (sort) {
    case 'precio':
      results.sort((a, b) => a.bestPrice - b.bestPrice);
      break;
    case 'calificacion':
      results.sort((a, b) => b.rating - a.rating);
      break;
    case 'disponible':
      results.sort((a, b) => Number(a.stock.kind === 'ultimas') - Number(b.stock.kind === 'ultimas'));
      break;
    default:
      results.sort((a, b) => a.nearestStore.distanceKm - b.nearestStore.distanceKm);
  }
  return results;
}

export function getPriceComparisons(data: Dataset, term: string): PriceComparison[] {
  const idx = makeIndex(data);
  const out: PriceComparison[] = [];
  for (const wine of data.wines) {
    if (!matches(wine, term)) continue;
    const offers = offersForWine(data, idx, wine.id);
    if (offers.length === 0) continue;
    const { rating, reviewCount } = getWineRating(wine.id);
    out.push({
      wine: { id: wine.id, name: wine.name, vintage: wine.vintage, wineryName: wine.wineryName, rating, reviewCount },
      offers: offers.map(({ store, price, status, bestPrice }) => ({ store, price, status, bestPrice })),
    });
  }
  out.sort((a, b) => b.offers.length - a.offers.length);
  return out;
}

export function getNearbyResults(data: Dataset, term: string): WineSearchResult[] {
  return getSearchResults(data, term, 'cercania');
}

export function getMapPins(data: Dataset, term: string): MapPin[] {
  const idx = makeIndex(data);
  const best = new Map<string, number>();
  for (const a of data.availabilities) {
    if (!matches(idx.wineById.get(a.wineId), term)) continue;
    const cur = best.get(a.establishmentId);
    if (cur === undefined || a.price < cur) best.set(a.establishmentId, a.price);
  }
  const entries = [...best.entries()];
  if (entries.length === 0) return [];
  const cheapest = entries.reduce((m, e) => (e[1] < m[1] ? e : m), entries[0]);

  const lats = data.establishments.map((e) => e.lat);
  const lngs = data.establishments.map((e) => e.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const span = (v: number, mn: number, mx: number) => (mx === mn ? 0.5 : (v - mn) / (mx - mn));

  return entries.map(([storeId, price]) => {
    const s = idx.storeById.get(storeId)!;
    return {
      id: storeId,
      label: s.name,
      price,
      lat: s.lat,
      lng: s.lng,
      x: 0.14 + span(s.lng, minLng, maxLng) * 0.72,
      y: 0.16 + (1 - span(s.lat, minLat, maxLat)) * 0.6,
      highlighted: storeId === cheapest[0],
    };
  });
}

export function getCatalogWine(data: Dataset, id: string): CatalogWine | undefined {
  return data.wines.find((w) => w.id === id);
}

export function getWineOffers(data: Dataset, id: string): StoreOffer[] {
  return offersForWine(data, makeIndex(data), id).map(({ store, price, status, bestPrice }) => ({
    store,
    price,
    status,
    bestPrice,
  }));
}

export function getStore(data: Dataset, id: string) {
  const idx = makeIndex(data);
  const s = idx.storeById.get(id);
  if (!s) return undefined;
  return { ...s, distanceKm: round1(idx.distance(id)) };
}

export function getCategories(data: Dataset): {
  byType: CategoryCount[];
  byWorld: CategoryCount[];
  byCountry: CategoryCount[];
} {
  const count = (key: (w: CatalogWine) => string): CategoryCount[] => {
    const m = new Map<string, number>();
    for (const w of data.wines) m.set(key(w), (m.get(key(w)) ?? 0) + 1);
    return [...m.entries()].map(([k, c]) => ({ key: k, label: k, count: c })).sort((a, b) => b.count - a.count);
  };
  return {
    byType: count((w) => w.type),
    byWorld: count((w) => w.worldCategory),
    byCountry: count((w) => w.country),
  };
}

/**
 * Vinos "más comerciales" (best-sellers): etiquetas accesibles y conocidas que
 * se venden más fácil. Orden curado para la sección promocional.
 */
const BESTSELLER_IDS = [
  'las-moras-malbec',
  'casablanca-sb',
  'santa-rita-120',
  'concha-toro-carmenere',
  'pomar-syrah',
  'pomar-brut',
  'navarro-correas-cab',
  'silk-spice',
  'chianti-classico',
  'prosecco',
];

export function getBestsellers(data: Dataset): WineSearchResult[] {
  const order = new Map(BESTSELLER_IDS.map((id, i) => [id, i]));
  return getSearchResults(data, '', 'cercania')
    .filter((w) => order.has(w.id))
    .sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
}

export { userLocation } from './catalog';
