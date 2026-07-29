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
