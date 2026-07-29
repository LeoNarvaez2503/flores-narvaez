import { Router } from 'express';
import { getAuditLogs, streamAuditLogs } from '../controllers/audit.controller';

const router = Router();

// GET /api/audit -> Consulta paginada con filtros
router.get('/', getAuditLogs);

// GET /api/audit/stream -> Endpoint Server-Sent Events (SSE)
router.get('/stream', streamAuditLogs);
router.get('/events', streamAuditLogs);

export default router;
