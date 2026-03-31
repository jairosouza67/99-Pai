import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '+5511999999999' })
  @IsString()
  phone!: string;

  @ApiProperty({ required: false, example: 7, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  thresholdDays?: number;
}
