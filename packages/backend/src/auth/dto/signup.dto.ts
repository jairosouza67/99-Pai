import {
  IsEmail,
  IsString,
  IsEnum,
  MinLength,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';
export class SignupDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name!: string;

  @ApiProperty({
    enum: ['elderly', 'caregiver', 'provider', 'admin'],
    example: 'elderly',
  })
  @IsEnum(Role)
  role!: Role;

  @ApiPropertyOptional({ example: '+5511999999999' })
  @IsOptional()
  @IsString()
  cellphone?: string;

  @ApiPropertyOptional({ example: 'Johnny' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ example: '12345678901' })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional({ example: '1950-01-15' })
  @IsOptional()
  @IsDateString()
  birthday?: string;
}
