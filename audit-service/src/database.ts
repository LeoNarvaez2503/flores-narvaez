import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('[Database] Conectado a PostgreSQL exitosamente.');
  } catch (error: any) {
    console.error(`[Database] Error al conectar a PostgreSQL: ${error.message}`);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('[Database] Desconectado de PostgreSQL.');
}
