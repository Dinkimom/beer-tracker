import { NextResponse } from 'next/server';

import { UnsupportedIssueTrackerOperationError } from '@/lib/issueTrackerProvider/errors';
import { TrackerApiConfigError } from '@/lib/trackerRequestConfig';

import {
  apiErrorResponseFromRateLimit,
  apiErrorResponseFromTrackerConfig,
  apiErrorResponseFromUnauthorized,
  apiErrorResponseFromUnsupportedOperation,
  buildApiErrorResponse,
} from './api-error-handlerHelpers';

type ErrorContext =
  | string
  | 'fetch backlog'
  | 'fetch data from Tracker'
  | 'fetch issue'
  | 'fetch sprints from Tracker'
  | 'fetch stories';

/** Стабильный идентификатор для клиента (новые поля не ломают старых потребителей `error`). */
export type ApiErrorCode =
  | string
  | 'internal_error'
  | 'too_many_requests'
  | 'unauthorized'
  | 'upstream_client_error';

export interface HandleApiErrorOptions {
  /**
   * Код для разбора на клиенте. Если не задан: при 500 — `internal_error`,
   * при проброшенном 4xx от апстрима — `upstream_client_error`.
   */
  code?: ApiErrorCode;
  /**
   * Если задано — HTTP-статусы ответа апстрима (axios), которые пробрасываем как есть.
   * Если не задано — 401/429 обрабатываются отдельно, остальные статусы дают 500.
   */
  forwardStatuses?: readonly number[];
}

/** Типичные 4xx от Yandex Tracker для проброса в новых маршрутах. */
export const TRACKER_UPSTREAM_FORWARD_STATUSES: readonly number[] = [
  400, 401, 403, 404, 409, 422,
];

/**
 * Унифицированная обработка ошибок для API routes.
 *
 * **Тело ответа (JSON):**
 * - `error` (string) — сообщение для пользователя / логики UI (как раньше).
 * - `code` (string) — машинный код (`internal_error`, `too_many_requests`, `upstream_client_error` или свой из `options.code`).
 * - `details` (string, опционально) — уточнение (сообщение `Error` или текст от апстрима).
 *
 * **Статусы:** 401 и 429 обрабатываются отдельно (невалидный токен / rate limit).
 * Если в `options.forwardStatuses` передан список (например `TRACKER_UPSTREAM_FORWARD_STATUSES`),
 * axios-ответ с таким статусом пробрасывается; иначе всё кроме 401/429 даёт 500.
 */
export function handleApiError(
  error: unknown,
  context: ErrorContext,
  options?: HandleApiErrorOptions
): NextResponse {
  console.error(`[${context}]`, error);

  if (error instanceof UnsupportedIssueTrackerOperationError) {
    return apiErrorResponseFromUnsupportedOperation(error);
  }

  if (error instanceof TrackerApiConfigError) {
    return apiErrorResponseFromTrackerConfig(error);
  }

  const upstream = (error as { response?: { status?: number } }).response;
  if (upstream?.status === 429) {
    return apiErrorResponseFromRateLimit();
  }
  if (upstream?.status === 401) {
    return apiErrorResponseFromUnauthorized();
  }

  return buildApiErrorResponse(error, context, options);
}
