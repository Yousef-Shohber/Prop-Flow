import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto.js';
import { SEARCH_MAX_LENGTH } from '../../common/constants/validation.constants.js';
import { trim } from '../../common/utils/transform.util.js';
import { PropertyType } from '../enums/property-type.enum.js';

export class ListPropertiesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Matches name or address',
    maxLength: SEARCH_MAX_LENGTH,
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;
}
