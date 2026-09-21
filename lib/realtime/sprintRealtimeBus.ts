import type { SprintRealtimeMessage } from './sprintRealtimeTypes';

import { Redis } from 'ioredis';

import { getRedisUrl } from '@/lib/env';

import { isSprintRealtimeRedisEnabled, SPRINT_REALTIME_CHANNEL_PREFIX } from './sprintRealtimeConstants';
import { parseSprintRealtimeMessage, serializeSprintRealtimeMessage, sprintRealtimeChannel } from './sprintRealtimeProtocol';

type SprintRealtimeListener = (event: SprintRealtimeMessage) => void;

interface SprintRealtimeBusState {
  localListeners: Set<SprintRealtimeListener>;
  pubClient: Redis | null;
  redisSubscriberStarted: boolean;
  subClient: Redis | null;
}

const globalForRealtime = globalThis as typeof globalThis & {
  __beerTrackerSprintRealtime?: SprintRealtimeBusState;
};

function createSprintRealtimeBusState(): SprintRealtimeBusState {
  return {
    localListeners: new Set(),
    pubClient: null,
    redisSubscriberStarted: false,
    subClient: null,
  };
}

function realtimeBus(): SprintRealtimeBusState {
  globalForRealtime.__beerTrackerSprintRealtime ??= createSprintRealtimeBusState();
  return globalForRealtime.__beerTrackerSprintRealtime;
}

export function subscribeLocalSprintRealtime(listener: SprintRealtimeListener): () => void {
  const listeners = realtimeBus().localListeners;
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emitLocalSprintRealtime(event: SprintRealtimeMessage): void {
  for (const listener of realtimeBus().localListeners) {
    listener(event);
  }
}

function acquireRealtimeRedisPair(): { pub: Redis; sub: Redis } | null {
  if (!isSprintRealtimeRedisEnabled()) {
    return null;
  }
  const url = getRedisUrl();
  if (!url) {
    return null;
  }
  const state = realtimeBus();
  if (!state.pubClient) {
    state.pubClient = new Redis(url, { maxRetriesPerRequest: null });
  }
  if (!state.subClient) {
    state.subClient = new Redis(url, { maxRetriesPerRequest: null });
  }
  return { pub: state.pubClient, sub: state.subClient };
}

/** Pub-клиент для HASH присутствия (sub-соединение только на psubscribe). */
export function getRealtimeRedisPubClient(): Redis | null {
  return acquireRealtimeRedisPair()?.pub ?? null;
}

export function startSprintRealtimeRedisSubscriber(): void {
  const state = realtimeBus();
  if (state.redisSubscriberStarted) {
    return;
  }
  const pair = acquireRealtimeRedisPair();
  if (!pair) {
    return;
  }
  state.redisSubscriberStarted = true;
  pair.sub.psubscribe(`${SPRINT_REALTIME_CHANNEL_PREFIX}*`).catch((error) => {
    console.error('[realtime] Redis psubscribe failed', error);
  });
  pair.sub.on('pmessage', (_pattern: string, _channel: string, message: string) => {
    const event = parseSprintRealtimeMessage(message);
    if (event) {
      emitLocalSprintRealtime(event);
    }
  });
}

export async function publishSprintRealtimeEvent(event: SprintRealtimeMessage): Promise<void> {
  const payload = serializeSprintRealtimeMessage(event);
  const channel = sprintRealtimeChannel(event.organizationId, event.sprintId);
  emitLocalSprintRealtime(event);
  const pair = acquireRealtimeRedisPair();
  if (!pair) {
    return;
  }
  try {
    await pair.pub.publish(channel, payload);
  } catch (error) {
    console.error('[realtime] Redis publish failed', error);
  }
}

export function resetSprintRealtimeBusForTests(): void {
  const state = realtimeBus();
  state.localListeners.clear();
  state.redisSubscriberStarted = false;
  state.pubClient = null;
  state.subClient = null;
}
