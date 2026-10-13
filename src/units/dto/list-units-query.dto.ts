import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { UNIT_AREA_MAX } from '../../common/constants/validation.constants.js';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto.js';
import { UnitStatus } from '../enums/unit-status.enum.js';

export class ListUnitsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: UnitStatus })
  @IsOptional()
  @IsEnum(UnitStatus)
  status?: UnitStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(UNIT_AREA_MAX)
  minArea?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(UNIT_AREA_MAX)
  maxArea?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;
}
