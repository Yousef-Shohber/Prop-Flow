import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NotificationType } from '../../notifications/enums/notification-type.enum.js';
import { NotificationsService } from '../../notifications/notifications.service.js';
import { CacheInvalidationService } from '../cache/cache-invalidation.service.js';
import { todayIso } from '../utils/date.util.js';

interface ExpiredRequestNotification {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
}

interface ExpirationResult {
  expiredLeases: number;
  releasedUnits: number;
  expiredRequests: number;
  requestNotifications: ExpiredRequestNotification[];
}

const EXPIRE = `
  WITH expired AS (
    UPDATE leases
    SET status = 'EXPIRED', "updatedAt" = now()
    WHERE status = 'ACTIVE' AND "endDate" < $1::date
    RETURNING id, "unitId"
  ),
  cancelled_renewals AS (
    UPDATE lease_renewal_requests
    SET status = 'CANCELLED', "updatedAt" = now()
    WHERE status = 'PENDING' AND "leaseId" IN (SELECT id FROM expired)
  ),
  released AS (
    UPDATE units
    SET status = 'AVAILABLE', "updatedAt" = now()
    WHERE id IN (SELECT "unitId" FROM expired) AND status = 'RENTED'
    RETURNING id
  ),
  expired_requests AS (
    UPDATE rental_requests
    SET status = 'EXPIRED', "updatedAt" = now()
    WHERE status = 'PENDING' AND "endDate" < $1::date
    RETURNING id, "tenantId", "unitId"
  ),
  request_notifications AS (
    INSERT INTO notifications
      ("recipientId", type, title, message, "relatedEntityType", "relatedEntityId")
    SELECT
      r."tenantId",
      'RENTAL_REQUEST_EXPIRED',
      'Rental request expired',
      'Your rental request for unit ' || u."unitNumber" || ' expired because the requested period has ended.',
      'RentalRequest',
      r.id
    FROM expired_requests r
    JOIN units u ON u.id = r."unitId"
    RETURNING "recipientId", type, title, message
  )
  SELECT
    (SELECT count(*) FROM expired)::int                                     AS "expiredLeases",
    (SELECT count(*) FROM released)::int                                    AS "releasedUnits",
    (SELECT count(*) FROM expired_requests)::int                            AS "expiredRequests",
    (SELECT coalesce(json_agg(n), '[]'::json) FROM request_notifications n) AS "requestNotifications"
`;

@Injectable()
export class LeaseExpirationService {
  private readonly logger = new Logger(LeaseExpirationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly cache: CacheInvalidationService,
    private readonly notifications: NotificationsService,
  ) {}

  async run(): Promise<void> {
    const [result] = await this.dataSource.query<ExpirationResult[]>(EXPIRE, [
      todayIso(),
    ]);
    const {
      expiredLeases,
      releasedUnits,
      expiredRequests,
      requestNotifications,
    } = result;

    if (expiredRequests > 0) {
      this.logger.log(`Expired ${expiredRequests} overdue rental request(s)`);
      this.notifications.emailCommitted(requestNotifications);
    }

    if (expiredLeases > 0) {
      this.logger.log(
        `Expired ${expiredLeases} overdue lease(s), released ${releasedUnits} unit(s)`,
      );
      await this.cache.invalidateUnitsAndDashboard();
    }
  }
}
