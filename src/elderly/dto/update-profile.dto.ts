import {
  IsString,
  IsInt,
  IsArray,
  IsBoolean,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateElderlyProfileDto {
  @ApiProperty({ required: false, example: 'Maria' })
  @IsOptional()
  @IsString()
  preferredName?: string;

  @ApiProperty({ required: false, example: 75, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  autonomyScore?: number;

  @ApiProperty({
    required: false,
    example: ['08:00', '12:00', '16:00', '19:00'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interactionTimes?: string[];

  @ApiProperty({ required: false, example: 'São Paulo' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  onboardingComplete?: boolean;
}
