import { Module } from '@nestjs/common';
import { OfferingsService } from './offerings.service';
import { OfferingsController } from './offerings.controller';

@Module({
  imports: [],
  controllers: [OfferingsController],
  providers: [OfferingsService],
  exports: [OfferingsService],
})
export class OfferingsModule {}
