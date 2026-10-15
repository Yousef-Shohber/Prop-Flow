import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsOrder, FindOptionsWhere, ILike, Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { AuditAction } from '../audit-logs/enums/audit-action.enum.js';
import {
  Paginated,
  resolveSort,
  toSkip,
} from '../common/pagination/pagination.utils.js';
import { ImageRef } from '../common/uploads/image-ref.interface.js';
import { UploadService } from '../common/uploads/upload.service.js';
import { CacheInvalidationService } from '../common/cache/cache-invalidation.service.js';
import { containsPattern } from '../common/utils/like.util.js';
import { NotificationType } from '../notifications/enums/notification-type.enum.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ListUserDirectoryQueryDto } from './dto/list-user-directory-query.dto.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { User, userAvatar } from './entities/user.entity.js';
import { SelfSelectableRole, UserRole } from './enums/user-role.enum.js';
import { GoogleProfile } from '../auth/google.service.js';
import { ErrorCode } from '../common/errors/error-code.enum.js';

const USER_SORT_FIELDS = [
  'createdAt',
  'email',
  'firstName',
  'lastName',
  'role',
] as const;

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly uploadService: UploadService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notifications: NotificationsService,
    private readonly cache: CacheInvalidationService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Finds a user by ID and throws an exception if the user does not exist.
   * @param id - The user's unique identifier.
   * @returns The requested user.
   * @throws NotFoundException If no user exists with the given ID.
   */
  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOneBy({ id });

    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'User not found',
      });
    }

    return user;
  }

  /**
   * Finds a user by their email address.
   * @param email - The user's email address.
   * @returns The user if found, otherwise `null`.
   */
  findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOneBy({ email });
  }

  /**
   * Finds the credentials required for authentication.
   * @param email - The email address used for authentication.
   * @returns The user's ID, password hash, and account status if found.
   */
  findCredentialsByEmail(
    email: string,
  ): Promise<Pick<
    User,
    'id' | 'passwordHash' | 'isActive' | 'isEmailVerified'
  > | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.passwordHash',
        'user.isActive',
        'user.isEmailVerified',
      ])
      .where('user.email = :email', { email })
      .getOne();
  }

  /**
   * Finds the password hash of a user by ID.
   * @param id - The user's unique identifier.
   * @returns The user's ID and password hash (`null` hash for Google-only
   * accounts), or `null` if the user does not exist.
   */
  findCredentialsById(
    id: string,
  ): Promise<Pick<User, 'id' | 'passwordHash'> | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .select(['user.id', 'user.passwordHash'])
      .where('user.id = :id', { id })
      .getOne();
  }

  /**
   * Finds a user by their Google account ID.
   * @param googleId - The unique Google account ID.
   * @returns The matching user, or `null` if no user is found.
   */
  findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepo.findOneBy({ googleId });
  }

  /**
   * Retrieves users with optional filtering, sorting, and pagination.
   * @param query - Filtering, sorting, and pagination parameters.
   * @returns A paginated list of users.
   */
  async findAll(query: ListUsersQueryDto): Promise<Paginated<User>> {
    const where: FindOptionsWhere<User> = {};

    const { sortBy, sortOrder } = resolveSort(
      query,
      USER_SORT_FIELDS,
      'createdAt',
    );

    if (query.role) {
      where.role = query.role;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [data, total] = await this.userRepo.findAndCount({
      where,
      order: { [sortBy]: sortOrder } as FindOptionsOrder<User>,
      skip: toSkip(query),
      take: query.limit,
    });

    return Paginated.of(data, total, query);
  }

  /**
   * Creates and persists a new user.
   * @param data - The data required to create the user.
   * @returns The newly created user.
   */
  async create(data: CreateUserData): Promise<User> {
    const saved = await this.userRepo.save(this.userRepo.create(data));

    return this.findById(saved.id);
  }

  /**
   * Creates a new user from Google account information.
   * The user's email is automatically marked as verified because it
   * has been verified by Google during the OAuth flow. The account starts as
   * a TENANT with `roleSelected = false`: the person picks TENANT or OWNER
   * once, through `selectRole`.
   * @param data - Google account and user profile data.
   * @returns The newly created user.
   */
  async createFromGoogle(data: GoogleProfile): Promise<User> {
    const saved = await this.userRepo.save(
      this.userRepo.create({
        ...data,
        passwordHash: null,
        role: UserRole.TENANT,
        roleSelected: false,
        isEmailVerified: true,
      }),
    );

    return this.findById(saved.id);
  }

  /**
   * Links a Google account to an existing user.
   * If the existing account's email was never verified, whoever registered it
   * never proved they own that address (they may have registered someone
   * else's email with a password they know). Google has just proven the real
   * owner, so everything the registrant set is discarded: the password,
   * name, phone and the chosen role. The account then behaves like a fresh
   * Google sign-up (`roleSelected = false`). Without this, the registrant's
   * password would keep working on the real owner's account.
   * @param user - The user to link the Google account to.
   * @param profile - The Google profile (verified by Google).
   * @returns The updated user.
   */
  async linkGoogleAccount(user: User, profile: GoogleProfile): Promise<User> {
    const wasUnverified = !user.isEmailVerified;

    user.googleId = profile.googleId;
    user.isEmailVerified = true;

    if (user.avatar.source === 'default') {
      user.avatar = profile.avatar;
    }

    if (wasUnverified) {
      user.passwordHash = null;
      user.firstName = profile.firstName;
      user.lastName = profile.lastName;
      user.phone = null;
      user.role = UserRole.TENANT;
      user.roleSelected = false;
      user.ownerVerified = false;
    }

    return this.userRepo.save(user);
  }

  /**
   * Marks a user's email address as verified.
   * @param id - The ID of the user whose email should be marked as verified.
   */
  async makeEmailVerified(id: string): Promise<void> {
    await this.userRepo.update({ id }, { isEmailVerified: true });
  }

  /**
   * Updates a user's profile information.
   * @param user - The user whose profile should be updated.
   * @param dto - The profile fields to update.
   * @returns The updated user.
   */
  updateProfile(user: User, dto: UpdateProfileDto): Promise<User> {
    this.userRepo.merge(user, dto);

    return this.userRepo.save(user);
  }

  /**
   * Sets a new avatar for the user.
   * @param user - The user whose avatar will be updated.
   * @param file - The new avatar image file.
   * @returns The updated user.
   * @throws BadRequestException if no avatar file is provided.
   */
  async setAvatar(user: User, file?: Express.Multer.File): Promise<User> {
    if (!file) {
      throw new BadRequestException({
        code: ErrorCode.NO_AVATAR,
        message: 'No avatar file provided',
      });
    }

    const [uploaded] = await this.uploadService.uploadImages(
      [file],
      'propflow/avatars',
      1,
    );

    if (user.avatar.source === 'cloudinary') {
      await this.uploadService.deleteImages([user.avatar]);
    }

    user.avatar = uploaded;
    return this.userRepo.save(user);
  }

  /**
   * Removes the user's current avatar and restores the default avatar.
   * @param user - The user whose avatar will be removed.
   * @returns The updated user with the default avatar.
   */
  async removeAvatar(user: User): Promise<User> {
    if (user.avatar.source === 'default') {
      throw new BadRequestException({
        code: ErrorCode.NO_AVATAR,
        message: 'You have no avatar to remove',
      });
    }

    if (user.avatar.source === 'cloudinary') {
      await this.uploadService.deleteImages([user.avatar]);
    }

    user.avatar = userAvatar;

    return this.userRepo.save(user);
  }

  /**
   * A minimal, safe directory for OWNER/ADMIN to find an active TENANT
   * or MAINTENANCE_STAFF. This deliberately excludes ADMIN/OWNER accounts
   * and fields beyond the user directory response.
   */
  async findDirectory(
    query: ListUserDirectoryQueryDto,
  ): Promise<Paginated<User>> {
    const base = {
      role: query.role,
      isActive: true,
    };

    const pattern = query.search ? ILike(containsPattern(query.search)) : null;

    const where: FindOptionsWhere<User> | FindOptionsWhere<User>[] = pattern
      ? [
          { ...base, firstName: pattern },
          { ...base, lastName: pattern },
          { ...base, email: pattern },
        ]
      : base;

    const [data, total] = await this.userRepo.findAndCount({
      where,
      order: { firstName: 'ASC' },
      skip: toSkip(query),
      take: query.limit,
    });

    return Paginated.of(data, total, query);
  }

  /**
   * Activates or deactivates a user account.
   * A user cannot deactivate their own account.
   * @param id - The ID of the user whose status should be changed.
   * @param isActive - Whether the account should be active.
   * @param actor - The user performing the action.
   * @param ip - The IP address of the actor.
   * @returns The updated user.
   */
  async setStatus(
    id: string,
    isActive: boolean,
    actor: User,
    ip?: string,
  ): Promise<User> {
    if (actor.id === id && !isActive) {
      throw new UnprocessableEntityException({
        code: ErrorCode.CANNOT_DEACTIVATE_SELF,
        message: 'You cannot deactivate your own account',
      });
    }

    const user = await this.findById(id);
    user.isActive = isActive;

    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(user);

      await this.auditLogsService.record(manager, {
        userId: actor.id,
        action: AuditAction.USER_STATUS_CHANGED,
        entity: 'User',
        entityId: user.id,
        metadata: { isActive },
        ipAddress: ip,
      });

      return saved;
    });
  }

  /**
   * Changes a user's role.
   * A user cannot change their own role.
   * @param id - The ID of the user whose role should be changed.
   * @param role - The new role to assign.
   * @param actor - The user performing the action.
   * @param ip - The IP address of the actor.
   * @returns The updated user.
   */
  async setRole(
    id: string,
    role: UserRole,
    actor: User,
    ip?: string,
  ): Promise<User> {
    if (actor.id === id) {
      throw new UnprocessableEntityException({
        code: ErrorCode.CANNOT_CHANGE_OWN_ROLE,
        message: 'You cannot change your own role',
      });
    }

    const user = await this.findById(id);
    const previousRole = user.role;
    user.role = role;
    user.roleSelected = true;
    user.ownerVerified = false;

    const saved = await this.dataSource.transaction(async (manager) => {
      const result = await manager.save(user);

      await this.auditLogsService.record(manager, {
        userId: actor.id,
        action: AuditAction.ROLE_CHANGED,
        entity: 'User',
        entityId: user.id,
        metadata: { previousRole, role },
        ipAddress: ip,
      });

      return result;
    });

    await this.cache.invalidateUnitsAndDashboard();
    return saved;
  }

  /**
   * Lets a user choose TENANT or OWNER for themselves, exactly once.
   * This exists for Google sign-ups, which are created as a TENANT with
   * `roleSelected = false`. The conditional update makes two concurrent
   * requests safe: only one of them can flip `roleSelected`.
   * Choosing OWNER does not publish anything: the account still has to be
   * verified by an admin (`setOwnerVerified`).
   * @param user - The authenticated user.
   * @param role - TENANT or OWNER.
   * @param ip - The IP address of the user.
   * @returns The updated user.
   * @throws ConflictException If the role was already selected.
   */
  async selectRole(
    user: User,
    role: SelfSelectableRole,
    ip?: string,
  ): Promise<User> {
    const updated = await this.dataSource.transaction(async (manager) => {
      const { affected } = await manager.update(
        User,
        { id: user.id, roleSelected: false },
        { role, roleSelected: true, ownerVerified: false },
      );

      if (!affected) {
        throw new ConflictException({
          code: ErrorCode.ROLE_ALREADY_SELECTED,
          message: 'Your role has already been selected',
        });
      }

      await this.auditLogsService.record(manager, {
        userId: user.id,
        action: AuditAction.ROLE_CHANGED,
        entity: 'User',
        entityId: user.id,
        metadata: {
          previousRole: user.role,
          role,
          source: 'SELF_SELECTION',
        },
        ipAddress: ip,
      });

      return manager.findOneByOrFail(User, { id: user.id });
    });

    await this.cache.invalidateUnitsAndDashboard();
    return updated;
  }

  /**
   * Verifies (or un-verifies) an OWNER. Properties and units of an owner who
   * is not verified are not published to tenants. The owner is notified, and
   * nothing is written when the value does not change.
   * @param id - The ID of the owner.
   * @param ownerVerified - Whether the owner is verified.
   * @param actor - The admin performing the action.
   * @param ip - The IP address of the actor.
   * @returns The updated user.
   * @throws NotFoundException If the user does not exist.
   * @throws UnprocessableEntityException If the user is not an OWNER.
   */
  async setOwnerVerified(
    id: string,
    ownerVerified: boolean,
    actor: User,
    ip?: string,
  ): Promise<User> {
    const user = await this.findById(id);

    if (user.role !== UserRole.OWNER) {
      throw new UnprocessableEntityException({
        code: ErrorCode.USER_NOT_OWNER,
        message: 'Only an OWNER account can be verified',
      });
    }

    if (user.ownerVerified === ownerVerified) return user;

    user.ownerVerified = ownerVerified;

    const saved = await this.dataSource.transaction(async (manager) => {
      const result = await manager.save(user);

      await this.auditLogsService.record(manager, {
        userId: actor.id,
        action: AuditAction.OWNER_VERIFICATION_CHANGED,
        entity: 'User',
        entityId: user.id,
        metadata: { ownerVerified },
        ipAddress: ip,
      });

      await this.notifications.create(manager, {
        recipientId: user.id,
        type: NotificationType.OWNER_VERIFICATION_CHANGED,
        title: ownerVerified
          ? 'Your owner account was verified'
          : 'Your owner verification was removed',
        message: ownerVerified
          ? 'Your properties and units are now visible to tenants.'
          : 'Your properties and units are hidden from tenants until your account is verified again.',
        relatedEntityType: 'User',
        relatedEntityId: user.id,
      });

      return result;
    });

    await this.cache.invalidateUnitsAndDashboard();
    return saved;
  }
}
