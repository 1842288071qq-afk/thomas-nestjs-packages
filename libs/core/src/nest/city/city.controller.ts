import { Controller, Get, Param } from '@nestjs/common';
import { CityService } from './city.service';
import { ApiResBody } from '../../ApiResBody';

@Controller('city')
export class CityController {
  constructor(private readonly cityService: CityService) {}

  @Get('provinces')
  async getProvinces() {
    const data = await this.cityService.getProvinces();
    return ApiResBody.of(data);
  }

  @Get('cities/:provinceCode')
  async getCities(@Param('provinceCode') provinceCode: string) {
    const data = await this.cityService.getCities(provinceCode);
    return ApiResBody.of(data);
  }

  @Get('areas/:cityCode')
  async getAreas(@Param('cityCode') cityCode: string) {
    const data = await this.cityService.getAreas(cityCode);
    return ApiResBody.of(data);
  }

  @Get('translate/:code')
  async translate(@Param('code') code: string) {
    const data = await this.cityService.translate(code);
    return ApiResBody.of(data);
  }

  @Get('tree')
  async getFullTree() {
    const data = await this.cityService.getFullTree();
    return ApiResBody.of(data);
  }
}
