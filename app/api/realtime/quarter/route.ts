import { NextRequest } from 'next/server';

import { createQuarterRealtimeSseResponse } from '@/lib/realtime/quarterRealtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** GET /api/realtime/quarter — SSE: квартальный план организации изменили (QS6). */
export function GET(request: NextRequest): Promise<Response> {
  return createQuarterRealtimeSseResponse(request);
}
