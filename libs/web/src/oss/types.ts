export type FileUploadState =
  | 'idle'
  | 'initializing'
  | 'uploading'
  | 'paused'
  | 'completing'
  | 'completed'
  | 'stopped'
  | 'failed';

export interface FileUploadProgress {
  state: FileUploadState;
  loaded: number;
  total: number;
  percent: number;
  completedParts: number;
  totalParts: number;
}

export interface UploadedPart {
  partNumber: number;
  eTag?: string;
  size?: number;
}

export interface MultipartUploadSession {
  fileId: string;
  uploadId: string;
  key: string;
  ossConfigCode: string;
  chunkSize: number;
  uploadedParts: UploadedPart[];
}

export interface MultipartInitializeInput {
  file: File;
  key: string;
  hash: string;
  ossConfigCode: string;
  chunkSize?: number;
  metadata?: Record<string, string>;
  meta?: Record<string, unknown>;
}

export interface MultipartUploadPartInput {
  session: MultipartUploadSession;
  file: File;
  partNumber: number;
  body: Blob;
  signal: AbortSignal;
}

export interface MultipartCompleteResult {
  id: string;
  object: string;
  fullUrl?: string;
  [key: string]: unknown;
}

export interface MultipartUploadAdapter {
  initialize(input: MultipartInitializeInput): Promise<MultipartUploadSession>;
  uploadPart(input: MultipartUploadPartInput): Promise<UploadedPart>;
  complete(session: MultipartUploadSession): Promise<MultipartCompleteResult>;
  abort(session: MultipartUploadSession): Promise<void>;
}

export interface FileUploadProcessOptions {
  file: File;
  key: string;
  ossConfigCode: string;
  adapter: MultipartUploadAdapter;
  hash?: string;
  hashProvider?: (file: File, signal: AbortSignal) => Promise<string>;
  chunkSize?: number;
  concurrency?: number;
  retries?: number;
  retryDelayMs?: number;
  signal?: AbortSignal;
  metadata?: Record<string, string>;
  meta?: Record<string, unknown>;
  onProgress?: (progress: FileUploadProgress) => void;
  onStateChange?: (state: FileUploadState) => void;
  onError?: (error: unknown) => void;
}

export interface ApiResBody<T> {
  code: number;
  message?: string;
  data: T;
}

export type RequestHeadersFactory = () => HeadersInit | Promise<HeadersInit>;

export interface OssWebSdkEndpoints {
  signPut: string;
  signGet: string;
  callback: string;
  multipartInit: string;
  multipartSignPart: string;
  multipartComplete: string;
  multipartAbort: string;
}

export interface OssWebSdkOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
  headers?: HeadersInit | RequestHeadersFactory;
  endpoints?: Partial<OssWebSdkEndpoints>;
}

export interface FileRecord extends MultipartCompleteResult {
  filename: string;
  mimeType?: string;
  suffix?: string;
  hash?: string;
  storageType: 'oss';
  ossConfigCode: string;
  size?: string;
  completed: boolean;
}
