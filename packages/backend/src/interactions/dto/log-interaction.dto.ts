import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InteractionType } from '@prisma/client';

export class LogInteractionDto {
  @ApiProperty({ enum: ['voice', 'button'], example: 'voice' })
  @IsEnum(InteractionType)
  type!: InteractionType;
}
