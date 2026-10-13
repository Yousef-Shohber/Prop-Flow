import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DESCRIPTION_MAX_LENGTH,
  UNIT_AREA_MAX,
  UNIT_AREA_MIN,
} from '../../common/constants/validation.constants.js';
import { trim } from '../../common/utils/transform.util.js';

export class CreateUnitDto {
  @ApiProperty({ maxLength: 50 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unitNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(-2)
  @Max(200)
  floor?: number;

  @ApiProperty({
    description: 'Whole square metres',
    minimum: UNIT_AREA_MIN,
    maximum: UNIT_AREA_MAX,
  })
  @IsInt()
  @Min(UNIT_AREA_MIN)
  @Max(UNIT_AREA_MAX)
  area: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(50)
  bedrooms: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(50)
  bathrooms: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  rentAmount: number;

  @ApiPropertyOptional({ maxLength: DESCRIPTION_MAX_LENGTH })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  description?: string;
}
