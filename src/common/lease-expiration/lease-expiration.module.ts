import { Global, Module } from '@nestjs/common';
import { NotificationsModule } from '../../notifications/notifications.module.js';
import { LeaseExpirationService } from './lease-expiration.service.js';

@Global()
@Module({
  imports: [NotificationsModule],
  providers: [LeaseExpirationService],
  exports: [LeaseExpirationService],
})
export class LeaseExpirationModule {}
