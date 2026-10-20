import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { Paginated, toSkip } from '../common/pagination/pagination.utils.js';
import { User } from '../users/entities/user.entity.js';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';
import { Notification } from './entities/notification.entity.js';
import { NotificationType } from './enums/notification-type.enum.js';
import {
  EmailableNotification,
  NotificationEmailDispatcher,
} from './notification-email.dispatcher.js';

const EMAIL_NOTIFICATION_TYPES: ReadonlySet<NotificationType> = new Set([
  NotificationType.LEASE_CREATED,
  NotificationType.LEASE_ACTIVATED,
  NotificationType.LEASE_TERMINATED,
  NotificationType.LEASE_RENEWED,
  NotificationType.LEASE_RENEWAL_REQUESTED,
  NotificationType.LEASE_RENEWAL_REJECTED,
  NotificationType.MAINTENANCE_CREATED,
  NotificationType.MAINTENANCE_ASSIGNED,
  NotificationType.MAINTENANCE_RESOLVED,
  NotificationType.RENTAL_REQUEST_CREATED,
  NotificationType.RENTAL_REQUEST_APPROVED,
  NotificationType.RENTAL_REQUEST_REJECTED,
  NotificationType.RENTAL_REQUEST_EXPIRED,
  NotificationType.OWNER_VERIFICATION_CHANGED,
]);

interface CreateNotificationData {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly emailDispatcher: NotificationEmailDispatcher,
  ) {}

  /**
   * Whether a notification type is also sent by email.
   * @param type Notification type.
   */
  shouldEmail(type: NotificationType): boolean {
    return EMAIL_NOTIFICATION_TYPES.has(type);
  }

  /**
   * Sends the email copy of notifications that were inserted outside of
   * `create` (for example by a set-based SQL statement). Types that are not
   * email-worthy are skipped. The notifications must already be committed.
   * @param notifications Committed notifications, with their type.
   */
  emailCommitted(
    notifications: (EmailableNotification & { type: NotificationType })[],
  ): void {
    this.emailDispatcher.sendNow(
      notifications.filter((notification) =>
        this.shouldEmail(notification.type),
      ),
    );
  }

  /**
   * Create a new notification.
   * This method called inside a business transaction using the transaction's Manager.
   * If the type is email-worthy, the email is sent after the transaction commits
   * (and never if it rolls back).
   * @param manager Transaction manager used to insert the notification.
   * @param data Notification data including recipient, type, title, message,
   * and optional related entity information.
   */
  async create(
    manager: EntityManager,
    data: CreateNotificationData,
  ): Promise<void> {
    await manager.insert(Notification, {
      recipientId: data.recipientId,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedEntityType: data.relatedEntityType ?? null,
      relatedEntityId: data.relatedEntityId ?? null,
    });

    this.queueEmail(manager, data.recipientId, data);
  }

  /**
   * Create the same notification for several recipients in one insert.
   * Duplicate recipient IDs are ignored; an empty list is a no-op.
   * This method is called inside a business transaction, like `create`.
   * @param manager Transaction manager used to insert the notifications.
   * @param recipientIds IDs of the users to notify.
   * @param data Notification content shared by all recipients.
   */
  async createMany(
    manager: EntityManager,
    recipientIds: string[],
    data: Omit<CreateNotificationData, 'recipientId'>,
  ): Promise<void> {
    const recipients = [...new Set(recipientIds)];
    if (!recipients.length) return;

    await manager.insert(
      Notification,
      recipients.map((recipientId) => ({
        recipientId,
        type: data.type,
        title: data.title,
        message: data.message,
        relatedEntityType: data.relatedEntityType ?? null,
        relatedEntityId: data.relatedEntityId ?? null,
      })),
    );

    for (const recipientId of recipients) {
      this.queueEmail(manager, recipientId, data);
    }
  }

  /**
   * Create several different notifications in one insert.
   * Unlike `createMany`, each item has its own recipient, text and related
   * entity. An empty list is a no-op. Called inside a business transaction,
   * like `create`.
   * @param manager Transaction manager used to insert the notifications.
   * @param items Notification data, one entry per notification.
   */
  async createBatch(
    manager: EntityManager,
    items: CreateNotificationData[],
  ): Promise<void> {
    if (!items.length) return;

    await manager.insert(
      Notification,
      items.map((item) => ({
        recipientId: item.recipientId,
        type: item.type,
        title: item.title,
        message: item.message,
        relatedEntityType: item.relatedEntityType ?? null,
        relatedEntityId: item.relatedEntityId ?? null,
      })),
    );

    for (const item of items) {
      this.queueEmail(manager, item.recipientId, item);
    }
  }

  /**
   * Get the authenticated user's notifications.
   * @param actor Authenticated user requesting the notifications.
   * @param query Pagination and unread filter options.
   * @returns Paginated notifications with the total unread count.
   */
  async findAll(
    actor: User,
    query: ListNotificationsQueryDto,
  ): Promise<Paginated<Notification>> {
    const where: FindOptionsWhere<Notification> = { recipientId: actor.id };
    if (query.unread) where.isRead = false;

    const [data, total] = await this.notificationRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: toSkip(query),
      take: query.limit,
    });
    const unreadCount = await this.notificationRepo.count({
      where: { recipientId: actor.id, isRead: false },
    });

    return Paginated.of(data, total, query, { unreadCount });
  }

  /**
   * Mark a specific notification as read.
   * @param actor Authenticated user.
   * @param id ID of the notification to mark as read.
   * @throws NotFoundException If the notification does not exist
   * or does not belong to the authenticated user.
   */
  async markRead(actor: User, id: string): Promise<void> {
    const result = await this.notificationRepo.update(
      { id, recipientId: actor.id },
      { isRead: true },
    );
    if (!result.affected) throw new NotFoundException('Notification not found');
  }

  /**
   * Mark all unread notifications belonging to the authenticated user as read.
   * @param actor Authenticated user.
   */
  async markAllRead(actor: User): Promise<void> {
    await this.notificationRepo.update(
      { recipientId: actor.id, isRead: false },
      { isRead: true },
    );
  }

  private queueEmail(
    manager: EntityManager,
    recipientId: string,
    data: Pick<CreateNotificationData, 'type' | 'title' | 'message'>,
  ): void {
    if (!this.shouldEmail(data.type)) return;

    this.emailDispatcher.enqueue(manager, {
      recipientId,
      title: data.title,
      message: data.message,
    });
  }
}
