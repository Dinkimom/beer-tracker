/** HTTP path for sprint realtime (SSE GET). */
export const SPRINT_REALTIME_PATH = '/api/realtime';

/** Браузерный id вкладки: эхо своих мутаций клиент отбрасывает. */
export const REALTIME_CLIENT_ID_HEADER = 'x-realtime-client-id';

export const REALTIME_CLIENT_ID_STORAGE_KEY = 'beer-tracker-realtime-client-id';

export const SPRINT_REALTIME_CHANNEL_PREFIX = 'beer-tracker:sprint-realtime:';

/** Redis HASH / in-memory bucket: кто сейчас смотрит спринт. */
export const SPRINT_PRESENCE_KEY_PREFIX = 'beer-tracker:presence:';

/** Redis STRING / in-memory: совместный таймер спринта. */
export const SPRINT_TIMER_KEY_PREFIX = 'beer-tracker:timer:';

/** TTL ключа таймера; истечение не стирает идущий таймер раньше 24ч. */
export const SPRINT_TIMER_TTL_SECONDS = 24 * 60 * 60;

/** TTL ключа присутствия; SSE ping раз в 25с его продлевает. */
export const SPRINT_PRESENCE_TTL_SECONDS = 90;

/**
 * В `next dev` не используем общий Redis для sprint.changed/presence snapshots:
 * локальные правки не должны улетать на staging и эхом возвращаться самому себе.
 * Явно: `REALTIME_REDIS_IN_DEV=1`.
 */
export function isSprintRealtimeRedisEnabled(): boolean {
  if (process.env.NODE_ENV !== 'development') {
    return true;
  }
  const raw = process.env.REALTIME_REDIS_IN_DEV?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}
