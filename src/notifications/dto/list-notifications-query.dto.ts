import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto.js';
import { ToBoolean } from '../../common/utils/transform.util.js';

export class ListNotificationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  unread?: boolean;
}
