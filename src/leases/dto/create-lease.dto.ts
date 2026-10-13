import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { trim } from '../../common/utils/transform.util.js';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator.js';

export class CreateLeaseDto {
  @ApiProperty()
  @IsUUID()
  tenantId: string;

  @ApiProperty()
  @IsUUID()
  unitId: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateOnly()
  startDate: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateOnly()
  endDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
