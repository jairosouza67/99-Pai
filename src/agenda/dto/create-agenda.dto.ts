import { IsString, IsDateString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAgendaDto {
  @ApiProperty({ example: 'Consulta médica' })
  @IsString()
  description!: string;

  @ApiProperty({ example: '2026-03-25T10:00:00Z' })
  @IsDateString()
  dateTime!: string;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  reminder?: boolean;
}
