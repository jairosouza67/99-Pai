import { IsUUID, IsOptional, IsDateString, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceRequestDto {
  @ApiProperty({ description: 'ID of the offering to request' })
  @IsUUID()
  offeringId!: string;

  @ApiPropertyOptional({ description: 'Preferred date/time for the service' })
  @IsOptional()
  @IsDateString()
  requestedDateTime?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
