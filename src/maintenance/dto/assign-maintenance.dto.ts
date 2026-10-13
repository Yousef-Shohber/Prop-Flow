import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator.js';
import { TransitionNotesDto } from './transition-notes.dto.js';

export class AssignMaintenanceDto extends TransitionNotesDto {
  @ApiProperty()
  @IsUUID()
  assignedStaffId: string;

  @ApiPropertyOptional({ example: '2026-12-01' })
  @IsOptional()
  @IsDateOnly()
  scheduledDate?: string;
}
