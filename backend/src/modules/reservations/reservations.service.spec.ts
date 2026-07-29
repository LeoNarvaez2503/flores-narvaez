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

describe('ReservationsService.payReservation', () => {
  const reservation = {
    id: 'r1', userId: 'u1', status: 'pending_payment', deposit: 3.8, invoiceNumber: 'CL-000001',
    customerName: 'Ana', customerEmail: 'ana@example.com', wineName: 'Malbec', wineryName: 'Las Moras',
    storeName: 'Centro', storeAddress: 'Av', quantity: 2, unitPrice: 10, subtotal: 20, discountPct: 5,
    discountAmount: 1, total: 19, balance: 15.2, pickupDate: null,
    orderType: 'pickup', deliveryFee: 0, deliveryAddress: null,
  };
  const prisma = { reservation: { findUnique: jest.fn(), update: jest.fn() } } as any;
  const payments = { charge: jest.fn().mockReturnValue({ status: 'approved', paymentId: 'pay_x' }) } as any;
  const email = { sendInvoice: jest.fn().mockResolvedValue(true) } as any;
  const svc = new ReservationsService(prisma, payments, email);

  beforeEach(() => {
    jest.clearAllMocks();
    payments.charge.mockReturnValue({ status: 'approved', paymentId: 'pay_x' });
    email.sendInvoice.mockResolvedValue(true);
  });

  it('cobra la seña, manda la factura y confirma', async () => {
    prisma.reservation.findUnique.mockResolvedValue(reservation);
    prisma.reservation.update.mockResolvedValue({ ...reservation, status: 'confirmed', emailSent: true });
    const res = await svc.payReservation('u1', 'r1', { cardNumber: '4242424242424242', expiry: '12/35', cvv: '123', cardName: 'Ana' } as any);
    expect(payments.charge).toHaveBeenCalledWith(3.8, expect.anything());
    expect(email.sendInvoice).toHaveBeenCalled();
    expect(res.emailSent).toBe(true);
    expect(res.reservation.status).toBe('confirmed');
  });

  it('rechaza pagar una reserva cancelada', async () => {
    prisma.reservation.findUnique.mockResolvedValue({ ...reservation, status: 'cancelled' });
    await expect(
      svc.payReservation('u1', 'r1', { cardNumber: '4242424242424242', expiry: '12/35', cvv: '123', cardName: 'Ana' } as any),
    ).rejects.toThrow('cancelada');
    expect(payments.charge).not.toHaveBeenCalled();
  });

  it('rechaza pagar una reserva expirada', async () => {
    prisma.reservation.findUnique.mockResolvedValue({ ...reservation, status: 'expired' });
    await expect(
      svc.payReservation('u1', 'r1', { cardNumber: '4242424242424242', expiry: '12/35', cvv: '123', cardName: 'Ana' } as any),
    ).rejects.toThrow('expiró');
    expect(payments.charge).not.toHaveBeenCalled();
  });
});

describe('ReservationsService.deliveryFeeFor', () => {
  const svc = new ReservationsService({} as any, {} as any, {} as any);
  const store = { lat: 10.5, lng: -66.85 };

  it('pickup no cobra envío', () => {
    expect(svc.deliveryFeeFor('pickup', store, 10.6, -66.9)).toBe(0);
  });
  it('delivery a ~5km da ~2.55', () => {
    const fee = svc.deliveryFeeFor('delivery', { lat: 0, lng: 0 }, 0.04497, 0);
    expect(fee).toBeGreaterThan(2.4);
    expect(fee).toBeLessThan(2.7);
  });
});

describe('ReservationsService.computeAmounts con envío', () => {
  const svc = new ReservationsService({} as any, {} as any, {} as any);
  it('suma el envío y calcula seña 20% sobre el total con envío', () => {
    const a = svc.computeAmounts({ unitPrice: 10, quantity: 2, isFirstReservation: false, deliveryFee: 2.55 });
    expect(a.total).toBe(22.55);
    expect(a.deposit).toBe(4.51);
    expect(a.balance).toBe(18.04);
  });
});

describe('ReservationsService.createReservation — stock', () => {
  const prisma = {
    availability: { findUnique: jest.fn() },
    reservation: { count: jest.fn(), create: jest.fn() },
  } as any;
  const svc = new ReservationsService(prisma, {} as any, {} as any);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza reservar un vino AGOTADO', async () => {
    prisma.availability.findUnique.mockResolvedValue({
      status: 'AGOTADO', price: 10,
      wine: { name: 'Malbec', wineryName: 'Las Moras' },
      establishment: { name: 'Centro', address: 'Av', lat: 10.5, lng: -66.85 },
    });
    await expect(
      svc.createReservation('u1', {
        wineId: 'w1', establishmentId: 'e1', quantity: 1, orderType: 'pickup',
        customer: { name: 'Ana', email: 'ana@example.com' },
      } as any),
    ).rejects.toThrow('agotado');
    expect(prisma.reservation.create).not.toHaveBeenCalled();
  });

  it('crea la reserva cuando el stock está DISPONIBLE', async () => {
    prisma.availability.findUnique.mockResolvedValue({
      status: 'DISPONIBLE', price: 10,
      wine: { name: 'Malbec', wineryName: 'Las Moras' },
      establishment: { name: 'Centro', address: 'Av', lat: 10.5, lng: -66.85 },
    });
    prisma.reservation.count.mockResolvedValue(0);
    prisma.reservation.create.mockResolvedValue({ id: 'r9', status: 'pending_payment' });
    const out = await svc.createReservation('u1', {
      wineId: 'w1', establishmentId: 'e1', quantity: 1, orderType: 'pickup',
      customer: { name: 'Ana', email: 'ana@example.com' },
    } as any);
    expect(prisma.reservation.create).toHaveBeenCalled();
    expect(out.status).toBe('pending_payment');
  });
});

describe('ReservationsService.previewReservation', () => {
  const prisma = {
    availability: { findUnique: jest.fn() },
    reservation: { count: jest.fn(), create: jest.fn() },
  } as any;
  const svc = new ReservationsService(prisma, {} as any, {} as any);

  beforeEach(() => jest.clearAllMocks());

  it('devuelve el desglose sin escribir en la BD', async () => {
    prisma.availability.findUnique.mockResolvedValue({
      status: 'DISPONIBLE', price: 10,
      wine: { name: 'Malbec', wineryName: 'Las Moras' },
      establishment: { name: 'Centro', address: 'Av', lat: 10.5, lng: -66.85 },
    });
    prisma.reservation.count.mockResolvedValue(0);
    const out = await svc.previewReservation('u1', {
      wineId: 'w1', establishmentId: 'e1', quantity: 2, orderType: 'pickup',
      customer: { name: 'Ana', email: 'ana@example.com' },
    } as any);
    expect(out.total).toBe(19); // 20 − 5% primera reserva
    expect(out.deposit).toBe(3.8);
    expect(out.unitPrice).toBe(10);
    expect(prisma.reservation.create).not.toHaveBeenCalled();
  });

  it('incluye el envío en el preview de delivery', async () => {
    prisma.availability.findUnique.mockResolvedValue({
      status: 'DISPONIBLE', price: 10,
      wine: { name: 'Malbec', wineryName: 'Las Moras' },
      establishment: { name: 'Centro', address: 'Av', lat: 0, lng: 0 },
    });
    prisma.reservation.count.mockResolvedValue(1);
    const out = await svc.previewReservation('u1', {
      wineId: 'w1', establishmentId: 'e1', quantity: 2, orderType: 'delivery',
      deliveryAddress: 'Calle 1', deliveryLat: 0.04497, deliveryLng: 0,
      customer: { name: 'Ana', email: 'ana@example.com' },
    } as any);
    expect(out.deliveryFee).toBeGreaterThan(0);
    expect(out.total).toBeCloseTo(out.subtotal - out.discountAmount + out.deliveryFee, 2);
  });
});

describe('ReservationsService.cancelReservation', () => {
  const prisma = { reservation: { findUnique: jest.fn(), update: jest.fn() } } as any;
  const svc = new ReservationsService(prisma, {} as any, {} as any);

  beforeEach(() => jest.clearAllMocks());

  it('cancela una reserva pendiente del propio usuario', async () => {
    prisma.reservation.findUnique.mockResolvedValue({ id: 'r1', userId: 'u1', status: 'pending_payment' });
    prisma.reservation.update.mockResolvedValue({ id: 'r1', status: 'cancelled' });
    const out = await svc.cancelReservation('u1', 'r1');
    expect(prisma.reservation.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { status: 'cancelled' } });
    expect(out.status).toBe('cancelled');
  });

  it('rechaza cancelar una reserva ya cancelada', async () => {
    prisma.reservation.findUnique.mockResolvedValue({ id: 'r1', userId: 'u1', status: 'cancelled' });
    await expect(svc.cancelReservation('u1', 'r1')).rejects.toThrow('ya está cancelada');
  });

  it('no permite cancelar reservas de otro usuario', async () => {
    prisma.reservation.findUnique.mockResolvedValue({ id: 'r1', userId: 'u2', status: 'pending_payment' });
    await expect(svc.cancelReservation('u1', 'r1')).rejects.toThrow('no encontrada');
  });
});

describe('ReservationsService.expireStale', () => {
  const prisma = { reservation: { updateMany: jest.fn() } } as any;
  const svc = new ReservationsService(prisma, {} as any, {} as any);

  it('marca como expired las pendientes con más de 24h', async () => {
    prisma.reservation.updateMany.mockResolvedValue({ count: 3 });
    const n = await svc.expireStale();
    expect(n).toBe(3);
    const arg = prisma.reservation.updateMany.mock.calls[0][0];
    expect(arg.where.status).toBe('pending_payment');
    expect(arg.where.createdAt.lt).toBeInstanceOf(Date);
    expect(arg.data.status).toBe('expired');
  });
});
