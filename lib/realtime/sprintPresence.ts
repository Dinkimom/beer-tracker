import type {
  SprintPresenceBoardView,
  SprintPresenceFocus,
  SprintPresenceGesture,
  SprintPresenceViewer,
} from './sprintRealtimeTypes';

import { serializeSprintPresenceViewer, sprintPresenceFocusEquals } from './sprintCardPresence';
import { collapseSprintPresenceViewers } from './sprintPresenceCollapse';
import { sprintPresenceGestureEquals } from './sprintPresenceGesture';
import { getRealtimeRedisPubClient, publishSprintRealtimeEvent } from './sprintRealtimeBus';
import { SPRINT_PRESENCE_KEY_PREFIX, SPRINT_PRESENCE_TTL_SECONDS } from './sprintRealtimeConstants';
import { parseSprintPresenceViewer } from './sprintRealtimeProtocol';

const globalForPresence = globalThis as typeof globalThis & {
  __beerTrackerSprintPresence?: Map<string, Map<string, SprintPresenceViewer>>;
};

function memoryPresenceStore(): Map<string, Map<string, SprintPresenceViewer>> {
  globalForPresence.__beerTrackerSprintPresence ??= new Map();
  return globalForPresence.__beerTrackerSprintPresence;
}

function sprintPresenceRedisKey(organizationId: string, sprintId: number): string {
  return `${SPRINT_PRESENCE_KEY_PREFIX}${organizationId}:${sprintId}`;
}

function memoryBucket(key: string): Map<string, SprintPresenceViewer> {
  const memoryPresence = memoryPresenceStore();
  let bucket = memoryPresence.get(key);
  if (!bucket) {
    bucket = new Map();
    memoryPresence.set(key, bucket);
  }
  return bucket;
}

function parseHashViewers(fields: Record<string, string>): SprintPresenceViewer[] {
  const viewers: SprintPresenceViewer[] = [];
  for (const raw of Object.values(fields)) {
    try {
      const parsed = parseSprintPresenceViewer(JSON.parse(raw) as unknown);
      if (parsed) {
        viewers.push(parsed);
      }
    } catch {
      /* skip corrupt field */
    }
  }
  return collapseSprintPresenceViewers(viewers);
}

function listMemoryPresence(key: string): SprintPresenceViewer[] {
  const bucket = memoryPresenceStore().get(key);
  if (!bucket) {
    return [];
  }
  return collapseSprintPresenceViewers([...bucket.values()]);
}

function storedPresenceViewer(connectionId: string, viewer: SprintPresenceViewer): SprintPresenceViewer {
  return serializeSprintPresenceViewer({ ...viewer, clientId: connectionId });
}

export async function addSprintPresence(
  organizationId: string,
  sprintId: number,
  connectionId: string,
  viewer: SprintPresenceViewer
): Promise<SprintPresenceViewer[]> {
  const stored = storedPresenceViewer(connectionId, viewer);
  const key = sprintPresenceRedisKey(organizationId, sprintId);
  const redis = getRealtimeRedisPubClient();
  if (redis) {
    try {
      await redis.hset(key, connectionId, JSON.stringify(stored));
      await redis.expire(key, SPRINT_PRESENCE_TTL_SECONDS);
      return parseHashViewers(await redis.hgetall(key));
    } catch (error) {
      console.error('[realtime] presence redis write failed', error);
    }
  }
  memoryBucket(key).set(connectionId, stored);
  return listMemoryPresence(key);
}

export async function removeSprintPresence(
  organizationId: string,
  sprintId: number,
  connectionId: string
): Promise<SprintPresenceViewer[]> {
  const key = sprintPresenceRedisKey(organizationId, sprintId);
  const redis = getRealtimeRedisPubClient();
  if (redis) {
    try {
      await redis.hdel(key, connectionId);
      const remaining = await redis.hlen(key);
      if (remaining === 0) {
        await redis.del(key);
        return [];
      }
      await redis.expire(key, SPRINT_PRESENCE_TTL_SECONDS);
      return parseHashViewers(await redis.hgetall(key));
    } catch (error) {
      console.error('[realtime] presence redis delete failed', error);
    }
  }
  const memoryPresence = memoryPresenceStore();
  const bucket = memoryPresence.get(key);
  bucket?.delete(connectionId);
  if (bucket && bucket.size === 0) {
    memoryPresence.delete(key);
  }
  return listMemoryPresence(key);
}

async function readStoredPresenceViewer(
  organizationId: string,
  sprintId: number,
  connectionId: string
): Promise<SprintPresenceViewer | null> {
  const key = sprintPresenceRedisKey(organizationId, sprintId);
  const redis = getRealtimeRedisPubClient();
  if (redis) {
    try {
      const raw = await redis.hget(key, connectionId);
      if (!raw) {
        return null;
      }
      return parseSprintPresenceViewer(JSON.parse(raw) as unknown);
    } catch (error) {
      console.error('[realtime] presence redis read failed', error);
    }
  }
  return memoryBucket(key).get(connectionId) ?? null;
}

function mergeSprintPresenceIdentity(
  existing: SprintPresenceViewer | null,
  incoming: SprintPresenceViewer
): SprintPresenceViewer {
  if (!existing) {
    return incoming;
  }
  return {
    ...incoming,
    ...(incoming.boardView ?? existing.boardView
      ? { boardView: incoming.boardView ?? existing.boardView }
      : {}),
    ...(incoming.focus ?? existing.focus ? { focus: incoming.focus ?? existing.focus } : {}),
    ...(incoming.gesture ?? existing.gesture ? { gesture: incoming.gesture ?? existing.gesture } : {}),
  };
}

export async function updateSprintPresenceFocus(
  organizationId: string,
  sprintId: number,
  connectionId: string,
  focus: SprintPresenceFocus | null,
  boardView?: SprintPresenceBoardView,
  gesture?: SprintPresenceGesture | null
): Promise<'missing' | 'unchanged' | 'updated'> {
  const current = await readStoredPresenceViewer(organizationId, sprintId, connectionId);
  if (!current) {
    return 'missing';
  }
  const nextBoardView = boardView ?? current.boardView;
  const nextGesture = gesture === undefined ? current.gesture : gesture ?? undefined;
  if (
    sprintPresenceFocusEquals(current.focus, focus) &&
    current.boardView === nextBoardView &&
    sprintPresenceGestureEquals(current.gesture, nextGesture)
  ) {
    return 'unchanged';
  }
  const next: SprintPresenceViewer = {
    avatarUrl: current.avatarUrl,
    displayName: current.displayName,
    userId: current.userId,
    ...(nextBoardView ? { boardView: nextBoardView } : {}),
    ...(focus ? { focus } : {}),
    ...(nextGesture ? { gesture: nextGesture } : {}),
  };
  const viewers = await addSprintPresence(organizationId, sprintId, connectionId, next);
  await publishSprintPresenceSnapshot(organizationId, sprintId, viewers);
  return 'updated';
}

async function touchSprintPresence(organizationId: string, sprintId: number): Promise<void> {
  const redis = getRealtimeRedisPubClient();
  if (!redis) {
    return;
  }
  try {
    await redis.expire(sprintPresenceRedisKey(organizationId, sprintId), SPRINT_PRESENCE_TTL_SECONDS);
  } catch (error) {
    console.error('[realtime] presence redis expire failed', error);
  }
}

async function publishSprintPresenceSnapshot(
  organizationId: string,
  sprintId: number,
  viewers: SprintPresenceViewer[]
): Promise<void> {
  await publishSprintRealtimeEvent({
    at: Date.now(),
    organizationId,
    sprintId,
    type: 'sprint.presence',
    viewers,
  });
}

async function joinSprintPresence(
  organizationId: string,
  sprintId: number,
  connectionId: string,
  viewer: SprintPresenceViewer
): Promise<void> {
  const existing = await readStoredPresenceViewer(organizationId, sprintId, connectionId);
  const viewers = await addSprintPresence(
    organizationId,
    sprintId,
    connectionId,
    mergeSprintPresenceIdentity(existing, viewer)
  );
  await publishSprintPresenceSnapshot(organizationId, sprintId, viewers);
}

async function leaveSprintPresence(
  organizationId: string,
  sprintId: number,
  connectionId: string
): Promise<void> {
  const viewers = await removeSprintPresence(organizationId, sprintId, connectionId);
  await publishSprintPresenceSnapshot(organizationId, sprintId, viewers);
}

/** Сессия SSE: join/leave в одной очереди, чтобы cancel не обгонял HSET. */
export function createSprintPresenceSession(input: {
  connectionId?: string;
  organizationId: string;
  sprintId: number;
  viewer: SprintPresenceViewer;
  resolveViewer?: () => Promise<SprintPresenceViewer>;
}): { cancel: () => void; ping: () => void; start: () => void } {
  const connectionId = input.connectionId || crypto.randomUUID();
  let chain = Promise.resolve();
  const run = (task: () => Promise<void>) => {
    chain = chain.then(task, task);
  };
  return {
    cancel() {
      run(async () => {
        await leaveSprintPresence(input.organizationId, input.sprintId, connectionId);
      });
    },
    ping() {
      void touchSprintPresence(input.organizationId, input.sprintId);
    },
    start() {
      run(async () => {
        await joinSprintPresence(input.organizationId, input.sprintId, connectionId, input.viewer);
        if (!input.resolveViewer) {
          return;
        }
        try {
          const resolved = await input.resolveViewer();
          await joinSprintPresence(input.organizationId, input.sprintId, connectionId, resolved);
        } catch {
          /* keep the fallback identity already published */
        }
      });
    },
  };
}

export function resetSprintPresenceForTests(): void {
  memoryPresenceStore().clear();
}

async function listSprintPresenceViewers(
  organizationId: string,
  sprintId: number
): Promise<SprintPresenceViewer[]> {
  const key = sprintPresenceRedisKey(organizationId, sprintId);
  const redis = getRealtimeRedisPubClient();
  if (redis) {
    try {
      return parseHashViewers(await redis.hgetall(key));
    } catch (error) {
      console.error('[realtime] presence redis list failed', error);
    }
  }
  return listMemoryPresence(key);
}

/** userId всех вкладок, подключённых к SSE спринта (presence TTL ~90s). */
export async function listSprintPresenceUserIds(
  organizationId: string,
  sprintId: number
): Promise<string[]> {
  const viewers = await listSprintPresenceViewers(organizationId, sprintId);
  return [...new Set(viewers.map((viewer) => viewer.userId))];
}
