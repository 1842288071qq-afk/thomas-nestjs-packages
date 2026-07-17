export class OssSdkError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'OssSdkError';
  }
}

export class UploadStoppedError extends OssSdkError {
  constructor(cause?: unknown) {
    super('文件上传已终止', undefined, cause);
    this.name = 'UploadStoppedError';
  }
}
