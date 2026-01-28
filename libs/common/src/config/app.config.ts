import { registerAs } from '@nestjs/config';
import os from 'os';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  // 其他扩展树形
  apiPrefix: process.env.API_PREFIX || '',
  name: process.env.APP_NAME || 'nest-app',
  // 默认devName为系统机器名称
  devName: process.env.DEV_NAME || os.hostname(),
}));
