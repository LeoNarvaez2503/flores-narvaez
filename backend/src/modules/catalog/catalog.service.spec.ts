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
