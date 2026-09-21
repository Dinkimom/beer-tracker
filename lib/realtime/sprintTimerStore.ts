import type { SprintTimerActor, SprintTimerAction, SprintTimerState } from './sprintTimerState';

import { getRealtimeRedisPubClient, publishSprintRealtimeEvent } from './sprintRealtimeBus';
import { SPRINT_TIMER_KEY_PREFIX, SPRINT_TIMER_TTL_SECONDS } from './sprintRealtimeConstants';
import {
  applySprintTimerAction,
  idleSprintTimerState,
  parseSprintTimerState,
  withSprintTimerServerNow,
} from './sprintTimerState';

const memoryTimers = new Map<string, SprintTimerState>();

function sprintTimerRedisKey(organizationId: string, sprintId: number): string {
  return `${SPRINT_TIMER_KEY_PREFIX}${organizationId}:${sprintId}`;
}

function withCurrentServerNow(state: SprintTimerState, now = Date.now()): SprintTimerState {
  return withSprintTimerServerNow(state, now);
}

async function readRedisTimer(key: string): Promise<SprintTimerState | null> {
  const redis = getRealtimeRedisPubClient();
  if (!redis) {
    return null;
  }
  try {
    const raw = await redis.get(key);
    if (!raw) {
      return null;
    }
    return parseSprintTimerState(JSON.parse(raw) as unknown);
  } catch (error) {
    console.error('[realtime] timer redis read failed', error);
    return null;
  }
}

export async function readSprintTimerState(
  organizationId: string,
  sprintId: number
): Promise<SprintTimerState> {
  const now = Date.now();
  const key = sprintTimerRedisKey(organizationId, sprintId);
  const fromRedis = await readRedisTimer(key);
  if (fromRedis) {
    return persistIfNormalized(organizationId, sprintId, fromRedis, now);
  }
  const fromMemory = memoryTimers.get(key);
  if (fromMemory) {
    return persistIfNormalized(organizationId, sprintId, fromMemory, now);
  }
  return idleSprintTimerState(now);
}

async function persistIfNormalized(
  organizationId: string,
  sprintId: number,
  state: SprintTimerState,
  now: number
): Promise<SprintTimerState> {
  const normalized = withCurrentServerNow(state, now);
  const alreadyCurrent =
    normalized.status === state.status && normalized.updatedAt === state.updatedAt;
  if (!alreadyCurrent) {
    await writeSprintTimerState(organizationId, sprintId, normalized);
    await publishSprintTimerSnapshot(organizationId, sprintId, normalized, null);
  }
  return normalized;
}

async function writeSprintTimerState(
  organizationId: string,
  sprintId: number,
  state: SprintTimerState
): Promise<void> {
  const key = sprintTimerRedisKey(organizationId, sprintId);
  memoryTimers.set(key, state);
  const redis = getRealtimeRedisPubClient();
  if (!redis) {
    if (state.status === 'idle') {
      memoryTimers.delete(key);
    }
    return;
  }
  try {
    if (state.status === 'idle') {
      memoryTimers.delete(key);
      await redis.del(key);
      return;
    }
    await redis.set(key, JSON.stringify(state), 'EX', SPRINT_TIMER_TTL_SECONDS);
  } catch (error) {
    console.error('[realtime] timer redis write failed', error);
  }
}

async function publishSprintTimerSnapshot(
  organizationId: string,
  sprintId: number,
  timer: SprintTimerState,
  originClientId: string | null
): Promise<void> {
  await publishSprintRealtimeEvent({
    at: Date.now(),
    organizationId,
    originClientId,
    sprintId,
    timer,
    type: 'sprint.timer',
  });
}

export async function mutateSprintTimerState(input: {
  action: SprintTimerAction;
  actor: SprintTimerActor;
  organizationId: string;
  originClientId: string | null;
  sprintId: number;
}): Promise<SprintTimerState> {
  const now = Date.now();
  const current = await readSprintTimerState(input.organizationId, input.sprintId);
  const next = applySprintTimerAction(current, input.action, now, input.actor);
  await writeSprintTimerState(input.organizationId, input.sprintId, next);
  await publishSprintTimerSnapshot(input.organizationId, input.sprintId, next, input.originClientId);
  return next;
}

export function resetSprintTimerStoreForTests(): void {
  memoryTimers.clear();
}
