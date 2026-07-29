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
