import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto.js';
import { ToBoolean } from '../../common/utils/transform.util.js';
import { UserRole } from '../enums/user-role.enum.js';

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;
}
