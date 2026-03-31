import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({
    description: 'Category UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Healthcare',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Parent category ID (null for root categories)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  parentId!: string | null;

  @ApiPropertyOptional({
    description: 'Subcategories',
    type: () => [CategoryResponseDto],
  })
  subcategories?: CategoryResponseDto[];

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt!: Date;
}
