import type { SprintPresenceAttention } from './sprintRealtimeTypes';

import { SPRINT_PRESENCE_ATTENTIONS } from './sprintRealtimeTypes';

/** Без pointer/keyboard столько мс при видимой вкладке → idle. */
export const SPRINT_PRESENCE_IDLE_AFTER_MS = 90_000;

const ATTENTION_SET = new Set<string>(SPRINT_PRESENCE_ATTENTIONS);

export function isSprintPresenceAttention(value: unknown): value is SprintPresenceAttention {
  return typeof value === 'string' && ATTENTION_SET.has(value);
}

/** Старые клиенты без поля считаем активными. */
export function isSprintPresenceViewerIdle(attention: SprintPresenceAttention | undefined): boolean {
  return attention === 'idle';
}

export function resolveSprintPresenceAttention(input: {
  hasFocus: boolean;
  lastActivityAt: number;
  now: number;
  visibilityState: 'hidden' | 'visible';
}): SprintPresenceAttention {
  if (input.visibilityState === 'hidden') {
    return 'idle';
  }
  if (input.hasFocus) {
    return 'active';
  }
  if (input.now - input.lastActivityAt >= SPRINT_PRESENCE_IDLE_AFTER_MS) {
    return 'idle';
  }
  return 'active';
}

/** При схлопывании вкладок: active, если хотя бы одна вкладка смотрит. */
export function mergeSprintPresenceAttention(
  left: SprintPresenceAttention | undefined,
  right: SprintPresenceAttention | undefined
): SprintPresenceAttention {
  if (isSprintPresenceViewerIdle(left) && isSprintPresenceViewerIdle(right)) {
    return 'idle';
  }
  return 'active';
}
