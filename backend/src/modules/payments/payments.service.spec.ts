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
