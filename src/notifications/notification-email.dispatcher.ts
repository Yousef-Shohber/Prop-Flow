import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DataSource,
  EntityManager,
  EntitySubscriberInterface,
  QueryRunner,
  TransactionCommitEvent,
  TransactionRollbackEvent,
} from 'typeorm';
import { EmailService } from '../common/mail/email.service.js';
import { User } from '../users/entities/user.entity.js';

export interface EmailableNotification {
  recipientId: string;
  title: string;
  message: string;
}

@Injectable()
export class NotificationEmailDispatcher implements EntitySubscriberInterface {
  private readonly logger = new Logger(NotificationEmailDispatcher.name);
  private readonly pending = new WeakMap<
    QueryRunner,
    EmailableNotification[]
  >();
  private readonly enabled: boolean;

  constructor(
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
    config: ConfigService,
  ) {
    this.enabled = config.get<boolean>('EMAIL_NOTIFICATIONS_ENABLED') ?? true;

    if (!this.dataSource.subscribers.includes(this)) {
      this.dataSource.subscribers.push(this);
    }
  }

  /**
   * Queues an email until the transaction behind `manager` commits.
   * @param manager - The manager the notification was inserted with.
   * @param notification - What to send.
   */
  enqueue(manager: EntityManager, notification: EmailableNotification): void {
    if (!this.enabled) return;

    const runner = manager.queryRunner;

    if (!runner?.isTransactionActive) {
      this.sendInBackground(notification);
      return;
    }

    const jobs = this.pending.get(runner);
    if (jobs) jobs.push(notification);
    else this.pending.set(runner, [notification]);
  }

  /**
   * Sends emails for notifications that are already committed.
   */
  sendNow(notifications: EmailableNotification[]): void {
    if (!this.enabled) return;

    for (const notification of notifications) {
      this.sendInBackground(notification);
    }
  }

  afterTransactionCommit(event: TransactionCommitEvent): void {
    // Also fires when a nested (savepoint) transaction is released.
    if (event.queryRunner.isTransactionActive) return;

    const jobs = this.pending.get(event.queryRunner);
    if (!jobs) return;

    this.pending.delete(event.queryRunner);
    this.sendNow(jobs);
  }

  afterTransactionRollback(event: TransactionRollbackEvent): void {
    if (event.queryRunner.isTransactionActive) return;

    this.pending.delete(event.queryRunner);
  }

  private sendInBackground(notification: EmailableNotification): void {
    void this.deliver(notification).catch((error: unknown) => {
      this.logger.error(
        `Failed to deliver notification email: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  private async deliver(notification: EmailableNotification): Promise<void> {
    const recipient = await this.dataSource.getRepository(User).findOne({
      where: { id: notification.recipientId },
      select: {
        id: true,
        email: true,
        firstName: true,
        isActive: true,
        isEmailVerified: true,
      },
    });

    if (!recipient?.isActive || !recipient.isEmailVerified) return;

    await this.emailService.sendNotification(
      recipient.email,
      recipient.firstName,
      notification,
    );
  }
}
