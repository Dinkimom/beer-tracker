import type { ApiErrorCode, HandleApiErrorOptions } from './api-error-handler';

import { NextResponse } from 'next/server';

import { UnsupportedIssueTrackerOperationError } from '@/lib/issueTrackerProvider/errors';
import { TrackerApiConfigError } from '@/lib/trackerRequestConfig';

function getAxiosResponse(error: unknown): { status?: number; data?: unknown; headers?: unknown } | undefined {
  const e = error as { response?: { status?: number; data?: unknown; headers?: unknown } };
  return e.response;
}

function extractUpstreamMessage(data: unknown): string | undefined {
  if (data == null) return undefined;
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    const msg = o.errorMessage ?? o.message ?? o.error;
    if (typeof msg === 'string') return msg;
  }
  return undefined;
}

function errorDetailsFromUnknown(error: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return undefined;
}

export function apiErrorResponseFromUnsupportedOperation(
  error: UnsupportedIssueTrackerOperationError
): NextResponse {
  return NextResponse.json(
    {
      code: 'issue_tracker_unsupported_operation' satisfies ApiErrorCode,
      error: error.message,
      provider: error.providerKind,
      operation: error.operation,
    },
    { status: error.status }
  );
}

export function apiErrorResponseFromTrackerConfig(error: TrackerApiConfigError): NextResponse {
  return NextResponse.json(
    {
      code: 'tracker_config' satisfies ApiErrorCode,
      error: error.message,
    },
    { status: error.status }
  );
}

export function apiErrorResponseFromRateLimit(): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests. Please try again later.',
      code: 'too_many_requests' satisfies ApiErrorCode,
    },
    { status: 429 }
  );
}

export function apiErrorResponseFromUnauthorized(): NextResponse {
  return NextResponse.json(
    {
      error: 'Недействительный токен трекера. Войдите снова.',
      code: 'unauthorized' satisfies ApiErrorCode,
    },
    { status: 401 }
  );
}

function resolvePassThroughStatus(
  upstreamStatus: number | undefined,
  forwardList: readonly number[] | undefined
): number | null {
  if (!forwardList || upstreamStatus == null || !forwardList.includes(upstreamStatus)) {
    return null;
  }
  return upstreamStatus;
}

function appendApiErrorDetails(
  body: Record<string, string>,
  status: number,
  errorText: string,
  upstreamMsg: string | undefined,
  errMsg: string | undefined
): void {
  if (status === 500 && errMsg) {
    body.details = errMsg;
    return;
  }
  if (status === 500) {
    return;
  }
  const detail = upstreamMsg ?? errMsg;
  if (detail && detail !== errorText) {
    body.details = detail;
  }
}

export function buildApiErrorResponse(
  error: unknown,
  context: string,
  options?: HandleApiErrorOptions
): NextResponse {
  const upstream = getAxiosResponse(error);
  const status = resolvePassThroughStatus(upstream?.status, options?.forwardStatuses) ?? 500;
  const fallbackError = `Failed to ${context}`;
  const upstreamMsg = extractUpstreamMessage(upstream?.data);
  const errMsg = errorDetailsFromUnknown(error);
  const errorText =
    status === 500 ? fallbackError : (upstreamMsg ?? errMsg ?? fallbackError);

  const body: Record<string, string> = {
    error: errorText,
    code:
      options?.code ??
      (status === 500 ? 'internal_error' : 'upstream_client_error'),
  };

  appendApiErrorDetails(body, status, errorText, upstreamMsg, errMsg);

  return NextResponse.json(body, { status });
}
