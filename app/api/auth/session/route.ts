import { buildProductSessionResponse } from '@/lib/auth/sessionRouteHelpers';

/**
 * GET /api/auth/session — текущий пользователь продукта и список организаций (без пароля).
 */
export function GET(request: Request) {
  return buildProductSessionResponse(request);
}
