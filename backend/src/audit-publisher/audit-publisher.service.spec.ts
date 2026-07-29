import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuditPublisherService } from './audit-publisher.service';
import { AuditEvent } from './audit-event.interface';

describe('AuditPublisherService', () => {
  let service: AuditPublisherService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuditPublisherService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('amqp://guest:guest@localhost:5672'),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AuditPublisherService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('no debe lanzar error al publicar cuando el canal no está conectado (resiliencia)', async () => {
    const sampleEvent: AuditEvent = {
      entity: 'usuarios',
      action: 'CREATE',
      userId: 'usr_001',
      userEmail: 'test@example.com',
      timestamp: new Date().toISOString(),
      data: {
        before: null,
        after: { id: 'usr_001', email: 'test@example.com' },
      },
    };

    // No debe lanzar excepción aunque RabbitMQ no esté corriendo
    await expect(service.publishAuditEvent(sampleEvent)).resolves.not.toThrow();
  });

  it('publica correctamente con la routing key formateada si el canal está disponible', async () => {
    const mockChannel = {
      publish: jest.fn().mockReturnValue(true),
      assertExchange: jest.fn().mockResolvedValue(true),
    };

    // Inyectar canal mockeado manualmente
    (service as any).channel = mockChannel;

    const sampleEvent: AuditEvent = {
      entity: 'reservas',
      action: 'UPDATE',
      userId: 'usr_002',
      userEmail: 'user@example.com',
      timestamp: new Date().toISOString(),
      data: {
        before: { id: 'res_001', status: 'PENDING' },
        after: { id: 'res_001', status: 'PAID' },
      },
    };

    await service.publishAuditEvent(sampleEvent);

    expect(mockChannel.publish).toHaveBeenCalledTimes(1);
    const [exchange, routingKey, buffer, options] = mockChannel.publish.mock.calls[0];

    expect(exchange).toBe('audit.events');
    expect(routingKey).toBe('audit.reservas.update');
    expect(options.persistent).toBe(true);
    expect(options.contentType).toBe('application/json');

    const publishedPayload = JSON.parse(buffer.toString());
    expect(publishedPayload.entity).toBe('reservas');
    expect(publishedPayload.action).toBe('UPDATE');
    expect(publishedPayload.data.after.status).toBe('PAID');
  });

  it('enmascara las contraseñas en las URLs de conexión para logs', () => {
    const masked = (service as any).maskUrl('amqp://admin:secreto123@rabbitmq.cluster.local:5672');
    expect(masked).toBe('amqp://admin:****@rabbitmq.cluster.local:5672');
  });
});
