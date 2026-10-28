'use client';

import type {
  SprintPresenceViewer,
  SprintRealtimeIssueMembership,
  SprintRealtimeIssueStatus,
  SprintRealtimeResource,
} from '@/lib/realtime/sprintRealtimeTypes';

import { useEffect, useRef } from 'react';

import { useDemoPlannerShell } from '@/contexts/DemoPlannerShellContext';
import { buildDemoPresenceViewers } from '@/lib/demo/demoPresenceViewers';
import { buildSprintRealtimeSseUrl } from '@/lib/realtime/buildSprintRealtimeSseUrl';
import { getBrowserRealtimeClientId } from '@/lib/realtime/sprintRealtimeClientId';
import { parseSprintRealtimeMessage, shouldApplySprintRealtimeEvent } from '@/lib/realtime/sprintRealtimeProtocol';
import { publishSprintTimerClient } from '@/lib/realtime/sprintTimerClient';

import { useActiveOrganizationId } from './useActiveOrganizationId';

interface SprintRealtimeTaskPayload {
  issueMembership?: SprintRealtimeIssueMembership;
  issueStatus?: SprintRealtimeIssueStatus;
}

interface SprintRealtimeHandlers {
  onAgentSessions?: () => void;
  onComments?: () => void;
  onFeatureLanes?: () => void;
  onGoals?: () => void;
  onLinks?: () => void;
  onPositions?: () => void;
  onPresence?: (viewers: SprintPresenceViewer[]) => void;
  onRetro?: () => void;
  onTasks?: (payload: SprintRealtimeTaskPayload) => void;
}


function dispatchSprintRealtimeResources(
  resources: readonly SprintRealtimeResource[],
  handlers: SprintRealtimeHandlers,
  payload: SprintRealtimeTaskPayload
): void {
  if (resources.includes('positions')) {
    handlers.onPositions?.();
  }
  if (resources.includes('goals')) {
    handlers.onGoals?.();
  }
  if (resources.includes('comments') || resources.includes('reactions')) {
    handlers.onComments?.();
  }
  if (resources.includes('links')) {
    handlers.onLinks?.();
  }
  if (resources.includes('featureLanes')) {
    handlers.onFeatureLanes?.();
  }
  if (resources.includes('agentSessions')) {
    handlers.onAgentSessions?.();
  }
  if (resources.includes('tasks')) {
    handlers.onTasks?.(payload);
  }
  if (resources.includes('retro')) {
    handlers.onRetro?.();
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


/**
 * Подписка на обновления свимлейна текущего спринта через SSE.
 * REST остаётся источником записи; EventSource сам переподключается.
 */
export function useSprintRealtimeSync(
  sprintId: number | null,
  handlers: SprintRealtimeHandlers,
  options?: { presence?: boolean }
): void {
  const handlersRef = useRef(handlers);
  const { isDemoPlanner } = useDemoPlannerShell();
  const organizationId = useActiveOrganizationId();
  const joinPresence = options?.presence !== false;

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!isDemoPlanner || !sprintId || sprintId <= 0) return;
    handlersRef.current.onPresence?.(buildDemoPresenceViewers());
  }, [isDemoPlanner, sprintId]);

  useEffect(() => {
    // Fixture demo has no real SSE tenant — EventSource 403 would reconnect forever.
    if (isDemoPlanner || !sprintId || sprintId <= 0 || !organizationId) {
      return;
    }
    const clientId = getBrowserRealtimeClientId();
    const source = new EventSource(
      buildSprintRealtimeSseUrl({ clientId, organizationId, presence: joinPresence, sprintId })
    );

    source.onmessage = (message) => {
      applySprintRealtimeSsePayload(message.data, { clientId, organizationId, sprintId }, handlersRef.current);
    };

    return () => {
      source.close();
      handlersRef.current.onPresence?.([]);
    };
  }, [isDemoPlanner, joinPresence, organizationId, sprintId]);
}
