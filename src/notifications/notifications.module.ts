import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../common/mail/mail.module.js';
import { Notification } from './entities/notification.entity.js';
import { NotificationEmailDispatcher } from './notification-email.dispatcher.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), MailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationEmailDispatcher],
  exports: [NotificationsService],
})
export class NotificationsModule {}
