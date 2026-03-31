import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OfferingUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  nickname?: string;
}

export class OfferingCategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class OfferingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  active!: boolean;

  @ApiProperty({ type: OfferingUserResponseDto })
  user!: OfferingUserResponseDto;

  @ApiProperty({ type: OfferingCategoryResponseDto })
  category!: OfferingCategoryResponseDto;

  @ApiPropertyOptional({ type: OfferingCategoryResponseDto })
  subcategory?: OfferingCategoryResponseDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
