# CavaLocal Backend — Plan de Implementación: Fundación (Fases 0–1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levantar un backend NestJS que arranca, expone `/health` y `/docs` (Swagger), conecta a PostgreSQL vía Prisma con el esquema de datos completo migrado y poblado por seed, y tiene la capa transversal (`common`) lista para que los módulos de negocio se enchufen encima.

**Architecture:** API REST NestJS por capas (Controller → Service → Repository(interfaz) → Prisma → PostgreSQL). Esta fundación entrega la infraestructura transversal (config validada, Prisma global, filtros/interceptores/guards, Swagger, health) y el modelo de datos completo. Los módulos de negocio se construyen en planes posteriores reutilizando esta base.

**Tech Stack:** TypeScript, NestJS 10, PostgreSQL, Prisma 5, class-validator, @nestjs/swagger, @nestjs/jwt, bcrypt, Jest.

## Global Constraints

- Todo el backend vive dentro de `backend/`. **No** se modifica nada fuera de esa carpeta (la landing estática `../index.html`, `../main.js`, `../assets/` queda intacta).
- Lenguaje: TypeScript estricto (`"strict": true`).
- Base de datos: PostgreSQL. ORM: Prisma. Sin acceso directo a Prisma desde los services (los services dependen de interfaces de repositorio — DIP).
- Secretos vía `.env` validado al arranque; nunca hardcodear `DATABASE_URL` ni `JWT_SECRET`.
- Cada endpoint debe ser debugueable: documentado en Swagger, errores con sobre uniforme `{ statusCode, message, error, path, timestamp, requestId }`, logging por request.
- Enums de dominio (verbatim): `UserRole {CONSUMER, ESTABLISHMENT, SOMMELIER, ADMIN}`, `MembershipTier {GRATUITO, PREMIUM}`, `EstablishmentType {LICORERIA, BODEGON, SUPERMERCADO, RESTAURANTE, BODEGA, IMPORTADOR}`, `EstablishmentTier {BASICA, DESTACADA}`, `AvailabilityStatus {DISPONIBLE, AGOTADO}`, `ReviewTarget {WINE, ESTABLISHMENT}`, `OrderType {RESERVA, PICKUP, DELIVERY}`, `OrderStatus {PENDIENTE, CONFIRMADA, COMPLETADA, CANCELADA}`.
- Commits frecuentes, uno por tarea. Mensajes con `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

**Prerrequisito de entorno:** Node.js 20+, npm 10+, y una instancia de PostgreSQL accesible. Si no hay Postgres local, levantar uno con Docker:
`docker run --name cavalocal-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=cavalocal -p 5432:5432 -d postgres:16`

---

## Mapa de archivos (esta fase)

| Archivo | Responsabilidad |
|---|---|
| `package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json` | Toolchain y scripts |
| `.env.example` | Variables requeridas (plantilla) |
| `src/main.ts` | Bootstrap: ValidationPipe, filtros, interceptores, Swagger, CORS |
| `src/app.module.ts` | Módulo raíz: ConfigModule, PrismaModule, HealthModule |
| `src/config/configuration.ts` | Mapea `process.env` → objeto tipado |
| `src/config/env.validation.ts` | Valida `.env` al arranque (class-validator) |
| `src/prisma/prisma.module.ts` | Módulo `@Global` que expone PrismaService |
| `src/prisma/prisma.service.ts` | Cliente Prisma con lifecycle connect/disconnect |
| `src/common/filters/http-exception.filter.ts` | Sobre de error uniforme |
| `src/common/interceptors/logging.interceptor.ts` | Log método/ruta/status/ms + requestId |
| `src/common/interceptors/transform.interceptor.ts` | Envelope de respuesta `{ data, meta }` |
| `src/common/guards/jwt-auth.guard.ts` | Guard JWT (usado por módulos futuros) |
| `src/common/guards/roles.guard.ts` | RBAC por `@Roles()` |
| `src/common/decorators/roles.decorator.ts` | Metadata de roles |
| `src/common/decorators/current-user.decorator.ts` | Extrae el user del request |
| `src/common/dto/pagination.dto.ts` | Query de paginación reutilizable |
| `src/modules/health/*` | Health check con ping a DB |
| `prisma/schema.prisma` | Modelo de datos completo (todas las entidades) |
| `prisma/seed.ts` | Datos de ejemplo |
| `requests.http` | Peticiones de ejemplo (se inicia aquí; crece en planes siguientes) |
| `README.md` | Cómo correr y debuggear |

---

## Task 1: Toolchain del proyecto y bootstrap mínimo

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/tsconfig.build.json`
- Create: `backend/nest-cli.json`
- Create: `backend/src/main.ts`
- Create: `backend/src/app.module.ts`
- Create: `backend/.env.example`

**Interfaces:**
- Produces: app NestJS que arranca en `PORT` (default 3001); `AppModule` raíz al que los planes siguientes agregan imports.

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "cavalocal-backend",
  "version": "0.1.0",
  "description": "CavaLocal — Backend API (NestJS + PostgreSQL)",
  "license": "ISC",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed.ts",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/config": "^3.2.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/platform-express": "^10.4.0",
    "@nestjs/swagger": "^7.4.0",
    "@prisma/client": "^5.18.0",
    "bcrypt": "^5.1.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.0",
    "@nestjs/schematics": "^10.1.0",
    "@nestjs/testing": "^10.4.0",
    "@types/bcrypt": "^5.0.2",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.14.0",
    "@types/passport-jwt": "^4.0.1",
    "@types/supertest": "^6.0.2",
    "@types/uuid": "^10.0.0",
    "jest": "^29.7.0",
    "prisma": "^5.18.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.0",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.5.0"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 2: Crear `tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true
  }
}
```

- [ ] **Step 3: Crear `tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

- [ ] **Step 4: Crear `nest-cli.json`**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 5: Crear `.env.example`**

```bash
# Servidor
PORT=3001
NODE_ENV=development

# Base de datos
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cavalocal?schema=public"

# Auth
JWT_SECRET="cambia-esto-en-produccion"
JWT_EXPIRES_IN="1d"

# CORS (orígenes separados por coma)
CORS_ORIGINS="*"
```

- [ ] **Step 6: Crear `src/app.module.ts` (raíz mínima; se amplía en tareas siguientes)**

```typescript
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 7: Crear `src/main.ts` (bootstrap mínimo; Swagger/filtros se agregan en Tareas 4–5)**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`CavaLocal backend escuchando en http://localhost:${port}`);
}
bootstrap();
```

- [ ] **Step 8: Instalar dependencias**

Run: `cd backend && npm install`
Expected: instala sin errores; se crea `node_modules/` y `package-lock.json`.

- [ ] **Step 9: Copiar `.env` y arrancar para verificar el boot**

Run:
```bash
cp .env.example .env
npm run start:dev
```
Expected: imprime `CavaLocal backend escuchando en http://localhost:3001`. Cortar con Ctrl+C.

- [ ] **Step 10: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/tsconfig.json backend/tsconfig.build.json backend/nest-cli.json backend/.env.example backend/src/main.ts backend/src/app.module.ts
git commit -m "feat(infra): scaffold NestJS y bootstrap mínimo"
```

---

## Task 2: Configuración tipada y validación de entorno

**Files:**
- Create: `backend/src/config/configuration.ts`
- Create: `backend/src/config/env.validation.ts`
- Create: `backend/src/config/env.validation.spec.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Produces:
  - `configuration(): { port: number; nodeEnv: string; databaseUrl: string; jwt: { secret: string; expiresIn: string }; corsOrigins: string[] }`
  - `validateEnv(config: Record<string, unknown>): EnvironmentVariables` — lanza si falta o es inválida una variable.

- [ ] **Step 1: Escribir el test que falla — validación de entorno**

Create `backend/src/config/env.validation.spec.ts`:

```typescript
import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const valid = {
    PORT: '3001',
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db?schema=public',
    JWT_SECRET: 'secret',
    JWT_EXPIRES_IN: '1d',
    CORS_ORIGINS: '*',
  };

  it('acepta una configuración válida', () => {
    expect(() => validateEnv(valid)).not.toThrow();
  });

  it('lanza si falta DATABASE_URL', () => {
    const { DATABASE_URL, ...rest } = valid;
    expect(() => validateEnv(rest)).toThrow();
  });

  it('lanza si falta JWT_SECRET', () => {
    const { JWT_SECRET, ...rest } = valid;
    expect(() => validateEnv(rest)).toThrow();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd backend && npx jest src/config/env.validation.spec.ts`
Expected: FAIL — `Cannot find module './env.validation'`.

- [ ] **Step 3: Implementar `env.validation.ts`**

```typescript
import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsOptional()
  @IsString()
  PORT?: string;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsNotEmpty()
  @IsString()
  DATABASE_URL!: string;

  @IsNotEmpty()
  @IsString()
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Configuración de entorno inválida: ${errors.toString()}`);
  }
  return validated;
}
```

- [ ] **Step 4: Implementar `configuration.ts`**

```typescript
export const configuration = () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL as string,
  jwt: {
    secret: process.env.JWT_SECRET as string,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? '*').split(',').map((s) => s.trim()),
});
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd backend && npx jest src/config/env.validation.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Cablear `ConfigModule` en `app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config/configuration';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/config backend/src/app.module.ts
git commit -m "feat(config): configuración tipada y validación de .env al arranque"
```

---

## Task 3: Modelo de datos Prisma, migración y seed

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/src/prisma/prisma.service.ts`
- Create: `backend/src/prisma/prisma.module.ts`
- Create: `backend/prisma/seed.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Produces:
  - `PrismaService` (extiende `PrismaClient`, `@Injectable`, conecta en `onModuleInit`) — inyectable en cualquier repositorio.
  - `PrismaModule` (`@Global`) — exporta `PrismaService`.
  - Esquema con modelos: `User, UserPreference, Establishment, Wine, Availability, Review, Order, Subscription, Content, B2BReport, Notification, Referral`.

- [ ] **Step 1: Escribir `prisma/schema.prisma` (modelo completo)**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  CONSUMER
  ESTABLISHMENT
  SOMMELIER
  ADMIN
}

enum MembershipTier {
  GRATUITO
  PREMIUM
}

enum EstablishmentType {
  LICORERIA
  BODEGON
  SUPERMERCADO
  RESTAURANTE
  BODEGA
  IMPORTADOR
}

enum EstablishmentTier {
  BASICA
  DESTACADA
}

enum AvailabilityStatus {
  DISPONIBLE
  AGOTADO
}

enum ReviewTarget {
  WINE
  ESTABLISHMENT
}

enum OrderType {
  RESERVA
  PICKUP
  DELIVERY
}

enum OrderStatus {
  PENDIENTE
  CONFIRMADA
  COMPLETADA
  CANCELADA
}

model User {
  id             String          @id @default(uuid())
  email          String          @unique
  phone          String?         @unique
  passwordHash   String
  name           String
  role           UserRole        @default(CONSUMER)
  membershipTier MembershipTier  @default(GRATUITO)
  preference     UserPreference?
  reviews        Review[]
  orders         Order[]
  establishments Establishment[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}

model UserPreference {
  id        String   @id @default(uuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  grapes    String[]
  regions   String[]
  budgetMin Decimal? @db.Decimal(10, 2)
  budgetMax Decimal? @db.Decimal(10, 2)
}

model Establishment {
  id             String            @id @default(uuid())
  name           String
  type           EstablishmentType
  lat            Float
  lng            Float
  address        String
  membershipTier EstablishmentTier @default(BASICA)
  contactPhone   String?
  contactEmail   String?
  authorized     Boolean           @default(false)
  ownerUserId    String?
  owner          User?             @relation(fields: [ownerUserId], references: [id])
  availabilities Availability[]
  orders         Order[]
  createdAt      DateTime          @default(now())

  @@index([lat, lng])
}

model Wine {
  id                  String         @id @default(uuid())
  name                String
  type                String
  wineryName          String
  origin              String
  grape               String
  vintage             Int?
  tastingNote         String?
  pairing             String?
  denominationOfOrigin String?
  aging               String?
  descriptors         Json?
  referencePrice      Decimal        @db.Decimal(10, 2)
  verified            Boolean        @default(false)
  availabilities      Availability[]
  createdAt           DateTime       @default(now())

  @@index([grape])
  @@index([origin])
}

model Availability {
  id              String             @id @default(uuid())
  wineId          String
  wine            Wine               @relation(fields: [wineId], references: [id], onDelete: Cascade)
  establishmentId String
  establishment   Establishment      @relation(fields: [establishmentId], references: [id], onDelete: Cascade)
  price           Decimal            @db.Decimal(10, 2)
  status          AvailabilityStatus @default(DISPONIBLE)
  updatedAt       DateTime           @updatedAt

  @@unique([wineId, establishmentId])
  @@index([wineId])
  @@index([establishmentId])
}

model Review {
  id              String       @id @default(uuid())
  userId          String
  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  targetType      ReviewTarget
  wineId          String?
  establishmentId String?
  rating          Int
  comment         String?
  createdAt       DateTime     @default(now())

  @@index([targetType, wineId])
  @@index([targetType, establishmentId])
}

model Order {
  id              String        @id @default(uuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  establishmentId String
  establishment   Establishment @relation(fields: [establishmentId], references: [id])
  type            OrderType
  amount          Decimal       @db.Decimal(10, 2)
  commission      Decimal       @db.Decimal(10, 2)
  deliveryFee     Decimal       @default(0) @db.Decimal(10, 2)
  status          OrderStatus   @default(PENDIENTE)
  createdAt       DateTime      @default(now())
}

model Subscription {
  id              String    @id @default(uuid())
  userId          String?
  establishmentId String?
  plan            String
  status          String    @default("ACTIVA")
  startedAt       DateTime  @default(now())
  renewsAt        DateTime?
}

model Content {
  id        String   @id @default(uuid())
  wineId    String?
  type      String
  body      String
  authorId  String?
  createdAt DateTime @default(now())
}

model B2BReport {
  id        String   @id @default(uuid())
  scope     String
  period    String
  dataJson  Json
  createdAt DateTime @default(now())
}

model Notification {
  id        String    @id @default(uuid())
  userId    String
  type      String
  payload   Json
  readAt    DateTime?
  createdAt DateTime  @default(now())
}

model Referral {
  id             String   @id @default(uuid())
  referrerUserId String
  referredEmail  String
  status         String   @default("PENDIENTE")
  createdAt      DateTime @default(now())
}
```

- [ ] **Step 2: Implementar `src/prisma/prisma.service.ts`**

```typescript
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'warn', 'error']
          : ['warn', 'error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

- [ ] **Step 3: Implementar `src/prisma/prisma.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 4: Importar `PrismaModule` en `app.module.ts`**

Modificar `imports` para que quede:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 5: Escribir `prisma/seed.ts`**

```typescript
import { PrismaClient, EstablishmentType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@cavalocal.com' },
    update: {},
    create: {
      email: 'admin@cavalocal.com',
      name: 'Admin CavaLocal',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const consumer = await prisma.user.upsert({
    where: { email: 'ana@example.com' },
    update: {},
    create: {
      email: 'ana@example.com',
      name: 'Ana Consumidora',
      passwordHash,
      role: 'CONSUMER',
      membershipTier: 'PREMIUM',
      preference: {
        create: { grapes: ['Malbec', 'Cabernet Sauvignon'], regions: ['Mendoza'], budgetMin: 5, budgetMax: 50 },
      },
    },
  });

  const est1 = await prisma.establishment.create({
    data: {
      name: 'Licorería El Roble',
      type: EstablishmentType.LICORERIA,
      lat: 10.4806,
      lng: -66.9036,
      address: 'Av. Principal, Caracas',
      membershipTier: 'DESTACADA',
      authorized: true,
      contactEmail: 'roble@example.com',
    },
  });

  const est2 = await prisma.establishment.create({
    data: {
      name: 'Bodegón La Vid',
      type: EstablishmentType.BODEGON,
      lat: 10.5012,
      lng: -66.9145,
      address: 'Calle 5, Caracas',
      membershipTier: 'BASICA',
      authorized: true,
    },
  });

  const wine1 = await prisma.wine.create({
    data: {
      name: 'Reserva Malbec 2020',
      type: 'Tinto',
      wineryName: 'Bodega Andina',
      origin: 'Mendoza, Argentina',
      grape: 'Malbec',
      vintage: 2020,
      tastingNote: 'Frutos rojos, taninos suaves.',
      pairing: 'Carnes rojas',
      denominationOfOrigin: 'Mendoza',
      aging: '12 meses en roble',
      descriptors: { tannins: 'medio', body: 'completo' },
      referencePrice: 25.0,
      verified: true,
    },
  });

  const wine2 = await prisma.wine.create({
    data: {
      name: 'Sauvignon Blanc 2022',
      type: 'Blanco',
      wineryName: 'Viña del Mar',
      origin: 'Valle de Casablanca, Chile',
      grape: 'Sauvignon Blanc',
      vintage: 2022,
      referencePrice: 18.0,
      descriptors: { tannins: 'bajo', body: 'ligero' },
      verified: false,
    },
  });

  await prisma.availability.createMany({
    data: [
      { wineId: wine1.id, establishmentId: est1.id, price: 24.5, status: 'DISPONIBLE' },
      { wineId: wine1.id, establishmentId: est2.id, price: 26.0, status: 'DISPONIBLE' },
      { wineId: wine2.id, establishmentId: est1.id, price: 17.5, status: 'AGOTADO' },
    ],
  });

  await prisma.review.create({
    data: {
      userId: consumer.id,
      targetType: 'WINE',
      wineId: wine1.id,
      rating: 5,
      comment: 'Excelente relación precio-calidad.',
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed completado:', { admin: admin.email, consumer: consumer.email, establecimientos: 2, vinos: 2 });
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
```

- [ ] **Step 6: Generar cliente, migrar y poblar**

Run (con Postgres accesible y `.env` configurado):
```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```
Expected: la migración crea las tablas; el seed imprime `Seed completado: ...`. Se crea `prisma/migrations/<timestamp>_init/`.

- [ ] **Step 7: Verificar datos con Prisma Studio (opcional, debug)**

Run: `npx prisma studio`
Expected: abre en el navegador; las tablas `User`, `Establishment`, `Wine`, `Availability`, `Review` tienen las filas del seed. Cerrar con Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add backend/prisma backend/src/prisma backend/src/app.module.ts
git commit -m "feat(db): esquema Prisma completo, migración inicial y seed"
```

---

## Task 4: Capa transversal `common` (filtros, interceptores, guards, decoradores, DTO)

**Files:**
- Create: `backend/src/common/filters/http-exception.filter.ts`
- Create: `backend/src/common/interceptors/logging.interceptor.ts`
- Create: `backend/src/common/interceptors/transform.interceptor.ts`
- Create: `backend/src/common/decorators/roles.decorator.ts`
- Create: `backend/src/common/decorators/current-user.decorator.ts`
- Create: `backend/src/common/guards/jwt-auth.guard.ts`
- Create: `backend/src/common/guards/roles.guard.ts`
- Create: `backend/src/common/dto/pagination.dto.ts`
- Create: `backend/src/common/filters/http-exception.filter.spec.ts`

**Interfaces:**
- Produces (consumido por planes posteriores):
  - `AllExceptionsFilter` — filtro global; sobre `{ statusCode, message, error, path, timestamp, requestId }`.
  - `LoggingInterceptor`, `TransformInterceptor` — interceptores globales.
  - `@Roles(...roles: UserRole[])` y `RolesGuard`.
  - `JwtAuthGuard` (basado en passport-jwt; la estrategia se registra en el plan de auth).
  - `@CurrentUser()` — param decorator que devuelve `request.user`.
  - `PaginationDto { page?: number; limit?: number }` con getters `skip`/`take`.

- [ ] **Step 1: Escribir el test que falla — filtro de excepciones**

Create `backend/src/common/filters/http-exception.filter.spec.ts`:

```typescript
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

function mockHost(): { host: ArgumentsHost; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/test', headers: {} }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe('AllExceptionsFilter', () => {
  it('formatea una HttpException con el sobre uniforme', () => {
    const { host, json, status } = mockHost();
    new AllExceptionsFilter().catch(
      new HttpException('No encontrado', HttpStatus.NOT_FOUND),
      host,
    );
    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, path: '/test' }),
    );
  });

  it('mapea errores no-HTTP a 500', () => {
    const { host, status } = mockHost();
    new AllExceptionsFilter().catch(new Error('boom'), host);
    expect(status).toHaveBeenCalledWith(500);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd backend && npx jest src/common/filters/http-exception.filter.spec.ts`
Expected: FAIL — `Cannot find module './http-exception.filter'`.

- [ ] **Step 3: Implementar `http-exception.filter.ts`**

```typescript
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: unknown = 'Error interno del servidor';
    let error = 'InternalServerError';
    if (exception instanceof HttpException) {
      const resp = exception.getResponse();
      message = typeof resp === 'string' ? resp : (resp as Record<string, unknown>).message;
      error = exception.name;
    } else if (exception instanceof Error) {
      error = exception.name;
      this.logger.error(exception.message, exception.stack);
    }

    const requestId = (request.headers['x-request-id'] as string) ?? undefined;

    response.status(status).json({
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd backend && npx jest src/common/filters/http-exception.filter.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Implementar `logging.interceptor.ts`**

```typescript
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const requestId = (req.headers['x-request-id'] as string) ?? randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    const start = Date.now();
    const { method, url } = req;

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        this.logger.log(`${method} ${url} ${res.statusCode} ${ms}ms [${requestId}]`);
      }),
    );
  }
}
```

- [ ] **Step 6: Implementar `transform.interceptor.ts`**

```typescript
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  meta: { timestamp: string };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data: T) => ({
        data,
        meta: { timestamp: new Date().toISOString() },
      })),
    );
  }
}
```

- [ ] **Step 7: Implementar `decorators/roles.decorator.ts`**

```typescript
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 8: Implementar `decorators/current-user.decorator.ts`**

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUser | undefined;
  },
);
```

- [ ] **Step 9: Implementar `guards/jwt-auth.guard.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 10: Implementar `guards/roles.guard.ts`**

```typescript
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('No tenés permisos para esta acción');
    }
    return true;
  }
}
```

- [ ] **Step 11: Implementar `dto/pagination.dto.ts`**

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }

  get take(): number {
    return this.limit;
  }
}
```

- [ ] **Step 12: Correr toda la suite para confirmar que nada se rompió**

Run: `cd backend && npx jest`
Expected: PASS (tests de `env.validation` + `http-exception.filter`).

- [ ] **Step 13: Commit**

```bash
git add backend/src/common
git commit -m "feat(common): filtros, interceptores, guards, decoradores y paginación"
```

---

## Task 5: Bootstrap completo (Swagger + globales) y módulo Health

**Files:**
- Create: `backend/src/modules/health/health.controller.ts`
- Create: `backend/src/modules/health/health.service.ts`
- Create: `backend/src/modules/health/health.module.ts`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/main.ts`
- Create: `backend/test/health.e2e-spec.ts`
- Create: `backend/test/jest-e2e.json`

**Interfaces:**
- Consumes: `PrismaService`, `AllExceptionsFilter`, `LoggingInterceptor`, `TransformInterceptor`.
- Produces: `GET /health` → `{ status: 'ok' | 'degraded', db: 'up' | 'down', uptime: number }`; Swagger en `/docs`.

- [ ] **Step 1: Implementar `health.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  uptime: number;
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    let db: 'up' | 'down' = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    return {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      uptime: Math.floor(process.uptime()),
    };
  }
}
```

- [ ] **Step 2: Implementar `health.controller.ts`**

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService, HealthStatus } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Estado del servicio y conexión a la base de datos' })
  check(): Promise<HealthStatus> {
    return this.healthService.check();
  }
}
```

- [ ] **Step 3: Implementar `health.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
```

- [ ] **Step 4: Registrar `HealthModule` en `app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 5: Completar `main.ts` con globales + Swagger + CORS**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  const corsOrigins = config.get<string[]>('corsOrigins') ?? ['*'];
  app.enableCors({ origin: corsOrigins.includes('*') ? true : corsOrigins });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CavaLocal API')
    .setDescription('Backend del marketplace de vinos CavaLocal')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = config.get<number>('port') ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`CavaLocal backend en http://localhost:${port} — Swagger en /docs`);
}
bootstrap();
```

- [ ] **Step 6: Crear `test/jest-e2e.json`**

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" }
}
```

- [ ] **Step 7: Escribir el test e2e que falla — `test/health.e2e-spec.ts`**

```typescript
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health devuelve estado ok y db up', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.db).toBe('up');
  });
});
```

Nota: usar `createApplication()` si tu versión lo expone; con NestJS 10 estándar es `moduleRef.createNestApplication()`. Reemplazar por `app = moduleRef.createNestApplication();` si el método anterior no existe.

- [ ] **Step 8: Correr el e2e (requiere Postgres del seed levantado)**

Run: `cd backend && npm run test:e2e`
Expected: PASS — `GET /health devuelve estado ok y db up`.

- [ ] **Step 9: Arrancar y verificar manualmente en el navegador**

Run: `cd backend && npm run start:dev`
Verificar:
- `http://localhost:3001/health` → `{ "data": { "status": "ok", "db": "up", "uptime": <n> }, "meta": {...} }`
- `http://localhost:3001/docs` → carga Swagger UI con el tag `health`.

Cortar con Ctrl+C.

- [ ] **Step 10: Commit**

```bash
git add backend/src/main.ts backend/src/app.module.ts backend/src/modules/health backend/test
git commit -m "feat(health): módulo health, Swagger en /docs y globales en bootstrap"
```

---

## Task 6: `requests.http` y README de la fundación

**Files:**
- Create: `backend/requests.http`
- Create: `backend/README.md`

**Interfaces:**
- Produces: documentación de arranque y colección de peticiones de ejemplo (crece en planes siguientes).

- [ ] **Step 1: Crear `requests.http`**

```http
@host = http://localhost:3001

### Health
GET {{host}}/health
```

- [ ] **Step 2: Crear `README.md`**

```markdown
# CavaLocal — Backend

API REST (NestJS + PostgreSQL + Prisma) del marketplace de vinos CavaLocal.
No incluye la app móvil ni el panel web (frontends que consumen este API).

## Requisitos
- Node.js 20+, npm 10+
- PostgreSQL accesible (o Docker)

## Puesta en marcha
\`\`\`bash
cp .env.example .env          # ajustar DATABASE_URL y JWT_SECRET
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
\`\`\`

- API: http://localhost:3001
- Swagger (debug): http://localhost:3001/docs
- Health: http://localhost:3001/health

## Postgres con Docker (opcional)
\`\`\`bash
docker run --name cavalocal-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=cavalocal -p 5432:5432 -d postgres:16
\`\`\`

## Estructura
- \`src/config\` — configuración tipada y validación de \`.env\`
- \`src/prisma\` — PrismaService global
- \`src/common\` — filtros, interceptores, guards, decoradores (transversal)
- \`src/modules/*\` — módulos de negocio (capas controller/service/repository)
- \`prisma/schema.prisma\` — modelo de datos
- \`prisma/seed.ts\` — datos de ejemplo

## Debug
- Swagger ejecuta cada endpoint desde el navegador.
- Cada respuesta de error usa el sobre \`{ statusCode, message, error, path, timestamp, requestId }\`.
- Cada request se loguea con método, ruta, status y tiempo (ms).
- \`requests.http\` (VS Code REST Client) trae peticiones listas.

## Tests
\`\`\`bash
npm test          # unitarios
npm run test:e2e  # end-to-end (requiere Postgres)
\`\`\`
```

- [ ] **Step 3: Commit**

```bash
git add backend/requests.http backend/README.md
git commit -m "docs: README de arranque y colección requests.http"
```

---

## Self-Review

**1. Cobertura del spec (Fases 0–1):**
- Scaffold NestJS + config validada → Tareas 1–2. ✅
- PrismaModule/Service + `/health` + Swagger → Tareas 3, 5. ✅
- `schema.prisma` completo (12 entidades + enums verbatim del spec) → Tarea 3. ✅
- Migración inicial + `seed.ts` → Tarea 3. ✅
- Capa transversal de debuggability (filtro de error uniforme, logging+requestId, transform) → Tareas 4–5. ✅
- RBAC/guards/decoradores base para módulos futuros → Tarea 4. ✅
- `requests.http` + README → Tarea 6. ✅
- (Las Fases 2–10 — módulos de negocio — quedan para los planes 2–4, como acordado.)

**2. Placeholders:** sin "TBD"/"TODO"; todos los steps traen código o comando concreto. ✅

**3. Consistencia de tipos:** `PrismaService` (Tarea 3) se inyecta en `HealthService` (Tarea 5) con la misma ruta `../../prisma/prisma.service`. Enums de `@prisma/client` usados en `roles.decorator`/`roles.guard` (Tarea 4) provienen del `schema.prisma` (Tarea 3). El sobre de error de `AllExceptionsFilter` (Tarea 4) coincide con el documentado en README (Tarea 6) y en Global Constraints. ✅

**Nota de dependencia:** la Tarea 5 (e2e de health) requiere que la Tarea 3 (migración + Postgres) esté hecha y la DB accesible. Documentado en el step.
