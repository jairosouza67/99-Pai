import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMedicationDto {
  @ApiProperty({ required: false, example: 'Losartana' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, example: '08:00' })
  @IsOptional()
  @IsString()
  time?: string;

  @ApiProperty({ required: false, example: '50mg' })
  @IsOptional()
  @IsString()
  dosage?: string;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
