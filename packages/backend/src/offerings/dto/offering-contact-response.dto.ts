import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OfferingContactProviderDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  nickname?: string;

  @ApiPropertyOptional()
  cellphone?: string;
}

export class OfferingContactOfferingDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  price!: number;
}

export class OfferingContactResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: OfferingContactOfferingDto })
  offering!: OfferingContactOfferingDto;

  @ApiProperty({ type: OfferingContactProviderDto })
  provider!: OfferingContactProviderDto;

  @ApiProperty()
  requestedAt!: Date;
}
