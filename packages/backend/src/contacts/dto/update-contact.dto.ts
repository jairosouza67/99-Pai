import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateContactDto {
  @ApiProperty({ required: false, example: 'Maria Silva' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, example: '+5511999999999' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, example: 7, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  thresholdDays?: number;
}
