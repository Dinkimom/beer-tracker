'use client';

import type {
  SprintPresenceViewer,
  SprintRealtimeIssueMembership,
  SprintRealtimeIssueStatus,
  SprintRealtimeResource,
} from '@/lib/realtime/sprintRealtimeTypes';

import { useEffect, useRef, useSyncExternalStore } from 'react';

import { buildSprintRealtimeSseUrl } from '@/lib/realtime/buildSprintRealtimeSseUrl';
import { getBrowserRealtimeClientId } from '@/lib/realtime/sprintRealtimeClientId';
import { parseSprintRealtimeMessage, shouldApplySprintRealtimeEvent } from '@/lib/realtime/sprintRealtimeProtocol';
import { publishSprintTimerClient } from '@/lib/realtime/sprintTimerClient';
import { PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY } from '@/lib/tenantHttpConstants';

interface SprintRealtimeTaskPayload {
  issueMembership?: SprintRealtimeIssueMembership;
  issueStatus?: SprintRealtimeIssueStatus;
}

interface SprintRealtimeHandlers {
  onComments?: () => void;
  onLinks?: () => void;
  onPositions?: () => void;
  onPresence?: (viewers: SprintPresenceViewer[]) => void;
  onTasks?: (payload: SprintRealtimeTaskPayload) => void;
}

function readActiveOrganizationId(): string | null {
  try {
    const value = localStorage.getItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY)?.trim();
    return value || null;
  } catch {
    return null;
  }
}

function dispatchSprintRealtimeResources(
  resources: readonly SprintRealtimeResource[],
  handlers: SprintRealtimeHandlers,
  payload: SprintRealtimeTaskPayload
): void {
  if (resources.includes('positions')) {
    handlers.onPositions?.();
  }
  if (resources.includes('comments') || resources.includes('reactions')) {
    handlers.onComments?.();
  }
  if (resources.includes('links')) {
    handlers.onLinks?.();
  }
  if (resources.includes('tasks')) {
    handlers.onTasks?.(payload);
  }
}

function applySprintRealtimeSsePayload(
  raw: string,
  ctx: { clientId: string; organizationId: string; sprintId: number },
  handlers: SprintRealtimeHandlers
): void {
  const parsed = parseSprintRealtimeMessage(raw);
  if (!parsed) {
    return;
  }
  if (parsed.type === 'sprint.presence') {
    if (parsed.sprintId === ctx.sprintId && parsed.organizationId === ctx.organizationId) {
      handlers.onPresence?.(parsed.viewers);
    }
    return;
  }
  if (parsed.type === 'sprint.timer') {
    if (parsed.sprintId === ctx.sprintId && parsed.organizationId === ctx.organizationId) {
      publishSprintTimerClient(parsed.sprintId, parsed.timer);
    }
    return;
  }
  if (!shouldApplySprintRealtimeEvent(parsed, ctx)) {
    return;
  }
  dispatchSprintRealtimeResources(parsed.resources, handlers, {
    issueMembership: parsed.issueMembership,
    issueStatus: parsed.issueStatus,
  });
}

function subscribeActiveOrganizationId(onChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  window.addEventListener('storage', onChange);
  window.addEventListener('localStorageChange', onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener('localStorageChange', onChange);
  };
}

function useActiveOrganizationId(): string | null {
  return useSyncExternalStore(subscribeActiveOrganizationId, readActiveOrganizationId, () => null);
}

/**
 * Подписка на обновления свимлейна текущего спринта через SSE.
 * REST остаётся источником записи; EventSource сам переподключается.
 */
export function useSprintRealtimeSync(
  sprintId: number | null,
  handlers: SprintRealtimeHandlers
): void {
  const handlersRef = useRef(handlers);
  const organizationId = useActiveOrganizationId();

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!sprintId || sprintId <= 0 || !organizationId) {
      return;
    }
    const clientId = getBrowserRealtimeClientId();
    const source = new EventSource(buildSprintRealtimeSseUrl({ clientId, organizationId, sprintId }));

    source.onmessage = (message) => {
      applySprintRealtimeSsePayload(message.data, { clientId, organizationId, sprintId }, handlersRef.current);
    };

    return () => {
      source.close();
      handlersRef.current.onPresence?.([]);
    };
  }, [organizationId, sprintId]);
}
