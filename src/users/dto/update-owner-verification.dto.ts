import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateOwnerVerificationDto {
  @ApiProperty({
    description:
      "true publishes the owner's properties and units to tenants; false hides them again",
  })
  @IsBoolean()
  ownerVerified: boolean;
}
