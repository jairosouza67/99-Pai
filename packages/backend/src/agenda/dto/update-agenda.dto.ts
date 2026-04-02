import { IsString, IsDateString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAgendaDto {
  @ApiProperty({ required: false, example: 'Consulta médica' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, example: '2026-03-25T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  dateTime?: string;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  reminder?: boolean;
}
