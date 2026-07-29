import express from 'express';
import cors from 'cors';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './database';
import { RabbitMQConsumer } from './rabbitmq.consumer';
import auditRoutes from './routes/audit.routes';

async function bootstrap() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Rutas de salud y API de auditoría
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'audit-service', timestamp: new Date().toISOString() });
  });

  app.use('/api/audit', auditRoutes);

  // Conectar a la base de datos PostgreSQL
  await connectDatabase();

  // Iniciar el servidor Express
  const server = app.listen(config.port, () => {
    console.log(`[Audit Service] Servidor iniciado en puerto ${config.port}`);
    console.log(`[Audit Service] Endpoint REST: http://localhost:${config.port}/api/audit`);
    console.log(`[Audit Service] Endpoint SSE:  http://localhost:${config.port}/api/audit/stream`);
  });

  // Iniciar consumidor de RabbitMQ en segundo plano
  const consumer = new RabbitMQConsumer();
  await consumer.start();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[Audit Service] Apagando el servicio...');
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('[Audit Service] Error fatal durante inicio:', err);
  process.exit(1);
});
