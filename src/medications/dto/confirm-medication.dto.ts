import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmMedicationDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  confirmed!: boolean;
}
