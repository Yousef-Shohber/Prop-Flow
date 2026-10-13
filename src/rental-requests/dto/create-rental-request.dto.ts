import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { trim } from '../../common/utils/transform.util.js';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator.js';

export class CreateRentalRequestDto {
  @ApiProperty()
  @IsUUID()
  unitId: string;

  @ApiProperty({ example: '2026-10-15', description: 'Format: YYYY-MM-DD' })
  @IsDateOnly()
  startDate: string;

  @ApiProperty({ example: '2027-10-15', description: 'Format: YYYY-MM-DD' })
  @IsDateOnly()
  endDate: string;

  @ApiPropertyOptional({ example: 'I would like to rent this unit.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  message?: string;
}
