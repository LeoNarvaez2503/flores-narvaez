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

  async sendPasswordReset(data: { to: string; name: string; resetUrl: string }): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('MAIL_USER/MAIL_APP_PASSWORD sin configurar: no se envió el correo de recuperación.');
      this.logger.log(`Enlace de recuperación para ${data.to}: ${data.resetUrl}`);
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: `CavaLocal <${this.from}>`,
        to: data.to,
        subject: 'Recupera tu contraseña — CavaLocal',
        html:
          '<div style="font-family:Arial;max-width:520px;margin:0 auto;color:#2A2024">' +
          `<h2 style="color:#641E2E">Hola ${data.name},</h2>` +
          '<p>Recibimos un pedido para restablecer tu contraseña en CavaLocal.</p>' +
          `<p><a href="${data.resetUrl}" style="background:#641E2E;color:#fff;padding:12px 22px;border-radius:50px;text-decoration:none;display:inline-block">Crear nueva contraseña</a></p>` +
          '<p style="font-size:12px;color:#999">El enlace vence en 1 hora. Si no fuiste tú, ignora este correo.</p>' +
          '</div>',
      });
      return true;
    } catch (e) {
      this.logger.error('Falló el envío del correo de recuperación: ' + (e as Error).message);
      return false;
    }
  }
}
