import type {
  SprintPresenceFocus,
  SprintPresenceFocusState,
  SprintPresenceViewer,
  SprintRealtimeEvent,
  SprintRealtimeIssueMembership,
  SprintRealtimeIssueStatus,
  SprintRealtimeMessage,
  SprintRealtimeResource,
  SprintTimerEvent,
} from './sprintRealtimeTypes';

import { isSprintPresenceBoardView } from './sprintPresenceBoardView';
import { parseSprintPresenceGesture } from './sprintPresenceGesture';
import { parseRealtimeClientId } from './sprintRealtimeClientId';
import { SPRINT_REALTIME_CHANNEL_PREFIX } from './sprintRealtimeConstants';
import { SPRINT_PRESENCE_FOCUS_STATES } from './sprintRealtimeTypes';
import { parseSprintTimerState } from './sprintTimerState';

const RESOURCES: ReadonlySet<string> = new Set(['comments', 'links', 'positions', 'reactions', 'tasks']);

export function sprintRealtimeChannel(organizationId: string, sprintId: number): string {
  return `${SPRINT_REALTIME_CHANNEL_PREFIX}${organizationId}:${sprintId}`;
}

function isSprintRealtimeResource(value: unknown): value is SprintRealtimeResource {
  return typeof value === 'string' && RESOURCES.has(value);
}

function parseResources(value: unknown): SprintRealtimeResource[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  const resources: SprintRealtimeResource[] = [];
  for (const item of value) {
    if (!isSprintRealtimeResource(item)) {
      return null;
    }
    if (!resources.includes(item)) {
      resources.push(item);
    }
  }
  return resources;
}

function parseOriginClientId(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return null;
}

function parseSprintRealtimeEnvelope(
  value: Record<string, unknown>
): { at: number; organizationId: string; sprintId: number } | null {
  if (typeof value.sprintId !== 'number' || !Number.isInteger(value.sprintId) || value.sprintId <= 0) {
    return null;
  }
  if (typeof value.organizationId !== 'string' || value.organizationId.length === 0) {
    return null;
  }
  if (typeof value.at !== 'number' || !Number.isFinite(value.at)) {
    return null;
  }
  return { at: value.at, organizationId: value.organizationId, sprintId: value.sprintId };
}

const MAX_PRESENCE_FOCUS_TARGET_ID_LENGTH = 200;
const FOCUS_STATES = new Set<string>(SPRINT_PRESENCE_FOCUS_STATES);

function isSprintPresenceFocusState(value: unknown): value is SprintPresenceFocusState {
  return typeof value === 'string' && FOCUS_STATES.has(value);
}

function parseSprintPresenceFocus(value: unknown): SprintPresenceFocus | undefined {
  if (value == null || typeof value !== 'object') {
    return undefined;
  }
  const row = value as Record<string, unknown>;
  if (!isSprintPresenceFocusState(row.state)) {
    return undefined;
  }
  if (typeof row.targetId !== 'string') {
    return undefined;
  }
  const targetId = row.targetId.trim();
  if (!targetId || targetId.length > MAX_PRESENCE_FOCUS_TARGET_ID_LENGTH) {
    return undefined;
  }
  return { state: row.state, targetId };
}

function parseSprintPresenceViewerOptionalFields(
  row: Record<string, unknown>
): Pick<SprintPresenceViewer, 'boardView' | 'clientId' | 'focus' | 'gesture'> {
  const clientId = parseRealtimeClientId(typeof row.clientId === 'string' ? row.clientId : null);
  const focus = parseSprintPresenceFocus(row.focus);
  const boardView = isSprintPresenceBoardView(row.boardView) ? row.boardView : undefined;
  const gesture = parseSprintPresenceGesture(row.gesture);
  return {
    ...(boardView ? { boardView } : {}),
    ...(clientId ? { clientId } : {}),
    ...(focus ? { focus } : {}),
    ...(gesture ? { gesture } : {}),
  };
}

export function parseSprintPresenceViewer(value: unknown): SprintPresenceViewer | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.userId !== 'string' || row.userId.length === 0) {
    return null;
  }
  if (typeof row.displayName !== 'string' || row.displayName.length === 0) {
    return null;
  }
  if (row.avatarUrl != null && typeof row.avatarUrl !== 'string') {
    return null;
  }
  return {
    avatarUrl: typeof row.avatarUrl === 'string' && row.avatarUrl.length > 0 ? row.avatarUrl : null,
    displayName: row.displayName,
    userId: row.userId,
    ...parseSprintPresenceViewerOptionalFields(row),
  };
}

function parsePresenceViewers(value: unknown): SprintPresenceViewer[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const viewers: SprintPresenceViewer[] = [];
  for (const item of value) {
    const parsed = parseSprintPresenceViewer(item);
    if (!parsed) {
      return null;
    }
    viewers.push(parsed);
  }
  return viewers;
}

function parseIssueStatus(value: unknown): SprintRealtimeIssueStatus | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.issueKey !== 'string' || typeof row.statusKey !== 'string') {
    return undefined;
  }
  const issueKey = row.issueKey.trim();
  const statusKey = row.statusKey.trim();
  if (!issueKey || !statusKey) {
    return undefined;
  }
  return { issueKey, statusKey };
}

function parseIssueMembershipTask(
  value: unknown,
  issueKey: string
): NonNullable<SprintRealtimeIssueMembership['task']> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.id !== 'string' || row.id.trim() !== issueKey) {
    return undefined;
  }
  if (typeof row.name !== 'string' || typeof row.team !== 'string' || typeof row.link !== 'string') {
    return undefined;
  }
  return value as NonNullable<SprintRealtimeIssueMembership['task']>;
}

function parseIssueMembership(value: unknown): SprintRealtimeIssueMembership | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const row = value as Record<string, unknown>;
  if (row.action !== 'added' && row.action !== 'removed') {
    return undefined;
  }
  if (typeof row.issueKey !== 'string') {
    return undefined;
  }
  const issueKey = row.issueKey.trim();
  if (!issueKey) {
    return undefined;
  }
  const task = parseIssueMembershipTask(row.task, issueKey);
  return { action: row.action, issueKey, ...(task ? { task } : {}) };
}

function parseSprintChangedEvent(
  envelope: { at: number; organizationId: string; sprintId: number },
  value: Record<string, unknown>
): SprintRealtimeEvent | null {
  const resources = parseResources(value.resources);
  if (!resources) {
    return null;
  }
  const issueStatus = parseIssueStatus(value.issueStatus);
  const issueMembership = parseIssueMembership(value.issueMembership);
  return {
    ...envelope,
    originClientId: parseOriginClientId(value.originClientId),
    resources,
    type: 'sprint.changed',
    ...(issueStatus ? { issueStatus } : {}),
    ...(issueMembership ? { issueMembership } : {}),
  };
}

function parseSprintTimerEvent(
  envelope: { at: number; organizationId: string; sprintId: number },
  value: Record<string, unknown>
): SprintTimerEvent | null {
  const timer = parseSprintTimerState(value.timer);
  if (!timer) {
    return null;
  }
  return {
    ...envelope,
    originClientId: parseOriginClientId(value.originClientId),
    timer,
    type: 'sprint.timer',
  };
}

function parseSprintRealtimeMessageObject(value: Record<string, unknown>): SprintRealtimeMessage | null {
  const envelope = parseSprintRealtimeEnvelope(value);
  if (!envelope) {
    return null;
  }
  if (value.type === 'sprint.changed') {
    return parseSprintChangedEvent(envelope, value);
  }
  if (value.type === 'sprint.presence') {
    const viewers = parsePresenceViewers(value.viewers);
    if (!viewers) {
      return null;
    }
    return { ...envelope, type: 'sprint.presence', viewers };
  }
  if (value.type === 'sprint.timer') {
    return parseSprintTimerEvent(envelope, value);
  }
  return null;
}

export function parseSprintRealtimeMessage(raw: unknown): SprintRealtimeMessage | null {
  if (typeof raw === 'string') {
    try {
      return parseSprintRealtimeMessage(JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  return parseSprintRealtimeMessageObject(raw as Record<string, unknown>);
}

export function serializeSprintRealtimeMessage(event: SprintRealtimeMessage): string {
  return JSON.stringify(event);
}

export function shouldApplySprintRealtimeEvent(
  event: SprintRealtimeEvent,
  input: { clientId: string; organizationId: string; sprintId: number }
): boolean {
  if (event.sprintId !== input.sprintId) {
    return false;
  }
  if (event.organizationId !== input.organizationId) {
    return false;
  }
  if (event.originClientId && event.originClientId === input.clientId) {
    return false;
  }
  return true;
}
