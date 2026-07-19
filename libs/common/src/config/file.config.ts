import { registerAs } from '@nestjs/config';

export default registerAs('file', () => ({
  local: {
    storageRoot: process.env.FILE_STORAGE_ROOT || './uploads',
    serveRoot: process.env.FILE_SERVE_ROOT || '/files',
    multipartTempRoot: process.env.FILE_MULTIPART_TEMP_ROOT,
    multipartChunkSize: Number(
      process.env.FILE_MULTIPART_CHUNK_SIZE || 4 * 1024 * 1024,
    ),
  },
}));
