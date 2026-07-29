import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { EmailService } from '../notifications/email.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { PayReservationDto } from './dto/pay-reservation.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly email: EmailService,
  ) {}

  private haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
    const rad = (d: number) => (d * Math.PI) / 180;
    const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng);
    const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(rad(aLat)) * Math.cos(rad(bLat));
    return 6371 * 2 * Math.asin(Math.sqrt(h));
  }

  deliveryFeeFor(orderType: string, store: { lat: number; lng: number }, deliveryLat?: number, deliveryLng?: number): number {
    if (orderType !== 'delivery') return 0;
    const BASE_FEE = 0.80;  // cargo base del envío
    const PER_KM = 0.35;    // costo por km
    const MAX_KM = 50;      // tope de distancia (sanidad)
    const km = Math.min(MAX_KM, Math.max(0, this.haversineKm(store.lat, store.lng, deliveryLat ?? store.lat, deliveryLng ?? store.lng)));
    return round2(BASE_FEE + PER_KM * km);
  }

  computeAmounts(input: { unitPrice: number; quantity: number; isFirstReservation: boolean; deliveryFee?: number }) {
    const deliveryFee = round2(input.deliveryFee ?? 0);
    const subtotal = round2(input.unitPrice * input.quantity);
    const discountPct = input.isFirstReservation ? 5 : 0;
    const discountAmount = round2((subtotal * discountPct) / 100);
    const productsTotal = round2(subtotal - discountAmount);
    const total = round2(productsTotal + deliveryFee);
    const deposit = round2(total * 0.2);
    const balance = round2(total - deposit);
    return { subtotal, discountPct, discountAmount, total, deposit, balance };
  }

  private async quote(userId: string, dto: CreateReservationDto) {
    const availability = await this.prisma.availability.findUnique({
      where: { wineId_establishmentId: { wineId: dto.wineId, establishmentId: dto.establishmentId } },
      include: { wine: true, establishment: true },
    });
    if (!availability) throw new NotFoundException('Ese vino no está disponible en esa tienda.');
    if (availability.status === 'AGOTADO') {
      throw new BadRequestException('Este vino está agotado en esa tienda.');
    }
    if (dto.orderType === 'delivery' && !(dto.deliveryAddress && dto.deliveryAddress.trim())) {
      throw new BadRequestException('Falta la dirección de entrega.');
    }
    const priorCount = await this.prisma.reservation.count({ where: { userId } });
    const unitPrice = Number(availability.price);
    const deliveryFee = this.deliveryFeeFor(
      dto.orderType,
      { lat: availability.establishment.lat, lng: availability.establishment.lng },
      dto.deliveryLat, dto.deliveryLng,
    );
    const amounts = this.computeAmounts({ unitPrice, quantity: dto.quantity, isFirstReservation: priorCount === 0, deliveryFee });
    return { availability, unitPrice, deliveryFee, amounts };
  }

  async previewReservation(userId: string, dto: CreateReservationDto) {
    const { unitPrice, deliveryFee, amounts } = await this.quote(userId, dto);
    return { quantity: dto.quantity, orderType: dto.orderType, unitPrice, deliveryFee, ...amounts };
  }

  async createReservation(userId: string, dto: CreateReservationDto) {
    const { availability, unitPrice, deliveryFee, amounts } = await this.quote(userId, dto);

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
        orderType: dto.orderType,
        deliveryFee,
        deliveryAddress: dto.orderType === 'delivery' ? dto.deliveryAddress : null,
        deliveryLat: dto.orderType === 'delivery' ? dto.deliveryLat : null,
        deliveryLng: dto.orderType === 'delivery' ? dto.deliveryLng : null,
      },
    });
  }

  async payReservation(userId: string, id: string, card: PayReservationDto) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id } });
    if (!reservation || reservation.userId !== userId) throw new NotFoundException('Reserva no encontrada.');
    if (reservation.status === 'cancelled') throw new BadRequestException('La reserva fue cancelada.');
    if (reservation.status === 'expired') throw new BadRequestException('La reserva expiró. Crea una nueva.');
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
      orderType: reservation.orderType as 'pickup' | 'delivery',
      deliveryFee: Number(reservation.deliveryFee),
      deliveryAddress: reservation.deliveryAddress,
    });

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: { status: 'confirmed', emailSent },
    });
    return { reservation: updated, emailSent };
  }

  async cancelReservation(userId: string, id: string) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id } });
    if (!reservation || reservation.userId !== userId) throw new NotFoundException('Reserva no encontrada.');
    if (reservation.status === 'cancelled') throw new BadRequestException('La reserva ya está cancelada.');
    if (reservation.status === 'expired') throw new BadRequestException('La reserva ya expiró.');
    return this.prisma.reservation.update({ where: { id }, data: { status: 'cancelled' } });
  }

  // Limpieza: las reservas sin pagar expiran a las 24 horas.
  @Cron(CronExpression.EVERY_HOUR)
  async expireStale(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.reservation.updateMany({
      where: { status: 'pending_payment', createdAt: { lt: cutoff } },
      data: { status: 'expired' },
    });
    if (count > 0) this.logger.log(`Reservas pendientes expiradas: ${count}`);
    return count;
  }

  listMine(userId: string) {
    return this.prisma.reservation.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
}
