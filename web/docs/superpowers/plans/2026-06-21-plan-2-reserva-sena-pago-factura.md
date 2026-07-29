# Plan 2 — Reserva + seña + pago simulado + factura por correo real

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **En la Task 7 (overlay de checkout) invocar la skill `frontend-design`** para la elevación visual; el código base del plan es funcional y correcto.

**Goal:** Que al "Reservar" un vino el usuario complete un checkout de varios pasos (reserva → datos → pago de seña → confirmación), se persista la reserva, se simule el cobro de la seña y se le envíe la **factura por correo real**.

**Architecture:** Backend NestJS con 3 módulos nuevos por capas (Controller→Service→Prisma): `reservations` (reglas: descuento 1ª reserva, seña 20/80, nº de factura), `payments` (validación de tarjeta + aprobación simulada, aislado), `notifications` (Nodemailer + Gmail SMTP, render de factura HTML). Frontend: overlay de checkout en `js/checkout.js` que consume `js/api.js`; `app.js` abre el checkout desde "Reservar".

**Tech Stack:** NestJS 10, Prisma 5, `nodemailer` (Gmail SMTP), Jest+ts-jest. Front HTML/CSS/JS (ES modules), `node --test`.

## Global Constraints

- **Idioma de toda la UI y mensajes: español rioplatense.**
- **Marca pineada:** burdeos `--wine #641E2E`, oro `--gold #C2912B` (con restricción), crema `--cream`; Playfair Display + Inter. No cambiar paleta ni fuentes.
- **Seña = 20% del total online; saldo = 80% al retirar.**
- **Descuento 5% sólo en la primera reserva del usuario**, aplicado al subtotal, mostrado en el resumen del pago (no en el home).
- **Pago SIMULADO:** se valida formato (Luhn, vencimiento, CVV) y se aprueba en modo prueba. **Nunca se persisten** número de tarjeta ni CVV.
- **Factura por correo REAL** vía Nodemailer + Gmail SMTP (`MAIL_USER`/`MAIL_APP_PASSWORD`). Si el correo falla, la reserva igual se confirma (`emailSent:false`).
- **Montos con 2 decimales** (`Math.round(x*100)/100`); en Prisma `Decimal(10,2)`.
- **Auth:** endpoints de reserva requieren JWT (header `Authorization: Bearer <cl_token>`). `@CurrentUser()` expone `user.userId`.
- **ValidationPipe global** con `forbidNonWhitelisted:true` → todo campo del body debe estar en el DTO; el objeto `customer` anidado necesita su propia clase validada con `@ValidateNested()`+`@Type()`.
- **Base URL backend:** `http://localhost:3001`. Front: `http://localhost:8080`. Claves de sesión `cl_token`/`cl_user`.
- **Nota de operación (Windows/OneDrive):** `prisma generate` falla con `EPERM` si el backend está corriendo (bloquea el motor). Antes de `prisma generate`/migrar: detener el proceso node de :3001, generar, y reiniciar `npm run start:dev`. `prisma migrate dev` es interactivo y NO corre en este shell: crear la carpeta de migración a mano + `prisma migrate deploy` (ver Task 1).

---

## File Structure

**Backend (`backend/`)**
- `prisma/schema.prisma` *(mod)* — modelo `Reservation` + back-relations en `User`/`Wine`/`Establishment`.
- `prisma/migrations/<ts>_add_reservation/migration.sql` *(crear)*.
- `src/modules/payments/payments.service.ts` *(crear)* — validación + cobro simulado.
- `src/modules/payments/payments.service.spec.ts` *(crear)*.
- `src/modules/notifications/invoice.template.ts` *(crear)* — `renderInvoiceHtml(data)` pura.
- `src/modules/notifications/email.service.ts` *(crear)* — Nodemailer Gmail; `sendInvoice`.
- `src/modules/notifications/email.service.spec.ts` *(crear)*.
- `src/modules/notifications/invoice.template.spec.ts` *(crear)*.
- `src/modules/notifications/notifications.module.ts` *(crear)*.
- `src/modules/reservations/dto/create-reservation.dto.ts` *(crear)* — `CustomerDto` + `CreateReservationDto`.
- `src/modules/reservations/dto/pay-reservation.dto.ts` *(crear)*.
- `src/modules/reservations/reservations.service.ts` *(crear)* — montos, crear, pagar.
- `src/modules/reservations/reservations.service.spec.ts` *(crear)*.
- `src/modules/reservations/reservations.controller.ts` *(crear)*.
- `src/modules/reservations/reservations.module.ts` *(crear)*.
- `src/config/configuration.ts` + `src/config/env.validation.ts` *(mod)* — `MAIL_USER`, `MAIL_APP_PASSWORD`.
- `.env` *(mod)* — placeholders de correo.
- `src/app.module.ts` *(mod)* — importar `ReservationsModule`.
- `package.json`/`package-lock.json` *(mod)* — `nodemailer` + `@types/nodemailer`.

**Frontend (`web/`)**
- `js/payment-utils.js` *(crear)* — `luhnValid`, `formatCardNumber`, `expiryValid`, `cvvValid` (puras).
- `test/payment-utils.test.mjs` *(crear)*.
- `js/api.js` *(mod)* — `createReservation`, `payReservation`, `myReservations` (con auth).
- `js/money.js` *(crear)* — `money(n)` (formato) reutilizable.
- `js/checkout.js` *(crear)* — overlay multipaso.
- `css/checkout.css` *(crear)* — estilos del overlay.
- `index.html` *(mod)* — link a `checkout.css` + `<div id="checkout"></div>`.
- `js/app.js` *(mod)* — `reserve()` abre el checkout; retorno pendiente `reserve:<id>`.

---

## Task 1: Modelo `Reservation` en Prisma + migración

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<ts>_add_reservation/migration.sql`

**Interfaces:**
- Produces: tabla `Reservation` con los campos usados por `ReservationsService` (Task 4) y la factura (Task 3).

- [ ] **Step 1: Agregar el modelo y back-relations en `schema.prisma`**

En `model User` agregar la relación inversa (debajo de `orders Order[]`):
```prisma
  reservations   Reservation[]
```
En `model Wine` agregar (debajo de `availabilities Availability[]`):
```prisma
  reservations   Reservation[]
```
En `model Establishment` agregar (debajo de `orders Order[]`):
```prisma
  reservations   Reservation[]
```
Al final del archivo, agregar el modelo:
```prisma
model Reservation {
  id             String   @id @default(uuid())
  invoiceNumber  String   @unique
  userId         String
  user           User     @relation(fields: [userId], references: [id])
  wineId         String
  wine           Wine     @relation(fields: [wineId], references: [id])
  establishmentId String
  establishment  Establishment @relation(fields: [establishmentId], references: [id])
  quantity       Int
  unitPrice      Decimal  @db.Decimal(10, 2)
  subtotal       Decimal  @db.Decimal(10, 2)
  discountPct    Int      @default(0)
  discountAmount Decimal  @db.Decimal(10, 2)
  total          Decimal  @db.Decimal(10, 2)
  deposit        Decimal  @db.Decimal(10, 2)
  balance        Decimal  @db.Decimal(10, 2)
  wineName       String
  wineryName     String
  storeName      String
  storeAddress   String
  customerName   String
  customerEmail  String
  customerPhone  String?
  pickupDate     DateTime?
  status         String   @default("pending_payment")
  emailSent      Boolean  @default(false)
  createdAt      DateTime @default(now())

  @@index([userId])
}
```

- [ ] **Step 2: Crear la carpeta de migración con timestamp**

Run (PowerShell, en `backend/`):
```powershell
$ts = Get-Date -Format "yyyyMMddHHmmss"; New-Item -ItemType Directory -Force -Path "prisma/migrations/${ts}_add_reservation" | Out-Null; Write-Output "prisma/migrations/${ts}_add_reservation"
```
Anotar la ruta impresa.

- [ ] **Step 3: Escribir el SQL de la migración**

En `prisma/migrations/<ts>_add_reservation/migration.sql`:
```sql
-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discountPct" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "deposit" DECIMAL(10,2) NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL,
    "wineName" TEXT NOT NULL,
    "wineryName" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "storeAddress" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "pickupDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_invoiceNumber_key" ON "Reservation"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Reservation_userId_idx" ON "Reservation"("userId");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "Wine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 4: Detener el backend, aplicar la migración y regenerar el cliente**

Run (PowerShell):
```powershell
$c = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue; if ($c) { Stop-Process -Id $c.OwningProcess -Force; Start-Sleep 2 }
cd "c:\Users\euger\OneDrive\Escritorio\CavaLocal\backend"
npx prisma migrate deploy
npx prisma generate
```
Expected: "All migrations have been successfully applied." y "Generated Prisma Client".

- [ ] **Step 5: Verificar build y commitear**

Run:
```powershell
npm run build
```
Expected: exit 0.
```powershell
git add prisma/schema.prisma "prisma/migrations"
git commit -m "feat(db): modelo Reservation (seña/factura) + migración"
```
> El backend se reinicia al final de la Task 5 (cuando ya existan sus módulos). Para tareas intermedias que necesiten la API viva, levantarlo con `npm run start:dev`.

---

## Task 2: `PaymentsService` — validación + cobro simulado (TDD)

**Files:**
- Create: `backend/src/modules/payments/payments.service.ts`
- Test: `backend/src/modules/payments/payments.service.spec.ts`

**Interfaces:**
- Produces:
  - `PaymentsService.charge(amount: number, card: { cardNumber: string; expiry: string; cvv: string; cardName: string }): { status: 'approved'; paymentId: string }` — lanza `BadRequestException` si la tarjeta es inválida. No persiste datos.

- [ ] **Step 1: Escribir el test que falla**

`backend/src/modules/payments/payments.service.spec.ts`:
```ts
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const service = new PaymentsService();
  const validCard = { cardNumber: '4242 4242 4242 4242', expiry: '12/35', cvv: '123', cardName: 'Ana Vino' };

  it('aprueba una tarjeta válida y devuelve paymentId', () => {
    const res = service.charge(10, validCard);
    expect(res.status).toBe('approved');
    expect(res.paymentId).toMatch(/^pay_/);
  });

  it('rechaza un número que no pasa Luhn', () => {
    expect(() => service.charge(10, { ...validCard, cardNumber: '1234 5678 9012 3456' }))
      .toThrow(BadRequestException);
  });

  it('rechaza vencimiento pasado', () => {
    expect(() => service.charge(10, { ...validCard, expiry: '01/20' })).toThrow(BadRequestException);
  });

  it('rechaza CVV inválido', () => {
    expect(() => service.charge(10, { ...validCard, cvv: '1' })).toThrow(BadRequestException);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run (en `backend/`): `npx jest payments.service.spec.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `payments.service.ts`**

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

interface CardInput { cardNumber: string; expiry: string; cvv: string; cardName: string; }

@Injectable()
export class PaymentsService {
  /** Cobro SIMULADO. Valida formato (Luhn/vencimiento/CVV) y aprueba. No persiste datos sensibles. */
  charge(amount: number, card: CardInput): { status: 'approved'; paymentId: string } {
    const number = (card.cardNumber || '').replace(/\D/g, '');
    if (!this.luhn(number)) throw new BadRequestException('Número de tarjeta inválido.');
    if (!this.expiryOk(card.expiry)) throw new BadRequestException('Tarjeta vencida o vencimiento inválido.');
    if (!/^\d{3,4}$/.test(card.cvv || '')) throw new BadRequestException('CVV inválido.');
    if (!(amount > 0)) throw new BadRequestException('Monto inválido.');
    if (!(card.cardName || '').trim()) throw new BadRequestException('Falta el titular.');
    return { status: 'approved', paymentId: 'pay_' + randomUUID() };
  }

  private luhn(s: string): boolean {
    if (s.length < 13 || s.length > 19) return false;
    let sum = 0, alt = false;
    for (let i = s.length - 1; i >= 0; i--) {
      let d = Number(s[i]);
      if (alt) { d *= 2; if (d > 9) d -= 9; }
      sum += d; alt = !alt;
    }
    return sum % 10 === 0;
  }

  private expiryOk(mmYY: string): boolean {
    const m = /^(\d{2})\/(\d{2})$/.exec((mmYY || '').trim());
    if (!m) return false;
    const mo = Number(m[1]); const yr = 2000 + Number(m[2]);
    if (mo < 1 || mo > 12) return false;
    const firstAfterExpiry = new Date(yr, mo, 1);
    return firstAfterExpiry > new Date();
  }
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npx jest payments.service.spec.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```powershell
git add src/modules/payments
git commit -m "feat(payments): cobro simulado con validación Luhn/vencimiento/CVV + tests"
```

---

## Task 3: Factura HTML pura + `EmailService` (TDD)

**Files:**
- Create: `backend/src/modules/notifications/invoice.template.ts`
- Test: `backend/src/modules/notifications/invoice.template.spec.ts`
- Create: `backend/src/modules/notifications/email.service.ts`
- Test: `backend/src/modules/notifications/email.service.spec.ts`
- Create: `backend/src/modules/notifications/notifications.module.ts`
- Modify: `backend/package.json` (instalar `nodemailer`)

**Interfaces:**
- Produces:
  - `renderInvoiceHtml(d: InvoiceData): string`
  - `EmailService.sendInvoice(r: InvoiceData & { customerEmail: string }): Promise<boolean>` — `true` si se envió, `false` si falló (no lanza).
  - `InvoiceData` = `{ invoiceNumber, customerName, wineName, wineryName, storeName, storeAddress, quantity, unitPrice, subtotal, discountPct, discountAmount, total, deposit, balance, pickupDate?: string|null }`

- [ ] **Step 1: Instalar nodemailer**

Run (en `backend/`):
```powershell
npm install nodemailer; npm install -D "@types/nodemailer"
```

- [ ] **Step 2: Escribir el test de la plantilla (falla)**

`backend/src/modules/notifications/invoice.template.spec.ts`:
```ts
import { renderInvoiceHtml } from './invoice.template';

const data = {
  invoiceNumber: 'CL-000007', customerName: 'Ana Vino', wineName: 'Malbec', wineryName: 'Las Moras',
  storeName: 'Licorería Centro', storeAddress: 'Av. Principal', quantity: 2, unitPrice: 10,
  subtotal: 20, discountPct: 5, discountAmount: 1, total: 19, deposit: 3.8, balance: 15.2, pickupDate: null,
};

describe('renderInvoiceHtml', () => {
  it('incluye nº de factura, total y seña', () => {
    const html = renderInvoiceHtml(data);
    expect(html).toContain('CL-000007');
    expect(html).toContain('19.00');
    expect(html).toContain('3.80');
    expect(html.toLowerCase()).toContain('seña');
  });
  it('muestra el descuento sólo si aplica', () => {
    expect(renderInvoiceHtml(data)).toContain('5%');
    expect(renderInvoiceHtml({ ...data, discountPct: 0, discountAmount: 0 })).not.toContain('%');
  });
});
```

- [ ] **Step 3: Correr y ver que falla**

Run: `npx jest invoice.template.spec.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 4: Implementar `invoice.template.ts`**

```ts
export interface InvoiceData {
  invoiceNumber: string;
  customerName: string;
  wineName: string;
  wineryName: string;
  storeName: string;
  storeAddress: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discountPct: number;
  discountAmount: number;
  total: number;
  deposit: number;
  balance: number;
  pickupDate?: string | null;
}

const m = (n: number) => '$' + Number(n).toFixed(2);

export function renderInvoiceHtml(d: InvoiceData): string {
  const discountRow = d.discountPct > 0
    ? `<tr><td>Descuento primera reserva (${d.discountPct}%)</td><td style="text-align:right;color:#2E8B57">-${m(d.discountAmount)}</td></tr>`
    : '';
  const pickup = d.pickupDate ? `<p style="margin:4px 0;color:#8B7F79">Retiro estimado: ${d.pickupDate}</p>` : '';
  return `<!DOCTYPE html><html lang="es"><body style="margin:0;background:#F3ECDD;font-family:Arial,Helvetica,sans-serif;color:#2A2024">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-top:4px solid #C2912B">
    <div style="background:#641E2E;color:#fff;padding:22px 28px">
      <div style="font-size:22px;font-weight:bold;font-family:Georgia,serif">CavaLocal</div>
      <div style="color:#E9C877;font-size:12px;letter-spacing:2px">FACTURA DE RESERVA</div>
    </div>
    <div style="padding:24px 28px">
      <p style="margin:0 0 2px">Hola <b>${d.customerName}</b>, tu reserva quedó confirmada.</p>
      <p style="margin:0 0 16px;color:#8B7F79">Factura <b>${d.invoiceNumber}</b></p>
      <div style="border:1px solid #E7DCC6;border-radius:10px;padding:14px 16px;margin-bottom:16px">
        <div style="font-weight:bold">${d.wineName} <span style="color:#8B7F79">× ${d.quantity}</span></div>
        <div style="color:#8B7F79;font-size:13px">${d.wineryName}</div>
        <div style="color:#8B7F79;font-size:13px;margin-top:6px">Retirar en <b>${d.storeName}</b> — ${d.storeAddress}</div>
        ${pickup}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 0">Subtotal (${d.quantity} × ${m(d.unitPrice)})</td><td style="text-align:right">${m(d.subtotal)}</td></tr>
        ${discountRow}
        <tr><td style="padding:6px 0;border-top:1px solid #E7DCC6;font-weight:bold">Total</td><td style="text-align:right;border-top:1px solid #E7DCC6;font-weight:bold">${m(d.total)}</td></tr>
        <tr><td style="padding:6px 0;color:#641E2E;font-weight:bold">Seña pagada ahora (20%)</td><td style="text-align:right;color:#641E2E;font-weight:bold">${m(d.deposit)}</td></tr>
        <tr><td style="padding:2px 0;color:#8B7F79">Saldo a pagar al retirar (80%)</td><td style="text-align:right;color:#8B7F79">${m(d.balance)}</td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:12px;color:#B4A89F">Pago de prueba — no se realizó un cobro real. Bebé con moderación · Solo para mayores de 18 años.</p>
    </div>
  </div></body></html>`;
}
```

- [ ] **Step 5: Correr y ver que pasa**

Run: `npx jest invoice.template.spec.ts`
Expected: PASS (2/2).

- [ ] **Step 6: Escribir el test del EmailService (falla)**

`backend/src/modules/notifications/email.service.spec.ts`:
```ts
const sendMail = jest.fn().mockResolvedValue({ messageId: 'x' });
jest.mock('nodemailer', () => ({ createTransport: jest.fn(() => ({ sendMail })) }));

import { EmailService } from './email.service';

const cfg = { get: (k: string) => (k === 'mail.user' ? 'cava@gmail.com' : k === 'mail.appPassword' ? 'app-pass' : undefined) } as any;
const invoice = {
  invoiceNumber: 'CL-000007', customerName: 'Ana', customerEmail: 'ana@example.com',
  wineName: 'Malbec', wineryName: 'Las Moras', storeName: 'Centro', storeAddress: 'Av',
  quantity: 1, unitPrice: 10, subtotal: 10, discountPct: 0, discountAmount: 0, total: 10, deposit: 2, balance: 8, pickupDate: null,
};

describe('EmailService', () => {
  beforeEach(() => sendMail.mockClear());

  it('envía la factura al correo del cliente y devuelve true', async () => {
    const svc = new EmailService(cfg);
    const ok = await svc.sendInvoice(invoice as any);
    expect(ok).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(1);
    const arg = sendMail.mock.calls[0][0];
    expect(arg.to).toBe('ana@example.com');
    expect(arg.html).toContain('CL-000007');
  });

  it('devuelve false si el envío falla (no lanza)', async () => {
    sendMail.mockRejectedValueOnce(new Error('smtp down'));
    const svc = new EmailService(cfg);
    await expect(svc.sendInvoice(invoice as any)).resolves.toBe(false);
  });
});
```

- [ ] **Step 7: Correr y ver que falla**

Run: `npx jest email.service.spec.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 8: Implementar `email.service.ts`**

```ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { InvoiceData, renderInvoiceHtml } from './invoice.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly from?: string;
  private readonly transporter: nodemailer.Transporter | null;

  constructor(config: ConfigService) {
    const user = config.get<string>('mail.user');
    const pass = config.get<string>('mail.appPassword');
    this.from = user;
    this.transporter = user && pass
      ? nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
      : null;
  }

  async sendInvoice(data: InvoiceData & { customerEmail: string }): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('MAIL_USER/MAIL_APP_PASSWORD sin configurar: no se envió el correo.');
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: `CavaLocal <${this.from}>`,
        to: data.customerEmail,
        subject: `Tu reserva en CavaLocal — Factura ${data.invoiceNumber}`,
        html: renderInvoiceHtml(data),
      });
      return true;
    } catch (e) {
      this.logger.error('Falló el envío de la factura: ' + (e as Error).message);
      return false;
    }
  }
}
```

- [ ] **Step 9: Crear el módulo `notifications`**

`backend/src/modules/notifications/notifications.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class NotificationsModule {}
```

- [ ] **Step 10: Correr toda la suite y commitear**

Run: `npx jest notifications`
Expected: PASS (invoice 2 + email 2).
```powershell
git add src/modules/notifications package.json package-lock.json
git commit -m "feat(notifications): factura HTML + envío real por Gmail SMTP (Nodemailer) con tests"
```

---

## Task 4: `ReservationsService` — montos, crear y pagar (TDD)

**Files:**
- Create: `backend/src/modules/reservations/reservations.service.ts`
- Test: `backend/src/modules/reservations/reservations.service.spec.ts`

**Interfaces:**
- Consumes: `PaymentsService.charge`, `EmailService.sendInvoice`, `PrismaService`.
- Produces:
  - `ReservationsService.computeAmounts({ unitPrice, quantity, isFirstReservation }): { subtotal, discountPct, discountAmount, total, deposit, balance }`
  - `createReservation(userId, dto): Promise<Reservation>` (status `pending_payment`)
  - `payReservation(userId, id, card): Promise<{ reservation; emailSent: boolean }>`
  - `listMine(userId): Promise<Reservation[]>`

- [ ] **Step 1: Escribir el test de `computeAmounts` (falla)**

`backend/src/modules/reservations/reservations.service.spec.ts`:
```ts
import { ReservationsService } from './reservations.service';

describe('ReservationsService.computeAmounts', () => {
  const svc = new ReservationsService({} as any, {} as any, {} as any);

  it('aplica 5% en primera reserva y seña 20/80', () => {
    const a = svc.computeAmounts({ unitPrice: 10, quantity: 2, isFirstReservation: true });
    expect(a.subtotal).toBe(20);
    expect(a.discountPct).toBe(5);
    expect(a.discountAmount).toBe(1);
    expect(a.total).toBe(19);
    expect(a.deposit).toBe(3.8);
    expect(a.balance).toBe(15.2);
  });

  it('sin descuento si no es primera reserva', () => {
    const a = svc.computeAmounts({ unitPrice: 12.5, quantity: 1, isFirstReservation: false });
    expect(a.discountPct).toBe(0);
    expect(a.total).toBe(12.5);
    expect(a.deposit).toBe(2.5);
    expect(a.balance).toBe(10);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npx jest reservations.service.spec.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `reservations.service.ts`**

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { EmailService } from '../notifications/email.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { PayReservationDto } from './dto/pay-reservation.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly email: EmailService,
  ) {}

  computeAmounts(input: { unitPrice: number; quantity: number; isFirstReservation: boolean }) {
    const subtotal = round2(input.unitPrice * input.quantity);
    const discountPct = input.isFirstReservation ? 5 : 0;
    const discountAmount = round2((subtotal * discountPct) / 100);
    const total = round2(subtotal - discountAmount);
    const deposit = round2(total * 0.2);
    const balance = round2(total - deposit);
    return { subtotal, discountPct, discountAmount, total, deposit, balance };
  }

  async createReservation(userId: string, dto: CreateReservationDto) {
    const availability = await this.prisma.availability.findUnique({
      where: { wineId_establishmentId: { wineId: dto.wineId, establishmentId: dto.establishmentId } },
      include: { wine: true, establishment: true },
    });
    if (!availability) throw new NotFoundException('Ese vino no está disponible en esa tienda.');

    const priorCount = await this.prisma.reservation.count({ where: { userId } });
    const unitPrice = Number(availability.price);
    const amounts = this.computeAmounts({ unitPrice, quantity: dto.quantity, isFirstReservation: priorCount === 0 });

    const total = await this.prisma.reservation.count();
    const invoiceNumber = 'CL-' + String(total + 1).padStart(6, '0');

    return this.prisma.reservation.create({
      data: {
        invoiceNumber,
        userId,
        wineId: dto.wineId,
        establishmentId: dto.establishmentId,
        quantity: dto.quantity,
        unitPrice,
        ...amounts,
        wineName: availability.wine.name,
        wineryName: availability.wine.wineryName,
        storeName: availability.establishment.name,
        storeAddress: availability.establishment.address,
        customerName: dto.customer.name,
        customerEmail: dto.customer.email,
        customerPhone: dto.customer.phone,
        pickupDate: dto.pickupDate ? new Date(dto.pickupDate) : null,
        status: 'pending_payment',
      },
    });
  }

  async payReservation(userId: string, id: string, card: PayReservationDto) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id } });
    if (!reservation || reservation.userId !== userId) throw new NotFoundException('Reserva no encontrada.');
    if (reservation.status === 'confirmed') throw new BadRequestException('La reserva ya está pagada.');

    this.payments.charge(Number(reservation.deposit), card);

    const emailSent = await this.email.sendInvoice({
      invoiceNumber: reservation.invoiceNumber,
      customerName: reservation.customerName,
      customerEmail: reservation.customerEmail,
      wineName: reservation.wineName,
      wineryName: reservation.wineryName,
      storeName: reservation.storeName,
      storeAddress: reservation.storeAddress,
      quantity: reservation.quantity,
      unitPrice: Number(reservation.unitPrice),
      subtotal: Number(reservation.subtotal),
      discountPct: reservation.discountPct,
      discountAmount: Number(reservation.discountAmount),
      total: Number(reservation.total),
      deposit: Number(reservation.deposit),
      balance: Number(reservation.balance),
      pickupDate: reservation.pickupDate ? reservation.pickupDate.toISOString().slice(0, 10) : null,
    });

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: { status: 'confirmed', emailSent },
    });
    return { reservation: updated, emailSent };
  }

  listMine(userId: string) {
    return this.prisma.reservation.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
}
```

- [ ] **Step 4: Correr y ver que pasa (computeAmounts)**

Run: `npx jest reservations.service.spec.ts`
Expected: PASS (2/2).

- [ ] **Step 5: Agregar test de `payReservation` (confirma + envía correo)**

Añadir a `reservations.service.spec.ts`:
```ts
describe('ReservationsService.payReservation', () => {
  const reservation = {
    id: 'r1', userId: 'u1', status: 'pending_payment', deposit: 3.8, invoiceNumber: 'CL-000001',
    customerName: 'Ana', customerEmail: 'ana@example.com', wineName: 'Malbec', wineryName: 'Las Moras',
    storeName: 'Centro', storeAddress: 'Av', quantity: 2, unitPrice: 10, subtotal: 20, discountPct: 5,
    discountAmount: 1, total: 19, balance: 15.2, pickupDate: null,
  };
  const prisma = { reservation: { findUnique: jest.fn(), update: jest.fn() } } as any;
  const payments = { charge: jest.fn().mockReturnValue({ status: 'approved', paymentId: 'pay_x' }) } as any;
  const email = { sendInvoice: jest.fn().mockResolvedValue(true) } as any;
  const svc = new ReservationsService(prisma, payments, email);

  beforeEach(() => { jest.clearAllMocks(); payments.charge.mockReturnValue({ status: 'approved', paymentId: 'pay_x' }); email.sendInvoice.mockResolvedValue(true); });

  it('cobra la seña, manda la factura y confirma', async () => {
    prisma.reservation.findUnique.mockResolvedValue(reservation);
    prisma.reservation.update.mockResolvedValue({ ...reservation, status: 'confirmed', emailSent: true });
    const res = await svc.payReservation('u1', 'r1', { cardNumber: '4242424242424242', expiry: '12/35', cvv: '123', cardName: 'Ana' } as any);
    expect(payments.charge).toHaveBeenCalledWith(3.8, expect.anything());
    expect(email.sendInvoice).toHaveBeenCalled();
    expect(res.emailSent).toBe(true);
    expect(res.reservation.status).toBe('confirmed');
  });
});
```

- [ ] **Step 6: Correr y ver que pasa**

Run: `npx jest reservations.service.spec.ts`
Expected: PASS (3/3).

- [ ] **Step 7: Commit**

```powershell
git add src/modules/reservations/reservations.service.ts src/modules/reservations/reservations.service.spec.ts
git commit -m "feat(reservations): montos (descuento/seña), crear y pagar con factura por correo + tests"
```

---

## Task 5: DTOs + Controller + Módulo + config + smoke test

**Files:**
- Create: `backend/src/modules/reservations/dto/create-reservation.dto.ts`
- Create: `backend/src/modules/reservations/dto/pay-reservation.dto.ts`
- Create: `backend/src/modules/reservations/reservations.controller.ts`
- Create: `backend/src/modules/reservations/reservations.module.ts`
- Modify: `backend/src/config/configuration.ts`, `backend/src/config/env.validation.ts`, `backend/.env`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Produces: rutas `POST /reservations`, `POST /reservations/:id/pay`, `GET /reservations/me` (todas con `JwtAuthGuard`).

- [ ] **Step 1: Crear `create-reservation.dto.ts`**

```ts
import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, IsDateString, Max, Min, ValidateNested } from 'class-validator';

export class CustomerDto {
  @IsNotEmpty() @IsString() name!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
}

export class CreateReservationDto {
  @IsNotEmpty() @IsString() wineId!: string;
  @IsNotEmpty() @IsString() establishmentId!: string;
  @IsInt() @Min(1) @Max(6) quantity!: number;
  @ValidateNested() @Type(() => CustomerDto) customer!: CustomerDto;
  @IsOptional() @IsDateString() pickupDate?: string;
}
```

- [ ] **Step 2: Crear `pay-reservation.dto.ts`**

```ts
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class PayReservationDto {
  @IsString() @Matches(/^[\d\s]{13,25}$/, { message: 'Número de tarjeta inválido.' }) cardNumber!: string;
  @IsString() @Matches(/^\d{2}\/\d{2}$/, { message: 'Vencimiento inválido (MM/AA).' }) expiry!: string;
  @IsString() @Matches(/^\d{3,4}$/, { message: 'CVV inválido.' }) cvv!: string;
  @IsString() @IsNotEmpty() cardName!: string;
}
```

- [ ] **Step 3: Crear `reservations.controller.ts`**

```ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { PayReservationDto } from './dto/pay-reservation.dto';

@ApiTags('reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una reserva (pendiente de pago) y devolver el desglose' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReservationDto) {
    return this.service.createReservation(user.userId, dto);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Pagar la seña (simulado), confirmar y enviar la factura por correo' })
  pay(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: PayReservationDto) {
    return this.service.payReservation(user.userId, id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Mis reservas' })
  mine(@CurrentUser() user: AuthUser) {
    return this.service.listMine(user.userId);
  }
}
```

- [ ] **Step 4: Crear `reservations.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, PaymentsService],
})
export class ReservationsModule {}
```

- [ ] **Step 5: Config de correo + validación de entorno**

En `backend/src/config/configuration.ts`, agregar dentro del objeto devuelto:
```ts
  mail: {
    user: process.env.MAIL_USER as string,
    appPassword: process.env.MAIL_APP_PASSWORD as string,
  },
```
En `backend/src/config/env.validation.ts`, dentro de `EnvironmentVariables`:
```ts
  @IsOptional()
  @IsString()
  MAIL_USER?: string;

  @IsOptional()
  @IsString()
  MAIL_APP_PASSWORD?: string;
```
En `backend/.env`, agregar:
```
# Correo (Gmail SMTP) para la factura. Crear una "contraseña de aplicación" de Gmail.
MAIL_USER="tu-correo@gmail.com"
MAIL_APP_PASSWORD="PEGAR_APP_PASSWORD_16_CHARS"
```

- [ ] **Step 6: Registrar el módulo en `app.module.ts`**

En `backend/src/app.module.ts`, importar y agregar `ReservationsModule` al array `imports`:
```ts
import { ReservationsModule } from './modules/reservations/reservations.module';
```
Agregar `ReservationsModule` en `imports: [ ... ]`.

- [ ] **Step 7: Suite completa + build**

Run (en `backend/`):
```powershell
npm test
npm run build
```
Expected: todos los specs verdes (payments 4, invoice 2, email 2, reservations 3, auth 4) y build exit 0.

- [ ] **Step 8: Reiniciar el backend y smoke test de la ruta**

Run (PowerShell):
```powershell
$c = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue; if ($c) { Stop-Process -Id $c.OwningProcess -Force; Start-Sleep 2 }
cd "c:\Users\euger\OneDrive\Escritorio\CavaLocal\backend"; Start-Process -WindowStyle Hidden powershell -ArgumentList '-NoProfile','-Command','npm run start:dev'
Start-Sleep 14
# Login para obtener token y crear una reserva real (usa un wineId/establishmentId reales del catálogo)
$login = Invoke-RestMethod -Uri http://localhost:3001/auth/login -Method Post -ContentType 'application/json' -Body '{"email":"ana@example.com","password":"1234"}'
$wine = (Invoke-RestMethod -Uri http://localhost:3001/wines)[0]
$est  = $wine.availabilities[0].establishmentId
$body = @{ wineId=$wine.id; establishmentId=$est; quantity=1; customer=@{ name='Ana'; email='ana@example.com' } } | ConvertTo-Json
$res = Invoke-RestMethod -Uri http://localhost:3001/reservations -Method Post -ContentType 'application/json' -Headers @{ Authorization = "Bearer $($login.accessToken)" } -Body $body
Write-Output "Reserva $($res.invoiceNumber): total $($res.total) seña $($res.deposit) saldo $($res.balance) descuento $($res.discountPct)%"
```
Expected: imprime una reserva con `invoiceNumber` `CL-000001` (o siguiente), seña = 20% del total.

- [ ] **Step 9: Commit**

```powershell
git add src/modules/reservations/dto src/modules/reservations/reservations.controller.ts src/modules/reservations/reservations.module.ts src/config/configuration.ts src/config/env.validation.ts src/app.module.ts
git commit -m "feat(reservations): DTOs, controller, módulo, config de correo y wiring"
```

---

## Task 6: Frontend — utilidades de tarjeta (TDD), `money.js` y métodos de `api.js`

**Files:**
- Create: `web/js/payment-utils.js`
- Test: `web/test/payment-utils.test.mjs`
- Create: `web/js/money.js`
- Modify: `web/js/api.js`

**Interfaces:**
- Produces:
  - `luhnValid(num: string): boolean`, `formatCardNumber(v: string): string`, `expiryValid(mmYY: string, now?: Date): boolean`, `cvvValid(v: string): boolean`
  - `money(n: number): string`
  - `api.createReservation(payload): Promise<reservation>`, `api.payReservation(id, card): Promise<{reservation, emailSent}>`, `api.myReservations(): Promise<reservation[]>`

- [ ] **Step 1: Escribir el test de `payment-utils` (falla)**

`web/test/payment-utils.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { luhnValid, formatCardNumber, expiryValid, cvvValid } from '../js/payment-utils.js';

test('luhnValid acepta una tarjeta de prueba válida', () => {
  assert.equal(luhnValid('4242 4242 4242 4242'), true);
  assert.equal(luhnValid('1234 5678 9012 3456'), false);
});
test('formatCardNumber agrupa de a 4', () => {
  assert.equal(formatCardNumber('4242424242424242'), '4242 4242 4242 4242');
});
test('expiryValid compara contra una fecha dada', () => {
  const now = new Date(2026, 0, 15); // ene 2026
  assert.equal(expiryValid('12/26', now), true);
  assert.equal(expiryValid('01/20', now), false);
  assert.equal(expiryValid('13/30', now), false);
});
test('cvvValid acepta 3 o 4 dígitos', () => {
  assert.equal(cvvValid('123'), true);
  assert.equal(cvvValid('1'), false);
});
```

- [ ] **Step 2: Correr y ver que falla**

Run (en `web/`): `node --test test/payment-utils.test.mjs`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `payment-utils.js`**

```js
export function luhnValid(num) {
  const s = String(num || '').replace(/\D/g, '');
  if (s.length < 13 || s.length > 19) return false;
  let sum = 0, alt = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = Number(s[i]);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}
export function formatCardNumber(v) {
  return String(v || '').replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}
export function expiryValid(mmYY, now = new Date()) {
  const m = /^(\d{2})\/(\d{2})$/.exec(String(mmYY || '').trim());
  if (!m) return false;
  const mo = Number(m[1]); const yr = 2000 + Number(m[2]);
  if (mo < 1 || mo > 12) return false;
  return new Date(yr, mo, 1) > now;
}
export function cvvValid(v) { return /^\d{3,4}$/.test(String(v || '').trim()); }
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `node --test test/payment-utils.test.mjs`
Expected: PASS (4/4).

- [ ] **Step 5: Crear `money.js`**

`web/js/money.js`:
```js
export function money(n) { return '$' + Number(n || 0).toFixed(2); }
```

- [ ] **Step 6: Agregar métodos con auth a `api.js`**

En `web/js/api.js`, agregar el import de `getToken` y los métodos (al final del archivo):
```js
import { getToken } from './store.js';

async function authFetch(path, options) {
  const r = await fetch(API + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken(), ...(options && options.headers) },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data && data.message;
    throw new Error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Ocurrió un error.'));
  }
  return data;
}

export function createReservation(payload) { return authFetch('/reservations', { method: 'POST', body: JSON.stringify(payload) }); }
export function payReservation(id, card) { return authFetch('/reservations/' + id + '/pay', { method: 'POST', body: JSON.stringify(card) }); }
export function myReservations() { return authFetch('/reservations/me', { method: 'GET' }); }
```

- [ ] **Step 7: Verificar carga de módulos + tests del front**

Run (en `web/`):
```powershell
node -e "import('./js/api.js').then(m=>console.log('api:',Object.keys(m).join(','))).catch(e=>{console.error(e);process.exit(1)})"
npm test
```
Expected: `api:` lista incluye `createReservation,payReservation,myReservations`; tests 10/10 (6 previos + 4 nuevos).

- [ ] **Step 8: Commit**

```powershell
git add js/payment-utils.js test/payment-utils.test.mjs js/money.js js/api.js
git commit -m "feat(web): utilidades de tarjeta (TDD), money y métodos de reserva en api"
```

---

## Task 7: Overlay de checkout (reserva → datos → pago → confirmación)

**Files:**
- Create: `web/js/checkout.js`
- Create: `web/css/checkout.css`
- Modify: `web/index.html`
- Modify: `web/js/app.js`

**Interfaces:**
- Consumes: `api.createReservation/payReservation`, `payment-utils.*`, `money`, `store.getUser`.
- Produces: `openCheckout(wine, defaultOffer?)` montado en `window` desde `app.js`.

> **Invocar la skill `frontend-design` en esta task** para elevar el overlay (stepper, resumen, estados). El código de abajo es la base funcional correcta.

- [ ] **Step 1: Agregar el contenedor y el CSS al `index.html`**

En `web/index.html`, en `<head>` después de `<link rel="stylesheet" href="css/styles.css" />`:
```html
  <link rel="stylesheet" href="css/checkout.css" />
```
Antes de `<script type="module" src="js/app.js"></script>` agregar:
```html
  <div id="checkout"></div>
```

- [ ] **Step 2: Crear `css/checkout.css`**

`web/css/checkout.css`:
```css
.co-bg { position: fixed; inset: 0; background: rgba(20,8,12,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.co-bg.hidden { display: none; }
.co-modal { background: var(--card); border-radius: var(--radius-xl); border-top: 3px solid var(--gold); width: 100%; max-width: 560px; max-height: 92vh; overflow-y: auto; box-shadow: var(--shadow-lg); }
.co-head { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; }
.co-head h3 { font-family: var(--font-display); color: var(--wine); font-size: 22px; }
.co-close { width: 36px; height: 36px; border-radius: 50%; background: var(--surface); color: var(--ink); font-size: 18px; }
.co-close:hover { background: var(--gold-soft); }
.co-steps { display: flex; gap: 8px; padding: 16px 24px; }
.co-steps .st { flex: 1; height: 5px; border-radius: 4px; background: var(--border); transition: var(--transition); }
.co-steps .st.done { background: var(--gold); }
.co-steps .st.active { background: var(--wine); }
.co-body { padding: 4px 24px 24px; }
.co-prod { display: flex; gap: 14px; align-items: center; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 16px; }
.co-prod .nm { font-weight: 800; }
.co-prod .wn { font-size: 12px; color: var(--gold); font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
.co-field { margin-bottom: 14px; }
.co-field label { display: block; font-size: 13px; font-weight: 700; margin-bottom: 6px; }
.co-field input, .co-field select { width: 100%; height: 46px; border: 1px solid var(--border); background: var(--surface); border-radius: var(--radius-md); padding: 0 13px; font-size: 15px; outline: none; }
.co-field input:focus, .co-field select:focus { border-color: var(--gold); box-shadow: 0 0 0 3px var(--gold-soft); }
.co-field input.invalid { border-color: var(--danger); }
.co-row { display: flex; gap: 12px; }
.co-row > * { flex: 1; }
.co-summary { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px 16px; margin: 8px 0 16px; font-size: 14px; }
.co-summary .ln { display: flex; justify-content: space-between; padding: 3px 0; }
.co-summary .disc { color: var(--green); }
.co-summary .tot { border-top: 1px solid var(--border); margin-top: 6px; padding-top: 8px; font-weight: 800; }
.co-summary .dep { color: var(--wine); font-weight: 800; }
.co-summary .bal { color: var(--muted); font-size: 13px; }
.co-error { background: #fbeaea; color: var(--danger); border-radius: var(--radius-md); padding: 10px 13px; font-size: 13px; margin-bottom: 12px; }
.co-actions { display: flex; gap: 12px; margin-top: 8px; }
.co-btn { flex: 1; height: 50px; border-radius: var(--radius-md); font-weight: 800; font-size: 15px; transition: var(--transition); }
.co-btn.prim { background: var(--wine); color: #fff; }
.co-btn.prim:hover { background: var(--wine-soft); }
.co-btn.prim[disabled] { opacity: .6; cursor: default; }
.co-btn.ghost { background: var(--surface); color: var(--ink); }
.co-ok { text-align: center; padding: 8px 0 4px; }
.co-ok .check { width: 64px; height: 64px; border-radius: 50%; background: var(--green); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 34px; margin: 0 auto 12px; }
.co-ok h3 { font-family: var(--font-display); color: var(--wine); font-size: 24px; }
.co-ok p { color: var(--muted); margin: 6px 0 0; }
@media (max-width: 560px) { .co-row { flex-direction: column; } }
```

- [ ] **Step 3: Crear `js/checkout.js`**

`web/js/checkout.js`:
```js
import * as api from './api.js';
import { getUser } from './store.js';
import { money } from './money.js';
import { luhnValid, formatCardNumber, expiryValid, cvvValid } from './payment-utils.js';

const $ = (s, r) => (r || document).querySelector(s);
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

let st = null;

export function openCheckout(wine) {
  const user = getUser();
  const offers = (wine.offers || []).slice().sort((a, b) => a.price - b.price);
  st = {
    wine, offers,
    offerIdx: 0,
    quantity: 1,
    customer: { name: user ? user.name : '', email: user ? user.email : '', phone: '' },
    pickupDate: '',
    step: 1,
    reservation: null,
  };
  render();
}

function close() { const el = $('#checkout'); el.innerHTML = ''; st = null; }

function steps(n) {
  return '<div class="co-steps">' + [1, 2, 3, 4].map((i) =>
    '<div class="st ' + (i < n ? 'done' : i === n ? 'active' : '') + '"></div>').join('') + '</div>';
}

function render() {
  const el = $('#checkout');
  let inner = '';
  if (st.step === 1) inner = stepReserva();
  else if (st.step === 2) inner = stepDatos();
  else if (st.step === 3) inner = stepPago();
  else inner = stepConfirma();
  el.innerHTML = '<div class="co-bg"><div class="co-modal">' +
    '<div class="co-head"><h3>' + (st.step === 4 ? 'Reserva confirmada' : 'Reservar') + '</h3>' +
    (st.step === 4 ? '' : '<button class="co-close" aria-label="Cerrar">✕</button>') + '</div>' +
    (st.step === 4 ? '' : steps(st.step)) +
    '<div class="co-body">' + inner + '</div></div></div>';
  bind();
}

function prodCard() {
  const w = st.wine;
  return '<div class="co-prod"><div><div class="wn">' + esc(w.winery) + '</div><div class="nm">' + esc(w.name) + (w.vintage ? ' ' + w.vintage : '') + '</div></div></div>';
}

function stepReserva() {
  const opts = st.offers.map((o, i) =>
    '<option value="' + i + '"' + (i === st.offerIdx ? ' selected' : '') + '>' + esc(o.storeName) + ' — ' + money(o.price) + (o.dist != null ? ' · ' + o.dist + ' km' : '') + '</option>').join('');
  const qty = [1, 2, 3, 4, 5, 6].map((n) => '<option value="' + n + '"' + (n === st.quantity ? ' selected' : '') + '>' + n + '</option>').join('');
  return prodCard() +
    '<div class="co-field"><label>Tienda para retirar</label><select id="co-store">' + opts + '</select></div>' +
    '<div class="co-field"><label>Cantidad</label><select id="co-qty">' + qty + '</select></div>' +
    '<div class="co-actions"><button class="co-btn prim" id="co-next">Continuar</button></div>';
}

function stepDatos() {
  const c = st.customer;
  return prodCard() +
    '<div class="co-field"><label>Nombre</label><input id="co-name" value="' + esc(c.name) + '" placeholder="Tu nombre" /></div>' +
    '<div class="co-field"><label>Correo (te llega la factura)</label><input id="co-email" type="email" value="' + esc(c.email) + '" placeholder="tucorreo@ejemplo.com" /></div>' +
    '<div class="co-row"><div class="co-field"><label>Teléfono</label><input id="co-phone" value="' + esc(c.phone) + '" placeholder="Opcional" /></div>' +
    '<div class="co-field"><label>Fecha de retiro</label><input id="co-date" type="date" value="' + esc(st.pickupDate) + '" /></div></div>' +
    '<div class="co-error co-hide" id="co-err"></div>' +
    '<div class="co-actions"><button class="co-btn ghost" id="co-back">Atrás</button><button class="co-btn prim" id="co-next">Ir a pagar</button></div>';
}

function summary(r) {
  const disc = r.discountPct > 0
    ? '<div class="ln disc"><span>Descuento primera reserva (' + r.discountPct + '%)</span><span>-' + money(r.discountAmount) + '</span></div>' : '';
  return '<div class="co-summary">' +
    '<div class="ln"><span>Subtotal (' + r.quantity + ' × ' + money(r.unitPrice) + ')</span><span>' + money(r.subtotal) + '</span></div>' +
    disc +
    '<div class="ln tot"><span>Total</span><span>' + money(r.total) + '</span></div>' +
    '<div class="ln dep"><span>Seña a pagar ahora (20%)</span><span>' + money(r.deposit) + '</span></div>' +
    '<div class="ln bal"><span>Saldo al retirar (80%)</span><span>' + money(r.balance) + '</span></div></div>';
}

function stepPago() {
  const r = st.reservation;
  return summary(r) +
    '<div class="co-field"><label>Número de tarjeta</label><input id="cc-num" inputmode="numeric" placeholder="4242 4242 4242 4242" /></div>' +
    '<div class="co-row"><div class="co-field"><label>Vencimiento</label><input id="cc-exp" placeholder="MM/AA" /></div>' +
    '<div class="co-field"><label>CVV</label><input id="cc-cvv" inputmode="numeric" placeholder="123" /></div></div>' +
    '<div class="co-field"><label>Titular</label><input id="cc-name" placeholder="Como figura en la tarjeta" /></div>' +
    '<div class="co-error co-hide" id="co-err"></div>' +
    '<div class="co-actions"><button class="co-btn ghost" id="co-back">Atrás</button><button class="co-btn prim" id="co-pay">Pagar ' + money(r.deposit) + '</button></div>';
}

function stepConfirma() {
  const r = st.reservation;
  const mailMsg = st._emailSent
    ? 'Te enviamos la factura a <b>' + esc(r.customerEmail) + '</b>.'
    : 'No pudimos enviar el correo, pero podés imprimir la factura.';
  return '<div class="co-ok"><div class="check">✓</div>' +
    '<h3>¡Reserva confirmada!</h3>' +
    '<p>Código <b>' + esc(r.invoiceNumber) + '</b>. ' + mailMsg + '</p></div>' +
    summary(r) +
    '<div class="co-actions"><button class="co-btn ghost" id="co-print">Imprimir factura</button><button class="co-btn prim" id="co-done">Listo</button></div>';
}

function showErr(msg) { const e = $('#co-err'); if (e) { e.textContent = msg; e.classList.remove('co-hide'); } }

function bind() {
  const close1 = $('.co-close'); if (close1) close1.onclick = close;
  const bg = $('.co-bg'); if (bg) bg.onclick = (e) => { if (e.target === bg) close(); };
  const back = $('#co-back'); if (back) back.onclick = () => { st.step--; if (st.step === 2) st.reservation = null; render(); };

  if (st.step === 1) {
    $('#co-store').onchange = (e) => { st.offerIdx = Number(e.target.value); };
    $('#co-qty').onchange = (e) => { st.quantity = Number(e.target.value); };
    $('#co-next').onclick = () => { st.step = 2; render(); };
  }

  if (st.step === 2) {
    $('#co-next').onclick = async () => {
      st.customer.name = $('#co-name').value.trim();
      st.customer.email = $('#co-email').value.trim();
      st.customer.phone = $('#co-phone').value.trim();
      st.pickupDate = $('#co-date').value;
      if (!st.customer.name) return showErr('Ingresá tu nombre.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(st.customer.email)) return showErr('Ingresá un correo válido.');
      const offer = st.offers[st.offerIdx];
      const btn = $('#co-next'); btn.disabled = true; btn.textContent = 'Creando reserva…';
      try {
        st.reservation = await api.createReservation({
          wineId: st.wine.id, establishmentId: offer.storeId, quantity: st.quantity,
          customer: { name: st.customer.name, email: st.customer.email, phone: st.customer.phone || undefined },
          pickupDate: st.pickupDate || undefined,
        });
        st.step = 3; render();
      } catch (err) { btn.disabled = false; btn.textContent = 'Ir a pagar'; showErr(err.message); }
    };
  }

  if (st.step === 3) {
    const num = $('#cc-num');
    num.oninput = () => { num.value = formatCardNumber(num.value); };
    $('#co-pay').onclick = async () => {
      const card = { cardNumber: num.value, expiry: $('#cc-exp').value.trim(), cvv: $('#cc-cvv').value.trim(), cardName: $('#cc-name').value.trim() };
      if (!luhnValid(card.cardNumber)) return showErr('Número de tarjeta inválido.');
      if (!expiryValid(card.expiry)) return showErr('Vencimiento inválido o tarjeta vencida.');
      if (!cvvValid(card.cvv)) return showErr('CVV inválido.');
      if (!card.cardName) return showErr('Ingresá el titular.');
      const btn = $('#co-pay'); btn.disabled = true; btn.textContent = 'Procesando…';
      try {
        const out = await api.payReservation(st.reservation.id, card);
        st.reservation = out.reservation; st._emailSent = out.emailSent;
        st.step = 4; render();
      } catch (err) { btn.disabled = false; btn.textContent = 'Pagar ' + money(st.reservation.deposit); showErr(err.message); }
    };
  }

  if (st.step === 4) {
    $('#co-done').onclick = close;
    $('#co-print').onclick = () => printInvoice(st.reservation);
  }
}

function printInvoice(r) {
  const w = window.open('', '_blank');
  const disc = r.discountPct > 0 ? '<tr><td>Descuento (' + r.discountPct + '%)</td><td style="text-align:right">-' + money(r.discountAmount) + '</td></tr>' : '';
  w.document.write('<html><head><title>Factura ' + esc(r.invoiceNumber) + '</title></head><body style="font-family:Arial;max-width:560px;margin:24px auto;color:#2A2024">' +
    '<h2 style="color:#641E2E">CavaLocal — Factura ' + esc(r.invoiceNumber) + '</h2>' +
    '<p>' + esc(r.customerName) + ' · ' + esc(r.customerEmail) + '</p>' +
    '<p><b>' + esc(r.wineName) + '</b> × ' + r.quantity + ' — retirar en ' + esc(r.storeName) + ' (' + esc(r.storeAddress) + ')</p>' +
    '<table style="width:100%;border-collapse:collapse">' +
    '<tr><td>Subtotal</td><td style="text-align:right">' + money(r.subtotal) + '</td></tr>' + disc +
    '<tr><td><b>Total</b></td><td style="text-align:right"><b>' + money(r.total) + '</b></td></tr>' +
    '<tr><td>Seña pagada (20%)</td><td style="text-align:right">' + money(r.deposit) + '</td></tr>' +
    '<tr><td>Saldo al retirar (80%)</td><td style="text-align:right">' + money(r.balance) + '</td></tr></table>' +
    '<p style="font-size:12px;color:#999">Pago de prueba — sin cobro real. Bebé con moderación · +18.</p>' +
    '</body></html>');
  w.document.close(); w.focus(); w.print();
}
```
Nota: agregar al final de `css/checkout.css` la utilidad `.co-hide { display:none; }`.

- [ ] **Step 4: Conectar `app.js` al checkout + retorno pendiente**

En `web/js/app.js`:
1) Agregar el import al inicio (junto a los otros):
```js
import { openCheckout } from './checkout.js';
```
2) Reemplazar la función `reserve` por:
```js
  function reserve(id) {
    if (!getUser()) {
      setPendingReturn('return=reserve:' + id);
      window.location.href = 'login.html';
      return;
    }
    var w = state.raw.filter(function (x) { return x.id === id; })[0];
    if (w) openCheckout(w);
  }
```
3) Al final de `init()`, después de `render();`, agregar el manejo del retorno pendiente:
```js
    var ret = new URLSearchParams(location.search).get('return');
    if (ret && ret.indexOf('reserve:') === 0 && getUser()) {
      var rid = ret.slice('reserve:'.length);
      var w = state.raw.filter(function (x) { return x.id === rid; })[0];
      if (w) openCheckout(w);
      history.replaceState(null, '', 'index.html');
    }
```

- [ ] **Step 5: Verificación manual end-to-end (skill `run`/`verify`)**

Con Postgres + backend (`npm run start:dev`) + `http-server` arriba:
1. Abrir `http://localhost:8080`, iniciar sesión (`ana@example.com` / `1234`).
2. En un vino, click **Reservar** → abre el overlay.
3. Paso 1: elegir tienda + cantidad → Continuar.
4. Paso 2: datos precargados, fecha → Ir a pagar (crea la reserva; ver el desglido con seña 20%).
5. Paso 3: tarjeta de prueba `4242 4242 4242 4242`, `12/35`, `123`, titular → Pagar.
6. Paso 4: confirmación con `CL-00000X`; si `MAIL_*` están configurados, **llega el correo**; "Imprimir factura" abre la vista imprimible.
7. Probar validaciones: tarjeta `1234 5678 9012 3456` → error; correo vacío → error.

- [ ] **Step 6: Commit**

```powershell
git add index.html css/checkout.css js/checkout.js js/app.js
git commit -m "feat(web): overlay de checkout (reserva->datos->pago->factura) + retorno pendiente (frontend-design)"
```

---

## Self-Review (cobertura del spec, Plan 2)

- **Plataforma de pago (reserva + seña)** → Tasks 4, 7. ✓
- **Seña 20% / saldo 80%** → `computeAmounts` (Task 4) + resumen (Task 7). ✓
- **5% primera reserva, en el pago** → `computeAmounts` con `isFirstReservation` (Task 4); se muestra en el resumen del paso de pago (Task 7). ✓
- **Pago simulado, sin persistir tarjeta** → `PaymentsService` (Task 2). ✓
- **Factura por correo REAL (Gmail/Nodemailer)** → `EmailService` + plantilla (Task 3); disparada al pagar (Task 4). ✓
- **Factura descargable/imprimible** → `printInvoice` (Task 7). ✓
- **Persistencia + nº de factura** → modelo `Reservation` (Task 1) + `invoiceNumber` (Task 4). ✓
- **Arquitectura por capas + DTOs validados (customer anidado)** → Task 5. ✓
- **Manejo de error de correo (no tumba la confirmación)** → `EmailService` devuelve `false`; UI muestra alternativa (Tasks 3, 7). ✓
- **Sin placeholders de código:** todos los steps de código incluyen el código real. Únicos marcadores intencionales: credenciales de `.env` (`PEGAR_APP_PASSWORD_16_CHARS`, `tu-correo@gmail.com`), input del usuario. ✓
- **Consistencia de tipos/nombres:** `computeAmounts/createReservation/payReservation/listMine`, `charge`, `sendInvoice/renderInvoiceHtml`, `createReservation/payReservation/myReservations` (api), `openCheckout`, `luhnValid/formatCardNumber/expiryValid/cvvValid`, `money` — usados con firmas consistentes entre tasks. ✓

## Execution Handoff

Al ejecutar: **Subagent-Driven** (`superpowers:subagent-driven-development`) o **Inline** (`superpowers:executing-plans`). En la Task 7 invocar **`frontend-design`**. Para el correo real, el usuario debe cargar `MAIL_USER`/`MAIL_APP_PASSWORD` (contraseña de aplicación de Gmail) en `backend/.env`.
