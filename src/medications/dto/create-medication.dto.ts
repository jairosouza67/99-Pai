import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMedicationDto {
  @ApiProperty({ example: 'Losartana' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '08:00' })
  @IsString()
  time!: string;

  @ApiProperty({ example: '50mg' })
  @IsString()
  dosage!: string;
}
