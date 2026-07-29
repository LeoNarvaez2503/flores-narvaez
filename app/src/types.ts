/**
 * Tipos del dominio, modelados con la MISMA forma que devolverá el backend
 * (NestJS + Prisma). La capa de datos (data/catalog.ts + data/selectors.ts) hoy
 * entrega datos locales con esta forma; al conectar el API real solo cambia el
 * origen, no la UI.
 */

export type AvailabilityStatus = 'DISPONIBLE' | 'AGOTADO';

/** Etiqueta de stock que se muestra en la tarjeta (badge verde/ámbar). */
export interface StockLabel {
  kind: 'disponible' | 'ultimas';
  text: string; // "Disponible" | "Últimas 3"
}

/** Tienda/establecimiento resumido (subset de Establishment del backend). */
export interface StoreSummary {
  id: string;
  name: string;
  distanceKm: number;
  lat?: number;
  lng?: number;
}

/**
 * Resultado de búsqueda de un vino agregando su mejor precio y tienda más
 * cercana. Equivale a la respuesta de `GET /search/wines`.
 */
export interface WineSearchResult {
  id: string;
  name: string;
  vintage?: number;
  wineryName: string;
  grape: string;
  region: string; // ej. "Mendoza"
  rating: number; // promedio (RF-20)
  reviewCount: number;
  bestPrice: number; // "desde $X"
  storeCount: number; // "en N tiendas"
  nearestStore: StoreSummary;
  stock: StockLabel;
  favorite: boolean;
}

/** Oferta de un vino en una tienda concreta (subset de Availability). */
export interface StoreOffer {
  store: StoreSummary;
  price: number;
  status: AvailabilityStatus;
  bestPrice: boolean; // marca "MEJOR PRECIO"
}

/**
 * Comparación de precios de un mismo vino entre tiendas.
 * Equivale a `GET /search/wines/:id/compare` (RF-12).
 */
export interface PriceComparison {
  wine: Pick<
    WineSearchResult,
    'id' | 'name' | 'vintage' | 'wineryName' | 'rating' | 'reviewCount'
  >;
  offers: StoreOffer[];
}

/** Pin de precio sobre el mapa (variación C). */
export interface MapPin {
  id: string;
  label: string; // nombre del establecimiento
  price: number;
  lat: number;
  lng: number;
  x: number; // posición relativa 0..1 en el lienzo del mapa (fallback SVG)
  y: number;
  highlighted: boolean;
}

/** Ubicación seleccionada en el header. */
export interface UserLocation {
  city: string; // "Caracas"
  area: string; // "Chacao"
  lat: number;
  lng: number;
}

/** Modos de la pantalla de búsqueda (A/B/C del diseño). */
export type SearchMode = 'lista' | 'comparar' | 'mapa';

/** Chips de orden/filtro. */
export type SortKey = 'cercania' | 'precio' | 'calificacion' | 'disponible';

// ── Catálogo (datos del mercado venezolano) ──────────────────────────────

export type WineType = 'Tinto' | 'Blanco' | 'Rosado' | 'Espumante' | 'Fortificado';

/** Clasificación enológica clásica (organiza el catálogo). */
export type WorldCategory = 'Local' | 'Nuevo Mundo' | 'Viejo Mundo';

export type EstablishmentKind =
  | 'LICORERIA'
  | 'BODEGON'
  | 'SUPERMERCADO'
  | 'RESTAURANTE'
  | 'IMPORTADOR';

/** Ficha de vino del catálogo (alineada al modelo Wine del backend). */
export interface CatalogWine {
  id: string;
  name: string;
  vintage?: number;
  wineryName: string;
  country: string; // Venezuela, Argentina, España...
  region: string; // Carora, Mendoza, Rioja...
  denomination?: string; // D.O.
  grape: string;
  type: WineType;
  worldCategory: WorldCategory;
  tastingNote?: string;
  pairing?: string;
  referencePrice: number; // USD de referencia
  premium?: boolean;
}

/** Establecimiento del catálogo (alineado al modelo Establishment del backend). */
export interface CatalogEstablishment {
  id: string;
  name: string;
  kind: EstablishmentKind;
  area: string; // zona de Caracas
  lat: number;
  lng: number;
  tier: 'BASICA' | 'DESTACADA';
}

/** Disponibilidad: un vino en un establecimiento, con precio y estado. */
export interface AvailabilityRecord {
  wineId: string;
  establishmentId: string;
  price: number;
  status: AvailabilityStatus;
  units?: number; // stock; si es bajo → "Últimas N"
}

/** Conteo por categoría para la pantalla de exploración. */
export interface CategoryCount {
  key: string;
  label: string;
  count: number;
}

/** Conjunto de datos del catálogo (local o traído del backend). */
export interface Dataset {
  wines: CatalogWine[];
  establishments: CatalogEstablishment[];
  availabilities: AvailabilityRecord[];
}
