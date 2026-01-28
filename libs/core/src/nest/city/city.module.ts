import { Module } from '@nestjs/common';
import { CityService } from './city.service';
import { CityController } from './city.controller';

@Module({
  providers: [CityService],
  controllers: [CityController],
  exports: [CityService],
})
export class CityModule {}
