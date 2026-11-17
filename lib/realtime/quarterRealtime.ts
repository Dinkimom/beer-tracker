/**
 * Realtime квартального плана: после сохранения плана открытые доски этого квартала получают
 * `quarter.changed` по SSE и перечитывают план (QS6); `quarter.presence` — кто сейчас на доске и что
 * делает (QS7). Шина, Redis и хранилище присутствия — те же, что у спринта.
 */

import type { QuarterRealtimeEvent, SprintPresenceViewer, SprintRealtimeMessage } from './sprintRealtimeTypes';

import { NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { QuarterRefSchema } from '@/lib/quarterlyPlans/quarterlyPlanContentParse';

import { createSprintPresenceSession } from './sprintPresence';
import { resolveSprintPresenceViewer, sprintPresenceViewerFromUserId } from './sprintPresenceViewer';
import {
  publishSprintRealtimeEvent,
  startSprintRealtimeRedisSubscriber,
  subscribeLocalSprintRealtime,
} from './sprintRealtimeBus';
import { getRealtimeClientIdFromRequest, parseRealtimeClientId } from './sprintRealtimeClientId';
import { serializeSprintRealtimeMessage } from './sprintRealtimeProtocol';
import { requestWithOrganizationHeader, SPRINT_REALTIME_SSE_HEADERS } from './sprintRealtimeSse';

const PING_INTERVAL_MS = 25_000;
const encoder = new TextEncoder();

type QuarterScope = Pick<QuarterRealtimeEvent, 'organizationId' | 'quarter' | 'year'>;

/** План квартала изменён этим запросом: вкладка-автор (`x-realtime-client-id`) своё эхо не получает. */
export function notifyQuarterRealtime(request: Request, scope: QuarterScope): void {
  publishSprintRealtimeEvent({
    at: Date.now(),
    organizationId: scope.organizationId,
    originClientId: getRealtimeClientIdFromRequest(request),
    quarter: scope.quarter,
    type: 'quarter.changed',
    year: scope.year,
  }).catch((error) => {
    console.error('[realtime] quarter publish failed', error);
  });
}

interface QuarterStreamInput extends QuarterScope {
  /** Вкладка: ей не нужны её же правки, и под этим id она числится в присутствии. */
  clientId: string | null;
  /** Кто открыл доску: с ним вкладка входит в присутствие квартала; `resolveViewer` — имя и аватар из базы. */
  presence?: { resolveViewer?: () => Promise<SprintPresenceViewer>; viewer: SprintPresenceViewer };
  signal?: AbortSignal;
}

/** Событие этого квартала, которое вкладке нужно: присутствие — всем, правка плана — всем, кроме автора. */
function isForQuarterStream(event: SprintRealtimeMessage, scope: QuarterStreamInput): boolean {
  if (event.type !== 'quarter.changed' && event.type !== 'quarter.presence') return false;
  if (event.organizationId !== scope.organizationId || event.year !== scope.year || event.quarter !== scope.quarter) {
    return false;
  }
  return event.type === 'quarter.presence' || !event.originClientId || event.originClientId !== scope.clientId;
}

/** Поток событий одного квартала организации. */
export function createQuarterRealtimeSseStream(scope: QuarterStreamInput): ReadableStream<Uint8Array> {
  startSprintRealtimeRedisSubscriber();
  const presence = scope.presence
    ? createSprintPresenceSession({
        connectionId: scope.clientId || undefined,
        organizationId: scope.organizationId,
        scope: { quarter: scope.quarter, year: scope.year },
        ...scope.presence,
      })
    : null;
  let stop = (): void => undefined;
  return new ReadableStream<Uint8Array>({
    cancel: () => stop(),
    start(controller) {
      const send = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          /* поток уже закрыт */
        }
      };
      const unsubscribe = subscribeLocalSprintRealtime((event) => {
        if (isForQuarterStream(event, scope)) send(`data: ${serializeSprintRealtimeMessage(event)}\n\n`);
      });
      const pingTimer = setInterval(() => {
        send(': ping\n\n');
        presence?.ping();
      }, PING_INTERVAL_MS);
      pingTimer.unref?.();
      const onAbort = () => {
        stop();
        try {
          controller.close();
        } catch {
          /* уже закрыт */
        }
      };
      let stopped = false;
      stop = () => {
        if (stopped) return;
        stopped = true;
        clearInterval(pingTimer);
        unsubscribe();
        scope.signal?.removeEventListener('abort', onAbort);
        presence?.cancel();
      };
      if (scope.signal?.aborted) {
        onAbort();
        return;
      }
      scope.signal?.addEventListener('abort', onAbort, { once: true });
      presence?.start();
    },
  });
}

/** GET /api/realtime/quarter?year=&quarter=&organizationId=&clientId= */
export async function createQuarterRealtimeSseResponse(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const organizationId = params.get('organizationId')?.trim() ?? '';
  const ref = QuarterRefSchema.safeParse(Object.fromEntries(params));
  if (!organizationId || !ref.success) {
    return NextResponse.json({ error: 'Invalid quarter or organization' }, { status: 400 });
  }
  const tenantResult = await requireTenantContext(requestWithOrganizationHeader(request, organizationId));
  if (!('ctx' in tenantResult)) return tenantResult.response;
  if (tenantResult.ctx.organizationId !== organizationId) {
    return NextResponse.json({ error: 'Нет доступа к организации' }, { status: 403 });
  }
  const { userId } = tenantResult.ctx;
  return new Response(
    createQuarterRealtimeSseStream({
      ...ref.data,
      clientId: parseRealtimeClientId(params.get('clientId')),
      organizationId,
      presence: {
        resolveViewer: () => resolveSprintPresenceViewer(userId),
        viewer: sprintPresenceViewerFromUserId(userId),
      },
      signal: request.signal,
    }),
    { headers: SPRINT_REALTIME_SSE_HEADERS }
  );
}
