/**
 * Утилита для работы с Tracker API в Next.js API routes
 * Автоматически использует токен из headers запроса или fallback на env
 */

import type { AxiosInstance } from 'axios';

import { createTrackerApiFromRequest } from './tracker-client';

/**
 * Получает Tracker API клиент с токеном из headers запроса
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const api = await getTrackerApiFromRequest(request);
 *   const { data } = await api.get('/sprints/123');
 *   return NextResponse.json(data);
 * }
 * ```
 */
export function getTrackerApiFromRequest(request: Request): Promise<AxiosInstance> {
  return createTrackerApiFromRequest(request);
}
