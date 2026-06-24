import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  QueueName,
  TaskHandler,
  TaskService,
} from '@thomas/nestjs/core/nest/bullmq';
import type { Job } from 'bullmq';
import { OpUserSharedService } from '../../shared/services/op-user-shared.service';

export const OP_USER_BOOTSTRAP_TASK = 'opUser.bootstrap.ensure-user-id-1';
const BOOTSTRAP_BIZ_KEY = 'op-user-id-1';

@Injectable()
export class OpUserBootstrapTask implements OnModuleInit {
  private readonly logger = new Logger(OpUserBootstrapTask.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly opUserSharedService: OpUserSharedService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.taskService.addTask({
      queue: QueueName.ASYNC,
      name: OP_USER_BOOTSTRAP_TASK,
      bizKey: BOOTSTRAP_BIZ_KEY,
      data: { source: 'op-user-bootstrap-task-module-init' },
    });
  }

  @TaskHandler(OP_USER_BOOTSTRAP_TASK)
  async handleBootstrap(_job: Job): Promise<void> {
    await this.opUserSharedService.ensureBootstrapAdminUser();
  }
}
