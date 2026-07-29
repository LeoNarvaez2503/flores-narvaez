import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditPublisherService } from '../../audit-publisher/audit-publisher.service';
import { CreateReviewDto } from './dto/create-review.dto';

const round1 = (n: number | null) => (n != null ? Math.round(n * 10) / 10 : null);

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditPublisher: AuditPublisherService,
  ) {}

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

    // Obtener email del usuario para el evento de auditoría
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    await this.auditPublisher.publishAuditEvent({
      entity: 'vinos',
      action: existing ? 'UPDATE' : 'CREATE',
      userId,
      userEmail: user?.email ?? 'unknown',
      timestamp: new Date().toISOString(),
      data: {
        before: existing
          ? { reviewId: existing.id, rating: existing.rating, comment: existing.comment, wineId: dto.wineId }
          : null,
        after: { reviewId: review.id, rating: review.rating, comment: review.comment, wineId: dto.wineId },
      },
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

