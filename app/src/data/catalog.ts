/**
 * Catálogo de CavaLocal depurado del mercado venezolano:
 *  - Vinos LOCALES (Bodegas Pomar, Carora — Estado Lara, único productor a gran escala).
 *  - Vinos IMPORTADOS frecuentes (vía importadoras: Imalbeca, Intermarca, Vinum, Prodelsur).
 *  - ESTABLECIMIENTOS reales de Caracas (supermercados, licorerías y bodegones).
 *
 * Forma alineada al modelo del backend (Wine / Establishment / Availability).
 * Sustituir por `fetch` al API cuando el backend esté arriba.
 */

import {
  AvailabilityRecord,
  CatalogEstablishment,
  CatalogWine,
  UserLocation,
} from '../types';

/** Ubicación del usuario (Chacao, Caracas). */
export const userLocation: UserLocation = {
  city: 'Caracas',
  area: 'Chacao',
  lat: 10.497,
  lng: -66.854,
};

/** Establecimientos (canales de venta reales en Caracas). */
export const establishments: CatalogEstablishment[] = [
  { id: 'excelsior-gama', name: 'Excelsior Gama', kind: 'SUPERMERCADO', area: 'Los Palos Grandes', lat: 10.498, lng: -66.843, tier: 'BASICA' },
  { id: 'plazas', name: "Automercados Plaza's", kind: 'SUPERMERCADO', area: 'Chacao', lat: 10.4965, lng: -66.8545, tier: 'BASICA' },
  { id: 'luvebras', name: 'Luvebras', kind: 'SUPERMERCADO', area: 'Las Mercedes', lat: 10.4835, lng: -66.865, tier: 'BASICA' },
  { id: 'celicor', name: 'Celicor Boutique', kind: 'LICORERIA', area: 'La Castellana', lat: 10.4998, lng: -66.8518, tier: 'DESTACADA' },
  { id: 'licoteca', name: 'Licoteca', kind: 'LICORERIA', area: 'La Castellana', lat: 10.5008, lng: -66.8502, tier: 'DESTACADA' },
  { id: 'rey-cafes', name: 'Rey de los Cafés', kind: 'BODEGON', area: 'Los Palos Grandes', lat: 10.5012, lng: -66.8412, tier: 'DESTACADA' },
  { id: 'bodegon-castellana', name: 'Bodegón La Castellana', kind: 'BODEGON', area: 'La Castellana', lat: 10.499, lng: -66.853, tier: 'BASICA' },
  { id: 'vinum', name: 'Importadora Vinum', kind: 'IMPORTADOR', area: 'Las Mercedes', lat: 10.482, lng: -66.8625, tier: 'DESTACADA' },
];

/** Vinos del catálogo. */
export const wines: CatalogWine[] = [
  // ── LOCALES · Bodegas Pomar (Carora, Lara, Venezuela) ──
  { id: 'pomar-syrah', name: 'Pomar Syrah', wineryName: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Syrah', type: 'Tinto', worldCategory: 'Local', referencePrice: 11.5, tastingNote: 'Frutos negros, especiado, taninos suaves.', pairing: 'Carnes a la parrilla' },
  { id: 'pomar-tempranillo', name: 'Pomar Tempranillo', wineryName: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Tempranillo', type: 'Tinto', worldCategory: 'Local', referencePrice: 11.0, tastingNote: 'Cereza madura, redondo y fácil de beber.', pairing: 'Pastas, quesos' },
  { id: 'pomar-sauvignon-blanc', name: 'Pomar Sauvignon Blanc', wineryName: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Sauvignon Blanc', type: 'Blanco', worldCategory: 'Local', referencePrice: 10.5, tastingNote: 'Cítrico, fresco y herbáceo.', pairing: 'Pescados, ensaladas' },
  { id: 'altagracia-tinto', name: 'Viña Altagracia Tinto', wineryName: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Syrah-Tempranillo', type: 'Tinto', worldCategory: 'Local', referencePrice: 15.9, premium: true, tastingNote: 'Línea premium; estructurado y elegante.', pairing: 'Cordero, carnes rojas' },
  { id: 'altagracia-blanco', name: 'Viña Altagracia Blanco', wineryName: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Chenin-Sauvignon', type: 'Blanco', worldCategory: 'Local', referencePrice: 14.9, premium: true, tastingNote: 'Premium; fruta blanca y final largo.', pairing: 'Mariscos' },
  { id: 'pomar-reserva', name: 'Pomar Reserva', wineryName: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Tempranillo', type: 'Tinto', worldCategory: 'Local', referencePrice: 18.5, premium: true, tastingNote: 'Crianza en roble; complejo.', pairing: 'Carnes maduradas' },
  { id: 'pomar-brut', name: 'Pomar Brut', wineryName: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Macabeo-Chardonnay', type: 'Espumante', worldCategory: 'Local', referencePrice: 16.0, tastingNote: 'Método tradicional; burbuja fina.', pairing: 'Aperitivos, celebraciones' },
  { id: 'pomar-brut-nature', name: 'Pomar Brut Nature', wineryName: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Macabeo', type: 'Espumante', worldCategory: 'Local', referencePrice: 17.5, tastingNote: 'Sin azúcar añadida; seco y vivo.', pairing: 'Ostras, sushi' },
  { id: 'pomar-demi-sec', name: 'Pomar Demi Sec', wineryName: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Macabeo', type: 'Espumante', worldCategory: 'Local', referencePrice: 16.0, tastingNote: 'Más dulce; goloso.', pairing: 'Postres' },
  { id: 'pomar-rose', name: 'Pomar Rosé', wineryName: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Syrah', type: 'Espumante', worldCategory: 'Local', referencePrice: 16.5, tastingNote: 'Rosado espumante; fresa y frambuesa.', pairing: 'Picadas' },

  // ── IMPORTADOS · Nuevo Mundo ──
  { id: 'las-moras-malbec', name: 'Finca Las Moras Malbec', wineryName: 'Finca Las Moras', country: 'Argentina', region: 'San Juan', denomination: 'San Juan', grape: 'Malbec', type: 'Tinto', worldCategory: 'Nuevo Mundo', referencePrice: 12.9, tastingNote: 'Ciruela y violetas; jugoso.', pairing: 'Asado' },
  { id: 'navarro-correas-cab', name: 'Navarro Correas Cabernet Sauvignon', wineryName: 'Navarro Correas', country: 'Argentina', region: 'Mendoza', denomination: 'Mendoza', grape: 'Cabernet Sauvignon', type: 'Tinto', worldCategory: 'Nuevo Mundo', referencePrice: 16.4, tastingNote: 'Pimiento y cassis; firme.', pairing: 'Bife de chorizo' },
  { id: 'catena-malbec', name: 'Catena Zapata Malbec', wineryName: 'Catena Zapata', country: 'Argentina', region: 'Valle de Uco, Mendoza', denomination: 'Mendoza', grape: 'Malbec', type: 'Tinto', worldCategory: 'Nuevo Mundo', referencePrice: 24.9, premium: true, tastingNote: 'Ícono argentino; intenso y elegante.', pairing: 'Carnes rojas' },
  { id: 'concha-toro-carmenere', name: 'Concha y Toro Carménère', wineryName: 'Concha y Toro', country: 'Chile', region: 'Valle del Maipo', denomination: 'Valle del Maipo', grape: 'Carménère', type: 'Tinto', worldCategory: 'Nuevo Mundo', referencePrice: 13.5, tastingNote: 'Especias y pimentón; suave.', pairing: 'Cerdo, embutidos' },
  { id: 'santa-rita-120', name: 'Santa Rita 120 Cabernet Sauvignon', wineryName: 'Santa Rita', country: 'Chile', region: 'Valle del Maipo', denomination: 'Valle del Maipo', grape: 'Cabernet Sauvignon', type: 'Tinto', worldCategory: 'Nuevo Mundo', referencePrice: 11.9, tastingNote: 'Clásico chileno; fruta roja.', pairing: 'Hamburguesas' },
  { id: 'casablanca-sb', name: 'Casillero Sauvignon Blanc', wineryName: 'Concha y Toro', country: 'Chile', region: 'Valle de Casablanca', denomination: 'Casablanca', grape: 'Sauvignon Blanc', type: 'Blanco', worldCategory: 'Nuevo Mundo', referencePrice: 12.0, tastingNote: 'Maracuyá y cítricos.', pairing: 'Ceviche' },

  // ── IMPORTADOS · Viejo Mundo · España ──
  { id: 'cune-rioja', name: 'CVNE Cune Rioja Crianza', wineryName: 'CVNE (Cune)', country: 'España', region: 'Rioja', denomination: 'D.O.Ca. Rioja', grape: 'Tempranillo', type: 'Tinto', worldCategory: 'Viejo Mundo', referencePrice: 17.0, tastingNote: 'Vainilla y fruta roja; equilibrado.', pairing: 'Jamón, cordero' },
  { id: 'carmelo-rodero', name: 'Carmelo Rodero Ribera del Duero', wineryName: 'Carmelo Rodero', country: 'España', region: 'Ribera del Duero', denomination: 'D.O. Ribera del Duero', grape: 'Tempranillo (Tinta Fina)', type: 'Tinto', worldCategory: 'Viejo Mundo', referencePrice: 22.0, premium: true, tastingNote: 'Potente y goloso.', pairing: 'Carnes asadas' },
  { id: 'riscal-reserva', name: 'Marqués de Riscal Reserva', wineryName: 'Herederos del Marqués de Riscal', country: 'España', region: 'Rioja', denomination: 'D.O.Ca. Rioja', grape: 'Tempranillo', type: 'Tinto', worldCategory: 'Viejo Mundo', referencePrice: 21.5, premium: true, tastingNote: 'Reserva clásica; especiado.', pairing: 'Guisos' },
  { id: 'emilio-moro', name: 'Emilio Moro', wineryName: 'Emilio Moro', country: 'España', region: 'Ribera del Duero', denomination: 'D.O. Ribera del Duero', grape: 'Tempranillo', type: 'Tinto', worldCategory: 'Viejo Mundo', referencePrice: 23.5, premium: true, tastingNote: 'Moderno y profundo.', pairing: 'Carnes rojas' },
  { id: 'murrieta-reserva', name: 'Marqués de Murrieta Reserva', wineryName: 'Marqués de Murrieta', country: 'España', region: 'Rioja', denomination: 'D.O.Ca. Rioja', grape: 'Tempranillo', type: 'Tinto', worldCategory: 'Viejo Mundo', referencePrice: 26.0, premium: true, tastingNote: 'Elegante y longevo.', pairing: 'Caza' },
  { id: 'vega-sicilia-unico', name: 'Vega Sicilia Único', wineryName: 'Tempos Vega Sicilia', country: 'España', region: 'Ribera del Duero', denomination: 'D.O. Ribera del Duero', grape: 'Tinto Fino-Cabernet', type: 'Tinto', worldCategory: 'Viejo Mundo', referencePrice: 95.0, premium: true, tastingNote: 'Joya icónica de España.', pairing: 'Ocasiones especiales' },

  // ── IMPORTADOS · Viejo Mundo · Portugal ──
  { id: 'esporao-reserva', name: 'Esporão Reserva', wineryName: 'Esporão', country: 'Portugal', region: 'Alentejo', denomination: 'D.O.C. Alentejo', grape: 'Aragonez-Trincadeira', type: 'Tinto', worldCategory: 'Viejo Mundo', referencePrice: 19.0, tastingNote: 'Fruta madura y madera fina.', pairing: 'Bacalao, carnes' },
  { id: 'silk-spice', name: 'Silk & Spice', wineryName: 'Sogrape (Silk & Spice)', country: 'Portugal', region: 'Portugal', grape: 'Blend portugués', type: 'Tinto', worldCategory: 'Viejo Mundo', referencePrice: 13.0, tastingNote: 'Especiado y sedoso.', pairing: 'Comida especiada' },
  { id: 'sandeman-porto', name: 'Sandeman Porto', wineryName: 'Sandeman', country: 'Portugal', region: 'Douro', denomination: 'D.O.C. Porto', grape: 'Touriga Nacional', type: 'Fortificado', worldCategory: 'Viejo Mundo', referencePrice: 20.0, tastingNote: 'Oporto; dulce y potente.', pairing: 'Postres, quesos azules' },

  // ── IMPORTADOS · Viejo Mundo · Italia ──
  { id: 'chianti-classico', name: 'Chianti Classico', wineryName: 'Toscana', country: 'Italia', region: 'Toscana', denomination: 'D.O.C.G. Chianti', grape: 'Sangiovese', type: 'Tinto', worldCategory: 'Viejo Mundo', referencePrice: 18.0, tastingNote: 'Cereza y hierbas; ácido vivo.', pairing: 'Pizza, pasta' },
  { id: 'barolo', name: 'Barolo', wineryName: 'Piamonte', country: 'Italia', region: 'Piamonte', denomination: 'D.O.C.G. Barolo', grape: 'Nebbiolo', type: 'Tinto', worldCategory: 'Viejo Mundo', referencePrice: 34.0, premium: true, tastingNote: 'Rey del Piamonte; rosas y alquitrán.', pairing: 'Risotto, trufa' },
  { id: 'prosecco', name: 'Prosecco', wineryName: 'Véneto', country: 'Italia', region: 'Véneto', denomination: 'D.O.C. Prosecco', grape: 'Glera', type: 'Espumante', worldCategory: 'Viejo Mundo', referencePrice: 14.0, tastingNote: 'Burbuja alegre; manzana y flores.', pairing: 'Brindis' },

  // ── IMPORTADOS · Viejo Mundo · Francia ──
  { id: 'bordeaux-rouge', name: 'Bordeaux Rouge', wineryName: 'Burdeos', country: 'Francia', region: 'Burdeos', denomination: 'A.O.C. Bordeaux', grape: 'Cabernet-Merlot', type: 'Tinto', worldCategory: 'Viejo Mundo', referencePrice: 22.0, tastingNote: 'Blend bordelés; estructurado.', pairing: 'Carnes rojas' },
  { id: 'champagne-brut', name: 'Champagne Brut', wineryName: 'Champagne', country: 'Francia', region: 'Champagne', denomination: 'A.O.C. Champagne', grape: 'Chardonnay-Pinot Noir', type: 'Espumante', worldCategory: 'Viejo Mundo', referencePrice: 45.0, premium: true, tastingNote: 'El espumante por excelencia.', pairing: 'Celebraciones' },
];

/**
 * Disponibilidad generada de forma DETERMINISTA: cada vino se ofrece en 2-4
 * establecimientos, con precio variando por tienda alrededor del de referencia.
 * (Equivale a la tabla Availability del backend; sin aleatoriedad para que la
 * demo sea estable.)
 */
function buildAvailabilities(): AvailabilityRecord[] {
  const records: AvailabilityRecord[] = [];
  const factors = [0.95, 1.0, 1.07, 1.12];
  wines.forEach((wine, wi) => {
    const storeCount = 2 + (wi % 3); // 2, 3 o 4 tiendas
    for (let k = 0; k < storeCount; k++) {
      const store = establishments[(wi * 2 + k * 3) % establishments.length];
      const price = Math.round(wine.referencePrice * factors[k] * 100) / 100;
      const lowStock = (wi + k) % 7 === 0;
      const agotado = (wi + k) % 11 === 0;
      records.push({
        wineId: wine.id,
        establishmentId: store.id,
        price,
        status: agotado ? 'AGOTADO' : 'DISPONIBLE',
        units: lowStock ? 3 : undefined,
      });
    }
  });
  return records;
}

export const availabilities: AvailabilityRecord[] = buildAvailabilities();

export const searchTerm = 'Malbec';

/** Dataset local (sirve de fallback si el backend no responde). */
export const localDataset = { wines, establishments, availabilities };
