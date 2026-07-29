import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect } from 'amqplib';
import { AuditEvent } from './audit-event.interface';

const EXCHANGE_NAME = 'audit.events';
const RECONNECT_DELAY_MS = 5000;

@Injectable()
export class AuditPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditPublisherService.name);
  private connection: any = null;
  private channel: any = null;
  private readonly rabbitmqUrl: string;
  private reconnecting = false;
  private shuttingDown = false;

  constructor(private readonly config: ConfigService) {
    this.rabbitmqUrl =
      this.config.get<string>('rabbitmqUrl') ?? 'amqp://guest:guest@localhost:5672';
  }

  async onModuleInit(): Promise<void> {
    await this.connectToRabbitMQ();
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    await this.close();
  }

  /**
   * Publica un evento de auditoría en el exchange `audit.events`.
   * Nunca lanza excepciones: si RabbitMQ no está disponible, registra el error y continúa.
   */
  async publishAuditEvent(event: AuditEvent): Promise<void> {
    try {
      if (!this.channel) {
        this.logger.warn(
          `Canal RabbitMQ no disponible. Evento de auditoría omitido: ${event.entity}.${event.action}`,
        );
        return;
      }

      const routingKey = `audit.${event.entity}.${event.action.toLowerCase()}`;
      const buffer = Buffer.from(JSON.stringify(event));

      this.channel.publish(EXCHANGE_NAME, routingKey, buffer, {
        persistent: true,
        contentType: 'application/json',
        timestamp: Math.floor(Date.now() / 1000),
      });

      this.logger.debug(
        `Evento publicado → ${routingKey} | usuario=${event.userId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Error publicando evento de auditoría [${event.entity}.${event.action}]: ${error.message}`,
      );
    }
  }

  // ── Conexión y reconexión ──────────────────────────────────────────

  private async connectToRabbitMQ(): Promise<void> {
    try {
      this.logger.log(`Conectando a RabbitMQ: ${this.maskUrl(this.rabbitmqUrl)}`);

      this.connection = await connect(this.rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Declarar exchange de tipo topic, duradero
      await this.channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

      // Listeners para reconexión automática
      this.connection.on('error', (err: any) => {
        this.logger.error(`Error en conexión RabbitMQ: ${err.message}`);
      });

      this.connection.on('close', () => {
        this.logger.warn('Conexión RabbitMQ cerrada.');
        this.channel = null;
        this.connection = null;
        this.scheduleReconnect();
      });

      this.logger.log('Conectado a RabbitMQ exitosamente. Exchange "audit.events" declarado.');
    } catch (error: any) {
      this.logger.error(
        `No se pudo conectar a RabbitMQ: ${error.message}. El backend continuará sin auditoría.`,
      );
      this.channel = null;
      this.connection = null;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.shuttingDown || this.reconnecting) return;
    this.reconnecting = true;
    this.logger.log(
      `Reintentando conexión a RabbitMQ en ${RECONNECT_DELAY_MS / 1000}s...`,
    );
    setTimeout(async () => {
      this.reconnecting = false;
      await this.connectToRabbitMQ();
    }, RECONNECT_DELAY_MS);
  }

  private async close(): Promise<void> {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch {
      // Ignorar errores al cerrar durante shutdown
    } finally {
      this.channel = null;
      this.connection = null;
    }
  }

  /** Enmascara la contraseña en la URL para los logs */
  private maskUrl(url: string): string {
    try {
      const u = new URL(url);
      if (u.password) u.password = '****';
      return u.toString();
    } catch {
      return '(url inválida)';
    }
  }
}
