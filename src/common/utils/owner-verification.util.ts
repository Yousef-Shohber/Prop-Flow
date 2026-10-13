import type { EntityManager } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

export function isOwnerVerified(
  manager: EntityManager,
  ownerId: string,
): Promise<boolean> {
  return manager
    .getRepository(User)
    .existsBy({ id: ownerId, ownerVerified: true });
}
