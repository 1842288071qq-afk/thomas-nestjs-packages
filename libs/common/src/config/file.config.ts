import { registerAs } from '@nestjs/config';

export default registerAs('file', () => ({
  local: {
    storageRoot: process.env.FILE_STORAGE_ROOT || './uploads',
    serveRoot: process.env.FILE_SERVE_ROOT || '/files',
  },
}));
