/**
 * Нормализация job.progress BullMQ (число 0–100 или объект с полем percent) для API админки.
 */

interface NormalizedRedisJobProgress {
  meta: Record<string, unknown> | null;
  /** 0–100 */
  percent: number;
}

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.min(100, Math.max(0, n));
}

function normalizeRedisJobProgressFromObject(
  raw: Record<string, unknown>
): NormalizedRedisJobProgress {
  const p = typeof raw.percent === 'number' ? raw.percent : 0;
  const { percent: _drop, ...rest } = raw;
  const keys = Object.keys(rest);
  return {
    meta: keys.length > 0 ? rest : null,
    percent: clampPercent(p),
  };
}

function clampRedisJobProgressPercent(n: number): number {
  return clampPercent(n);
}

export function normalizeRedisJobProgress(raw: unknown): NormalizedRedisJobProgress {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return { meta: null, percent: clampRedisJobProgressPercent(raw) };
  }
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    return normalizeRedisJobProgressFromObject(raw as Record<string, unknown>);
  }
  return { meta: null, percent: 0 };
}
