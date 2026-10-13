import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  SELF_SELECTABLE_ROLES,
  type SelfSelectableRole,
} from '../enums/user-role.enum.js';

export class SelectRoleDto {
  @ApiProperty({ enum: SELF_SELECTABLE_ROLES })
  @IsIn(SELF_SELECTABLE_ROLES)
  role: SelfSelectableRole;
}
