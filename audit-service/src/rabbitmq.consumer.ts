import { connect } from 'amqplib';
import { config } from './config';
import { prisma } from './database';
import { sseManager } from './sse.manager';

const EXCHANGE_NAME = 'audit.events';
const QUEUE_NAME = 'audit_queue';
const ROUTING_KEY_PATTERN = 'audit.#';
const RECONNECT_DELAY_MS = 5000;

export class RabbitMQConsumer {
  private connection: any = null;
  private channel: any = null;
  private reconnecting = false;

  async start(): Promise<void> {
    await this.connect();
  }

  private async connect(): Promise<void> {
    try {
      console.log(`[RabbitMQ Consumer] Conectando a ${this.maskUrl(config.rabbitmqUrl)}...`);
      this.connection = await connect(config.rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Declarar exchange de tipo topic, duradero
      await this.channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

      // Declarar cola duradera audit_queue
      await this.channel.assertQueue(QUEUE_NAME, { durable: true });

      // Enlazar cola al exchange con patrón audit.#
      await this.channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY_PATTERN);

      // Prefetch para distribución competitiva entre réplicas
      await this.channel.prefetch(10);

      console.log(`[RabbitMQ Consumer] Escuchando en la cola "${QUEUE_NAME}" (Exchange: ${EXCHANGE_NAME})...`);

      // Configurar consumidor con ACK manual (noAck: false)
      this.channel.consume(
        QUEUE_NAME,
        async (msg: any) => {
          if (!msg) return;
          await this.handleMessage(msg);
        },
        { noAck: false },
      );

      this.connection.on('error', (err: any) => {
        console.error(`[RabbitMQ Consumer] Error de conexión: ${err.message}`);
      });

      this.connection.on('close', () => {
        console.warn('[RabbitMQ Consumer] Conexión cerrada. Intentando reconectar...');
        this.channel = null;
        this.connection = null;
        this.scheduleReconnect();
      });
    } catch (error: any) {
      console.error(`[RabbitMQ Consumer] Error al conectar: ${error.message}`);
      this.channel = null;
      this.connection = null;
      this.scheduleReconnect();
    }
  }

  private async handleMessage(msg: any): Promise<void> {
    try {
      const contentStr = msg.content.toString();
      const payload = JSON.parse(contentStr);

      const { entity, action, userId, userEmail, timestamp, data } = payload;

      if (!entity || !action || !userId) {
        console.warn('[RabbitMQ Consumer] Mensaje recibido no válido (faltan campos obligatorios). Rehusando.');
        // Confirmar y descarta si el formato es inválido para no bloquear la cola
        this.channel.ack(msg);
        return;
      }

      // Persistencia en base de datos
      const savedLog = await prisma.auditLog.create({
        data: {
          entity,
          action,
          userId,
          userEmail: userEmail ?? '',
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          data: data ?? {},
        },
      });

      // ACK manual tras confirmación de guardado exitoso en base de datos
      this.channel.ack(msg);

      console.log(
        `[Audit Log Guardado] ID: ${savedLog.id} | Entidad: ${savedLog.entity} | Acción: ${savedLog.action} | Usuario: ${savedLog.userId}`,
      );

      // Emitir en tiempo real a clientes SSE conectados
      sseManager.broadcast(savedLog);
    } catch (error: any) {
      console.error(`[RabbitMQ Consumer] Error al procesar mensaje: ${error.message}`);
      // Reencolar el mensaje si falló la persistencia (ACK manual negativo)
      try {
        this.channel.nack(msg, false, true);
      } catch (nackErr: any) {
        console.error(`[RabbitMQ Consumer] Error al ejecutar nack: ${nackErr.message}`);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnecting) return;
    this.reconnecting = true;
    setTimeout(async () => {
      this.reconnecting = false;
      await this.connect();
    }, RECONNECT_DELAY_MS);
  }

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
