import { SetMetadata } from '@nestjs/common';
import { REQUEST_LOG_BODY_CAPTURE_METADATA } from './constants';
import { RequestLogBodyCaptureOptions } from './request-logs.types';

export const CaptureRequestLogBody = (
  options: RequestLogBodyCaptureOptions = {},
) => {
  return SetMetadata(REQUEST_LOG_BODY_CAPTURE_METADATA, {
    requestBody: options.requestBody ?? true,
    responseBody: options.responseBody ?? true,
  });
};
