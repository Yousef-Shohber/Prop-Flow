import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator.js';

export class CreateLeaseRenewalRequestDto {
  @ApiProperty({ description: 'The tenant\'s own ACTIVE lease' })
  @IsUUID()
  leaseId: string;

  @ApiProperty({
    example: '2027-12-31',
    description: 'The end date the tenant asks for; must be after the lease end date',
  })
  @IsDateOnly()
  endDate: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
