import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum.js';

class ImageRefDto {
  @ApiProperty() url: string;
  @ApiProperty() publicId: string;
  @ApiProperty() source: string;
}

export class UserResponseDto {
  @ApiProperty() id: string;

  @ApiProperty() email: string;

  @ApiProperty() firstName: string;

  @ApiProperty() lastName: string;

  @ApiProperty({ nullable: true, type: String }) phone: string | null;

  @ApiProperty({ enum: UserRole }) role: UserRole;

  @ApiProperty({
    description:
      'false until a Google sign-up has chosen TENANT or OWNER (PATCH /users/me/role)',
  })
  roleSelected: boolean;

  @ApiProperty({
    description:
      'OWNER only: reviewed by an admin. Unverified owners are not published to tenants',
  })
  ownerVerified: boolean;

  @ApiProperty({ nullable: true, type: ImageRefDto }) avatar: ImageRefDto;

  @ApiProperty() isActive: boolean;

  @ApiProperty() isEmailVerified: boolean;

  @ApiProperty({ type: [ImageRefDto] }) images: ImageRefDto[];

  @ApiProperty() createdAt: Date;

  @ApiProperty() updatedAt: Date;
}
