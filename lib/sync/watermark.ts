/**
 * Окно инкрементальной синхронизации: since/until и нахлёст относительно watermark.
 * Чистые функции (без I/O).
 */

/** Ключ в sync_runs.stats (ISO-8601, верхняя граница последнего успешного окна). */
export const WATERMARK_UNTIL_STATS_KEY = 'watermark_until' as const;

interface IncrementalWindowParams {
  intervalMinutes: number;
  lastWatermarkUntil: Date | null;
  /** «Сейчас» в UTC (обычно new Date()). */
  now: Date;
  overlapMinutes: number;
}

interface IncrementalWindow {
  since: Date;
  until: Date;
}

/**
 * until = now; since = lastWatermark − overlap (если watermark был),
 * иначе bootstrap: until − (interval + overlap).
 */
export function computeIncrementalWindow(params: IncrementalWindowParams): IncrementalWindow {
  const until = params.now;
  const overlapMs = params.overlapMinutes * 60_000;
  const intervalMs = params.intervalMinutes * 60_000;

  let since: Date;
  if (params.lastWatermarkUntil != null) {
    since = new Date(params.lastWatermarkUntil.getTime() - overlapMs);
  } else {
    since = new Date(until.getTime() - intervalMs - overlapMs);
  }

  if (since.getTime() >= until.getTime()) {
    since = new Date(until.getTime() - overlapMs - 1000);
  }

  return { since, until };
}
