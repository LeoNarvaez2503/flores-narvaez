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
