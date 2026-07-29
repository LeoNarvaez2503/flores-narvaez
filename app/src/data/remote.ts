/**
 * Trae el catálogo desde el backend (GET /wines) y lo transforma al Dataset
 * que consume la UI. Los Decimal de Prisma llegan como string → se convierten.
 */
import { apiFetch } from '../api/client';
import {
  AvailabilityRecord,
  AvailabilityStatus,
  CatalogEstablishment,
  CatalogWine,
  Dataset,
  EstablishmentKind,
  WineType,
  WorldCategory,
} from '../types';

interface ApiEstablishment {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  address: string;
  membershipTier: string;
}
interface ApiAvailability {
  id: string;
  price: string | number;
  status: string;
  establishment: ApiEstablishment;
}
interface ApiWine {
  id: string;
  name: string;
  type: string;
  wineryName: string;
  origin: string;
  grape: string;
  vintage: number | null;
  tastingNote: string | null;
  pairing: string | null;
  denominationOfOrigin: string | null;
  referencePrice: string | number;
  availabilities: ApiAvailability[];
}

const NUEVO_MUNDO = ['Argentina', 'Chile', 'Estados Unidos', 'EEUU', 'Australia', 'Sudáfrica'];

function worldFor(country: string): WorldCategory {
  if (country === 'Venezuela') return 'Local';
  if (NUEVO_MUNDO.includes(country)) return 'Nuevo Mundo';
  return 'Viejo Mundo';
}

/** origin "Carora, Lara, Venezuela" → { region: "Carora, Lara", country: "Venezuela" } */
function splitOrigin(origin: string): { region: string; country: string } {
  const parts = origin.split(',').map((p) => p.trim());
  const country = parts.length > 1 ? parts.pop()! : '';
  return { region: parts.join(', ') || country, country };
}

export async function fetchDataset(): Promise<Dataset> {
  const apiWines = await apiFetch<ApiWine[]>('/wines');

  const wines: CatalogWine[] = [];
  const estMap = new Map<string, CatalogEstablishment>();
  const availabilities: AvailabilityRecord[] = [];

  for (const w of apiWines) {
    const { region, country } = splitOrigin(w.origin);
    const price = Number(w.referencePrice);
    wines.push({
      id: w.id,
      name: w.name,
      vintage: w.vintage ?? undefined,
      wineryName: w.wineryName,
      country,
      region,
      denomination: w.denominationOfOrigin ?? undefined,
      grape: w.grape,
      type: w.type as WineType,
      worldCategory: worldFor(country),
      tastingNote: w.tastingNote ?? undefined,
      pairing: w.pairing ?? undefined,
      referencePrice: price,
      premium: price >= 24,
    });

    for (const a of w.availabilities ?? []) {
      const e = a.establishment;
      if (e && !estMap.has(e.id)) {
        estMap.set(e.id, {
          id: e.id,
          name: e.name,
          kind: e.type as EstablishmentKind,
          area: (e.address ?? '').split(',')[0].trim(),
          lat: e.lat,
          lng: e.lng,
          tier: e.membershipTier === 'DESTACADA' ? 'DESTACADA' : 'BASICA',
        });
      }
      if (e) {
        availabilities.push({
          wineId: w.id,
          establishmentId: e.id,
          price: Number(a.price),
          status: a.status as AvailabilityStatus,
        });
      }
    }
  }

  return { wines, establishments: [...estMap.values()], availabilities };
}
