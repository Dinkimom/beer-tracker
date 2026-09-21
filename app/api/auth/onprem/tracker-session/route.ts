import { establishOnPremTrackerSession } from '@/lib/auth/onpremTrackerSessionHelpers';

/**
 * POST /api/auth/onprem/tracker-session — cookie-сессия продукта по OAuth-токену трекера (без пароля).
 */
export function POST(request: Request) {
  return establishOnPremTrackerSession(request);
}
