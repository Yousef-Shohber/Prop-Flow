import { ApiProperty } from '@nestjs/swagger';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator.js';

export class RenewLeaseDto {
  @ApiProperty({
    example: '2027-12-31',
    description: 'The new end date; must be after the current end date',
  })
  @IsDateOnly()
  endDate: string;
}
