import { Module } from '@nestjs/common';
import { MqModule } from '@app/core/nest/mq/mq.module';
import { MqTestController } from './mq-test.controller';

@Module({
  imports: [MqModule.register()],
  controllers: [MqTestController],
})
export class MqPlaygroundModule {}
