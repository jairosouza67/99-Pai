import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Platform } from '../../common/enums/platform.enum';

export class RegisterTokenDto {
  @ApiProperty({ example: 'expo-push-token-xxx' })
  @IsString()
  pushToken!: string;

  @ApiProperty({ enum: ['ios', 'android', 'web'], example: 'android' })
  @IsEnum(Platform)
  platform!: Platform;
}
