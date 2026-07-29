import { Request, Response } from 'express';
import { prisma } from '../database';
import { sseManager } from '../sse.manager';

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string ?? '10', 10)));
    const entity = req.query.entity as string | undefined;
    const userId = req.query.userId as string | undefined;
    const action = req.query.action as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const where: any = {};

    if (entity) {
      where.entity = { equals: entity.trim().toLowerCase(), mode: 'insensitive' };
    }

    if (userId) {
      where.userId = { equals: userId.trim() };
    }

    if (action) {
      where.action = { equals: action.trim().toUpperCase() };
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    const [total, data] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error(`[Audit Controller] Error al consultar logs: ${error.message}`);
    res.status(500).json({ error: 'Error al consultar logs de auditoría' });
  }
}

export function streamAuditLogs(req: Request, res: Response): void {
  sseManager.addClient(res);
}
