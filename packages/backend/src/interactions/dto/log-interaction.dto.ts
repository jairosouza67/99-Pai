import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InteractionType } from '../../common/enums/interaction-type.enum';

export class LogInteractionDto {
  @ApiProperty({ enum: ['voice', 'button'], example: 'voice' })
  @IsEnum(InteractionType)
  type!: InteractionType;
}
