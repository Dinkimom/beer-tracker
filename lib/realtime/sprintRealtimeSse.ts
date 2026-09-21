import type { SprintPresenceViewer, SprintRealtimeMessage } from './sprintRealtimeTypes';

import { NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';

import { createSprintPresenceSession } from './sprintPresence';
import { resolveSprintPresenceViewer, sprintPresenceViewerFromUserId } from './sprintPresenceViewer';
import { startSprintRealtimeRedisSubscriber, subscribeLocalSprintRealtime } from './sprintRealtimeBus';
import { parseRealtimeClientId } from './sprintRealtimeClientId';
import { serializeSprintRealtimeMessage, shouldApplySprintRealtimeEvent } from './sprintRealtimeProtocol';
import { readSprintTimerState } from './sprintTimerStore';

const PING_INTERVAL_MS = 25_000;
const encoder = new TextEncoder();

const SPRINT_REALTIME_SSE_HEADERS = {
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'Content-Type': 'text/event-stream',
  'X-Accel-Buffering': 'no',
} as const;

interface SprintRealtimeSseFilter {
  clientId?: string | null;
  organizationId: string;
  signal?: AbortSignal;
  sprintId: number;
  viewer?: SprintPresenceViewer;
  resolveViewer?: () => Promise<SprintPresenceViewer>;
}

export function parseSprintRealtimeSseQuery(url: URL): {
  clientId: string | null;
  organizationId: string;
  sprintId: number;
} | null {
  const sprintId = Number.parseInt(url.searchParams.get('sprintId') ?? '', 10);
  const organizationId = url.searchParams.get('organizationId')?.trim() ?? '';
  if (!Number.isInteger(sprintId) || sprintId <= 0 || !organizationId) {
    return null;
  }
  return {
    clientId: parseRealtimeClientId(url.searchParams.get('clientId')),
    organizationId,
    sprintId,
  };
}

function requestWithOrganizationHeader(request: Request, organizationId: string): Request {
  const headers = new Headers(request.headers);
  headers.set(TENANT_ORG_HEADER, organizationId);
  return new Request(request.url, { headers });
}

function enqueueSseBytes(controller: ReadableStreamDefaultController<Uint8Array>, chunk: Uint8Array): void {
  try {
    controller.enqueue(chunk);
  } catch {
    /* stream already cancelled */
  }
}

function shouldDeliverSprintRealtimeSseEvent(
  event: SprintRealtimeMessage,
  filter: SprintRealtimeSseFilter
): boolean {
  if (event.sprintId !== filter.sprintId || event.organizationId !== filter.organizationId) {
    return false;
  }
  if (event.type === 'sprint.presence' || !filter.clientId) {
    return true;
  }
  if (event.type === 'sprint.changed') {
    return shouldApplySprintRealtimeEvent(event, {
      clientId: filter.clientId,
      organizationId: filter.organizationId,
      sprintId: filter.sprintId,
    });
  }
  if (!event.originClientId) {
    return true;
  }
  return event.originClientId !== filter.clientId;
}

function enqueueSseEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  filter: SprintRealtimeSseFilter,
  event: SprintRealtimeMessage
): void {
  if (!shouldDeliverSprintRealtimeSseEvent(event, filter)) {
    return;
  }
  enqueueSseBytes(controller, encoder.encode(`data: ${serializeSprintRealtimeMessage(event)}\n\n`));
}

async function enqueueOpenSprintTimerSnapshot(
  controller: ReadableStreamDefaultController<Uint8Array>,
  filter: SprintRealtimeSseFilter,
  isClosed: () => boolean
): Promise<void> {
  try {
    const timer = await readSprintTimerState(filter.organizationId, filter.sprintId);
    if (isClosed()) {
      return;
    }
    enqueueSseEvent(controller, filter, {
      at: Date.now(),
      organizationId: filter.organizationId,
      originClientId: null,
      sprintId: filter.sprintId,
      timer,
      type: 'sprint.timer',
    });
  } catch (error) {
    console.error('[realtime] timer snapshot on sse open failed', error);
  }
}

function closeSseController(controller: ReadableStreamDefaultController<Uint8Array>): void {
  try {
    controller.close();
  } catch {
    /* already closed */
  }
}

function createSprintRealtimeSseLifecycle(filter: SprintRealtimeSseFilter): {
  cancel: () => void;
  start: (controller: ReadableStreamDefaultController<Uint8Array>) => void;
} {
  startSprintRealtimeRedisSubscriber();
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;
  let onAbort: (() => void) | null = null;
  let closed = false;
  const presence = filter.viewer
    ? createSprintPresenceSession({
        connectionId: filter.clientId || undefined,
        organizationId: filter.organizationId,
        sprintId: filter.sprintId,
        viewer: filter.viewer,
        resolveViewer: filter.resolveViewer,
      })
    : null;

  const shutdown = () => {
    if (closed) {
      return;
    }
    closed = true;
    if (onAbort) {
      filter.signal?.removeEventListener('abort', onAbort);
    }
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    unsubscribe?.();
    unsubscribe = null;
    presence?.cancel();
  };

  return {
    cancel: shutdown,
    start(controller) {
      onAbort = () => {
        shutdown();
        closeSseController(controller);
      };
      if (filter.signal?.aborted) {
        onAbort();
        return;
      }
      filter.signal?.addEventListener('abort', onAbort, { once: true });
      unsubscribe = subscribeLocalSprintRealtime((event) => {
        enqueueSseEvent(controller, filter, event);
      });
      pingTimer = setInterval(() => {
        enqueueSseBytes(controller, encoder.encode(': ping\n\n'));
        presence?.ping();
      }, PING_INTERVAL_MS);
      pingTimer.unref?.();
      presence?.start();
      void enqueueOpenSprintTimerSnapshot(controller, filter, () => closed);
    },
  };
}

export function createSprintRealtimeSseStream(filter: SprintRealtimeSseFilter): ReadableStream<Uint8Array> {
  const lifecycle = createSprintRealtimeSseLifecycle(filter);
  return new ReadableStream<Uint8Array>({
    cancel() {
      lifecycle.cancel();
    },
    start(controller) {
      lifecycle.start(controller);
    },
  });
}

export async function createSprintRealtimeSseResponse(request: Request): Promise<Response> {
  const parsed = parseSprintRealtimeSseQuery(new URL(request.url));
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid sprint or organization' }, { status: 400 });
  }
  const tenantResult = await requireTenantContext(requestWithOrganizationHeader(request, parsed.organizationId));
  if (!('ctx' in tenantResult)) {
    return tenantResult.response;
  }
  if (tenantResult.ctx.organizationId !== parsed.organizationId) {
    return NextResponse.json({ error: 'Нет доступа к организации' }, { status: 403 });
  }
  const userId = tenantResult.ctx.userId;
  return new Response(
    createSprintRealtimeSseStream({
      ...parsed,
      signal: request.signal,
      viewer: sprintPresenceViewerFromUserId(userId),
      resolveViewer: () => resolveSprintPresenceViewer(userId),
    }),
    { headers: SPRINT_REALTIME_SSE_HEADERS }
  );
}
