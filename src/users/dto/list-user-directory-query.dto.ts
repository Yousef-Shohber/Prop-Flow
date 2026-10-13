import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto.js';
import { SEARCH_MAX_LENGTH } from '../../common/constants/validation.constants.js';
import { trim } from '../../common/utils/transform.util.js';
import { UserRole } from '../enums/user-role.enum.js';

const DIRECTORY_ROLES = [UserRole.TENANT, UserRole.MAINTENANCE_STAFF] as const;

export class ListUserDirectoryQueryDto extends PaginationQueryDto {
  @ApiProperty({ enum: DIRECTORY_ROLES })
  @IsIn(DIRECTORY_ROLES)
  role: (typeof DIRECTORY_ROLES)[number];

  @ApiPropertyOptional({
    description: 'Matches first name, last name, or email',
    maxLength: SEARCH_MAX_LENGTH,
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(SEARCH_MAX_LENGTH)
  search?: string;
}
