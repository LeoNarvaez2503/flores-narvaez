import { Global, Module } from '@nestjs/common';
import { AuditPublisherService } from './audit-publisher.service';

@Global()
@Module({
  providers: [AuditPublisherService],
  exports: [AuditPublisherService],
})
export class AuditPublisherModule {}
