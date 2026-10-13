export enum UserRole {
  TENANT = 'TENANT',
  OWNER = 'OWNER',
  MAINTENANCE_STAFF = 'MAINTENANCE_STAFF',
  ADMIN = 'ADMIN',
}

export const SELF_SELECTABLE_ROLES = [UserRole.TENANT, UserRole.OWNER] as const;

export type SelfSelectableRole = (typeof SELF_SELECTABLE_ROLES)[number];
