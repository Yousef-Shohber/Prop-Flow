import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator.js';

export class ApproveLeaseRenewalRequestDto {
  @ApiPropertyOptional({
    example: '2027-06-30',
    description:
      'Grant a different end date than the one requested; defaults to the requested date',
  })
  @IsOptional()
  @IsDateOnly()
  endDate?: string;
}
