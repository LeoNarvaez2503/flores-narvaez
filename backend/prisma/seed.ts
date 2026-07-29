import { AvailabilityStatus, EstablishmentType, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ── Establecimientos de Caracas (id explícito = mismo del front) ──
const establishments = [
  { id: 'excelsior-gama', name: 'Excelsior Gama', type: 'SUPERMERCADO', area: 'Los Palos Grandes', lat: 10.498, lng: -66.843, tier: 'BASICA' },
  { id: 'plazas', name: "Automercados Plaza's", type: 'SUPERMERCADO', area: 'Chacao', lat: 10.4965, lng: -66.8545, tier: 'BASICA' },
  { id: 'luvebras', name: 'Luvebras', type: 'SUPERMERCADO', area: 'Las Mercedes', lat: 10.4835, lng: -66.865, tier: 'BASICA' },
  { id: 'celicor', name: 'Celicor Boutique', type: 'LICORERIA', area: 'La Castellana', lat: 10.4998, lng: -66.8518, tier: 'DESTACADA' },
  { id: 'licoteca', name: 'Licoteca', type: 'LICORERIA', area: 'La Castellana', lat: 10.5008, lng: -66.8502, tier: 'DESTACADA' },
  { id: 'rey-cafes', name: 'Rey de los Cafés', type: 'BODEGON', area: 'Los Palos Grandes', lat: 10.5012, lng: -66.8412, tier: 'DESTACADA' },
  { id: 'bodegon-castellana', name: 'Bodegón La Castellana', type: 'BODEGON', area: 'La Castellana', lat: 10.499, lng: -66.853, tier: 'BASICA' },
  { id: 'vinum', name: 'Importadora Vinum', type: 'IMPORTADOR', area: 'Las Mercedes', lat: 10.482, lng: -66.8625, tier: 'DESTACADA' },
] as const;

// ── Vinos (locales + importados) ──
const wines = [
  { id: 'pomar-syrah', name: 'Pomar Syrah', type: 'Tinto', winery: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Syrah', deno: 'Lara', price: 11.5, note: 'Frutos negros, especiado.', pair: 'Carnes a la parrilla' },
  { id: 'pomar-tempranillo', name: 'Pomar Tempranillo', type: 'Tinto', winery: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Tempranillo', deno: 'Lara', price: 11.0, note: 'Cereza madura, redondo.', pair: 'Pastas, quesos' },
  { id: 'pomar-sauvignon-blanc', name: 'Pomar Sauvignon Blanc', type: 'Blanco', winery: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Sauvignon Blanc', deno: 'Lara', price: 10.5, note: 'Cítrico, fresco y herbáceo.', pair: 'Pescados, ensaladas' },
  { id: 'altagracia-tinto', name: 'Viña Altagracia Tinto', type: 'Tinto', winery: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Syrah-Tempranillo', deno: 'Lara', price: 15.9, note: 'Premium, estructurado.', pair: 'Cordero' },
  { id: 'altagracia-blanco', name: 'Viña Altagracia Blanco', type: 'Blanco', winery: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Chenin-Sauvignon', deno: 'Lara', price: 14.9, note: 'Premium, fruta blanca.', pair: 'Mariscos' },
  { id: 'pomar-reserva', name: 'Pomar Reserva', type: 'Tinto', winery: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Tempranillo', deno: 'Lara', price: 18.5, note: 'Crianza en roble.', pair: 'Carnes maduradas' },
  { id: 'pomar-brut', name: 'Pomar Brut', type: 'Espumante', winery: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Macabeo-Chardonnay', deno: 'Lara', price: 16.0, note: 'Método tradicional.', pair: 'Aperitivos' },
  { id: 'pomar-brut-nature', name: 'Pomar Brut Nature', type: 'Espumante', winery: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Macabeo', deno: 'Lara', price: 17.5, note: 'Seco y vivo.', pair: 'Ostras, sushi' },
  { id: 'pomar-demi-sec', name: 'Pomar Demi Sec', type: 'Espumante', winery: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Macabeo', deno: 'Lara', price: 16.0, note: 'Más dulce, goloso.', pair: 'Postres' },
  { id: 'pomar-rose', name: 'Pomar Rosé', type: 'Rosado', winery: 'Bodegas Pomar', country: 'Venezuela', region: 'Carora, Lara', grape: 'Syrah', deno: 'Lara', price: 16.5, note: 'Fresa y frambuesa.', pair: 'Picadas' },
  { id: 'las-moras-malbec', name: 'Finca Las Moras Malbec', type: 'Tinto', winery: 'Finca Las Moras', country: 'Argentina', region: 'San Juan', grape: 'Malbec', deno: 'San Juan', price: 12.9, note: 'Ciruela y violetas.', pair: 'Asado' },
  { id: 'navarro-correas-cab', name: 'Navarro Correas Cabernet Sauvignon', type: 'Tinto', winery: 'Navarro Correas', country: 'Argentina', region: 'Mendoza', grape: 'Cabernet Sauvignon', deno: 'Mendoza', price: 16.4, note: 'Pimiento y cassis.', pair: 'Bife' },
  { id: 'catena-malbec', name: 'Catena Zapata Malbec', type: 'Tinto', winery: 'Catena Zapata', country: 'Argentina', region: 'Valle de Uco, Mendoza', grape: 'Malbec', deno: 'Mendoza', price: 24.9, note: 'Ícono argentino.', pair: 'Carnes rojas' },
  { id: 'concha-toro-carmenere', name: 'Concha y Toro Carménère', type: 'Tinto', winery: 'Concha y Toro', country: 'Chile', region: 'Valle del Maipo', grape: 'Carménère', deno: 'Valle del Maipo', price: 13.5, note: 'Especias y pimentón.', pair: 'Cerdo' },
  { id: 'santa-rita-120', name: 'Santa Rita 120 Cabernet Sauvignon', type: 'Tinto', winery: 'Santa Rita', country: 'Chile', region: 'Valle del Maipo', grape: 'Cabernet Sauvignon', deno: 'Valle del Maipo', price: 11.9, note: 'Clásico chileno.', pair: 'Hamburguesas' },
  { id: 'casablanca-sb', name: 'Casillero Sauvignon Blanc', type: 'Blanco', winery: 'Concha y Toro', country: 'Chile', region: 'Valle de Casablanca', grape: 'Sauvignon Blanc', deno: 'Casablanca', price: 12.0, note: 'Maracuyá y cítricos.', pair: 'Ceviche' },
  { id: 'cune-rioja', name: 'CVNE Cune Rioja Crianza', type: 'Tinto', winery: 'CVNE', country: 'España', region: 'Rioja', grape: 'Tempranillo', deno: 'D.O.Ca. Rioja', price: 17.0, note: 'Vainilla y fruta roja.', pair: 'Jamón' },
  { id: 'carmelo-rodero', name: 'Carmelo Rodero Ribera del Duero', type: 'Tinto', winery: 'Carmelo Rodero', country: 'España', region: 'Ribera del Duero', grape: 'Tempranillo', deno: 'D.O. Ribera del Duero', price: 22.0, note: 'Potente y goloso.', pair: 'Carnes asadas' },
  { id: 'riscal-reserva', name: 'Marqués de Riscal Reserva', type: 'Tinto', winery: 'Marqués de Riscal', country: 'España', region: 'Rioja', grape: 'Tempranillo', deno: 'D.O.Ca. Rioja', price: 21.5, note: 'Reserva clásica.', pair: 'Guisos' },
  { id: 'emilio-moro', name: 'Emilio Moro', type: 'Tinto', winery: 'Emilio Moro', country: 'España', region: 'Ribera del Duero', grape: 'Tempranillo', deno: 'D.O. Ribera del Duero', price: 23.5, note: 'Moderno y profundo.', pair: 'Carnes rojas' },
  { id: 'murrieta-reserva', name: 'Marqués de Murrieta Reserva', type: 'Tinto', winery: 'Marqués de Murrieta', country: 'España', region: 'Rioja', grape: 'Tempranillo', deno: 'D.O.Ca. Rioja', price: 26.0, note: 'Elegante y longevo.', pair: 'Caza' },
  { id: 'vega-sicilia-unico', name: 'Vega Sicilia Único', type: 'Tinto', winery: 'Tempos Vega Sicilia', country: 'España', region: 'Ribera del Duero', grape: 'Tinto Fino-Cabernet', deno: 'D.O. Ribera del Duero', price: 95.0, note: 'Joya icónica.', pair: 'Ocasiones especiales' },
  { id: 'esporao-reserva', name: 'Esporão Reserva', type: 'Tinto', winery: 'Esporão', country: 'Portugal', region: 'Alentejo', grape: 'Aragonez-Trincadeira', deno: 'D.O.C. Alentejo', price: 19.0, note: 'Fruta madura y madera.', pair: 'Bacalao' },
  { id: 'silk-spice', name: 'Silk & Spice', type: 'Tinto', winery: 'Sogrape', country: 'Portugal', region: 'Portugal', grape: 'Blend portugués', deno: '', price: 13.0, note: 'Especiado y sedoso.', pair: 'Comida especiada' },
  { id: 'sandeman-porto', name: 'Sandeman Porto', type: 'Fortificado', winery: 'Sandeman', country: 'Portugal', region: 'Douro', grape: 'Touriga Nacional', deno: 'D.O.C. Porto', price: 20.0, note: 'Oporto, dulce y potente.', pair: 'Postres, quesos azules' },
  { id: 'chianti-classico', name: 'Chianti Classico', type: 'Tinto', winery: 'Toscana', country: 'Italia', region: 'Toscana', grape: 'Sangiovese', deno: 'D.O.C.G. Chianti', price: 18.0, note: 'Cereza y hierbas.', pair: 'Pizza, pasta' },
  { id: 'barolo', name: 'Barolo', type: 'Tinto', winery: 'Piamonte', country: 'Italia', region: 'Piamonte', grape: 'Nebbiolo', deno: 'D.O.C.G. Barolo', price: 34.0, note: 'Rosas y alquitrán.', pair: 'Risotto, trufa' },
  { id: 'prosecco', name: 'Prosecco', type: 'Espumante', winery: 'Véneto', country: 'Italia', region: 'Véneto', grape: 'Glera', deno: 'D.O.C. Prosecco', price: 14.0, note: 'Manzana y flores.', pair: 'Brindis' },
  { id: 'bordeaux-rouge', name: 'Bordeaux Rouge', type: 'Tinto', winery: 'Burdeos', country: 'Francia', region: 'Burdeos', grape: 'Cabernet-Merlot', deno: 'A.O.C. Bordeaux', price: 22.0, note: 'Blend bordelés.', pair: 'Carnes rojas' },
  { id: 'champagne-brut', name: 'Champagne Brut', type: 'Espumante', winery: 'Champagne', country: 'Francia', region: 'Champagne', grape: 'Chardonnay-Pinot Noir', deno: 'A.O.C. Champagne', price: 45.0, note: 'El espumante por excelencia.', pair: 'Celebraciones' },
] as const;

function buildAvailability() {
  const factors = [0.95, 1.0, 1.07, 1.12];
  const rows: { wineId: string; establishmentId: string; price: number; status: AvailabilityStatus }[] = [];
  wines.forEach((w, wi) => {
    const storeCount = 2 + (wi % 3);
    for (let k = 0; k < storeCount; k++) {
      const store = establishments[(wi * 2 + k * 3) % establishments.length];
      const price = Math.round(w.price * factors[k] * 100) / 100;
      const agotado = (wi + k) % 11 === 0;
      rows.push({ wineId: w.id, establishmentId: store.id, price, status: agotado ? 'AGOTADO' : 'DISPONIBLE' });
    }
  });
  return rows;
}

async function main() {
  const adminHash = await bcrypt.hash('Admin123', 10);
  const anaHash = await bcrypt.hash('1234', 10);

  await prisma.user.upsert({
    where: { email: 'admin@cavalocal.com' },
    update: {},
    create: { email: 'admin@cavalocal.com', name: 'Admin CavaLocal', passwordHash: adminHash, role: 'ADMIN' },
  });
  const ana = await prisma.user.upsert({
    where: { email: 'ana@example.com' },
    update: {},
    create: {
      email: 'ana@example.com',
      name: 'Ana Pérez',
      passwordHash: anaHash,
      role: 'CONSUMER',
      membershipTier: 'PREMIUM',
      preference: { create: { grapes: ['Malbec', 'Tempranillo'], regions: ['Mendoza', 'Rioja'], budgetMin: 8, budgetMax: 40 } },
    },
  });

  await prisma.establishment.createMany({
    data: establishments.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type as EstablishmentType,
      lat: e.lat,
      lng: e.lng,
      address: `${e.area}, Caracas`,
      membershipTier: e.tier,
      authorized: true,
    })),
  });

  await prisma.wine.createMany({
    data: wines.map((w) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      wineryName: w.winery,
      origin: `${w.region}, ${w.country}`,
      grape: w.grape,
      denominationOfOrigin: w.deno || null,
      tastingNote: w.note,
      pairing: w.pair,
      referencePrice: w.price,
      verified: true,
    })),
  });

  await prisma.availability.createMany({ data: buildAvailability() });

  await prisma.review.create({
    data: { userId: ana.id, targetType: 'WINE', wineId: 'las-moras-malbec', rating: 5, comment: 'Excelente relación precio-calidad.' },
  });

  // eslint-disable-next-line no-console
  console.log(`Seed OK: 2 usuarios, ${establishments.length} establecimientos, ${wines.length} vinos.`);
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
