import { IsString, IsOptional, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOfferingDto {
  @ApiProperty({ description: 'Title of the offering' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Detailed description of the offering' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ description: 'URL to offering image' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ description: 'Price of the offering', minimum: 0 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ description: 'Category UUID' })
  @IsUUID()
  categoryId!: string;

  @ApiPropertyOptional({ description: 'Subcategory UUID' })
  @IsOptional()
  @IsUUID()
  subcategoryId?: string;
}
