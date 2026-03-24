import { Injectable } from '@nestjs/common';
import { HelloResultDTO } from './dto/playground.dto';

@Injectable()
export class PlaygroundService {
  getHello(): HelloResultDTO {
    return {
      message: 'Hello World!',
      source: 'playground-service',
    };
  }
}
