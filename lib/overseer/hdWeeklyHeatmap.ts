export interface HdWeeklyHeatmapWeek {
  count: number;
  /** Понедельник недели (UTC), YYYY-MM-DD */
  weekStart: string;
}

export interface HdWeeklyHeatmapPayload {
  maxCount: number;
  rangeStart: string;
  weeks: HdWeeklyHeatmapWeek[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function formatUtcIsoDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Понедельник ISO-недели (UTC), содержащей date. */
function startOfUtcIsoWeekMs(ms: number): number {
  const date = new Date(ms);
  const utcDay = date.getUTCDay();
  const diffToMonday = utcDay === 0 ? -6 : 1 - utcDay;
  const monday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + diffToMonday)
  );
  return monday.getTime();
}

export function startOfUtcIsoWeekIso(ms: number): string {
  return formatUtcIsoDateOnly(new Date(startOfUtcIsoWeekMs(ms)));
}

export function addUtcWeeks(weekStartIso: string, weeks: number): string {
  const ms = Date.parse(`${weekStartIso}T00:00:00.000Z`);
  return formatUtcIsoDateOnly(new Date(ms + weeks * 7 * MS_PER_DAY));
}

export function resolveHdHeatmapRangeStartMs(createdAt: string | undefined, nowMs: number): number {
  const createdMs = createdAt?.trim() ? Date.parse(createdAt) : Number.NaN;
  if (Number.isFinite(createdMs)) {
    return startOfUtcIsoWeekMs(createdMs);
  }
  return startOfUtcIsoWeekMs(nowMs - 26 * 7 * MS_PER_DAY);
}

export function weekKeyFromDateOnly(iso: string): string {
  const trimmed = iso.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const ms = Date.parse(`${trimmed}T12:00:00.000Z`);
  if (Number.isNaN(ms)) {
    return trimmed;
  }
  return startOfUtcIsoWeekIso(ms);
}

/** Схлопывает строки SQL в ISO-понедельники UTC (на случай смещения date-only). */
export function aggregateHdWeeklyCounts(weeklyCounts: HdWeeklyHeatmapWeek[]): HdWeeklyHeatmapWeek[] {
  const map = new Map<string, number>();
  for (const row of weeklyCounts) {
    const key = weekKeyFromDateOnly(row.weekStart);
    map.set(key, (map.get(key) ?? 0) + row.count);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, count]) => ({ weekStart, count }));
}

export function buildHdWeeklyHeatmapSeries(
  weeklyCounts: HdWeeklyHeatmapWeek[],
  rangeStartMs: number,
  nowMs: number
): HdWeeklyHeatmapWeek[] {
  const countByWeek = new Map<string, number>();
  for (const row of weeklyCounts) {
    const key = weekKeyFromDateOnly(row.weekStart);
    countByWeek.set(key, (countByWeek.get(key) ?? 0) + row.count);
  }
  const endWeekStartMs = startOfUtcIsoWeekMs(nowMs);
  const weeks: HdWeeklyHeatmapWeek[] = [];

  for (let cursor = rangeStartMs; cursor <= endWeekStartMs; cursor += 7 * MS_PER_DAY) {
    const weekStart = formatUtcIsoDateOnly(new Date(cursor));
    weeks.push({
      weekStart,
      count: countByWeek.get(weekStart) ?? 0,
    });
  }

  return weeks;
}

/**
 * Начальный hd_count без событий в changelog — только недостающая часть до суммы дельт.
 * Не подмешиваем весь hdCount, если дельты есть в БД, но не смапились (ошибка недели).
 */
function resolveCreationWeekStart(
  createdAt: string | undefined,
  weeks: HdWeeklyHeatmapWeek[]
): string {
  const createdMs = createdAt?.trim() ? Date.parse(createdAt) : Number.NaN;
  return Number.isFinite(createdMs) ? startOfUtcIsoWeekIso(createdMs) : weeks[0]!.weekStart;
}

function addBaselineToWeek(
  weeks: HdWeeklyHeatmapWeek[],
  creationWeekStart: string,
  baseline: number
): HdWeeklyHeatmapWeek[] {
  return weeks.map((week) =>
    week.weekStart === creationWeekStart ? { ...week, count: week.count + baseline } : week
  );
}

export function applyCreationWeekHdBaseline(
  weeks: HdWeeklyHeatmapWeek[],
  createdAt: string | undefined,
  hdCount: number | undefined,
  rawWeeklyRowCount = 0
): HdWeeklyHeatmapWeek[] {
  if (hdCount == null || hdCount <= 0 || weeks.length === 0) {
    return weeks;
  }

  const trackedSum = weeks.reduce((sum, week) => sum + week.count, 0);
  if (trackedSum === 0 && rawWeeklyRowCount > 0) {
    return weeks;
  }

  const baseline = Math.max(0, hdCount - trackedSum);
  if (baseline <= 0) {
    return weeks;
  }

  return addBaselineToWeek(weeks, resolveCreationWeekStart(createdAt, weeks), baseline);
}

export function buildHdWeeklyHeatmapPayload(
  weeklyCounts: HdWeeklyHeatmapWeek[],
  createdAt: string | undefined,
  nowMs: number = Date.now(),
  hdCount?: number
): HdWeeklyHeatmapPayload {
  const rangeStartMs = resolveHdHeatmapRangeStartMs(createdAt, nowMs);
  const aggregated = aggregateHdWeeklyCounts(weeklyCounts);
  let weeks = buildHdWeeklyHeatmapSeries(aggregated, rangeStartMs, nowMs);
  weeks = applyCreationWeekHdBaseline(weeks, createdAt, hdCount, aggregated.length);
  const maxCount = weeks.reduce((max, week) => Math.max(max, week.count), 0);
  return {
    rangeStart: formatUtcIsoDateOnly(new Date(rangeStartMs)),
    weeks,
    maxCount,
  };
}

type HdHeatmapLevel = 0 | 1 | 2 | 3 | 4;

export function hdHeatmapLevel(count: number, maxCount: number): HdHeatmapLevel {
  if (count <= 0 || maxCount <= 0) {
    return 0;
  }
  const ratio = count / maxCount;
  if (ratio >= 0.75) {
    return 4;
  }
  if (ratio >= 0.5) {
    return 3;
  }
  if (ratio >= 0.25) {
    return 2;
  }
  return 1;
}

/** Колонок в строке — как у GitHub (~квартал). */
export const HD_HEATMAP_COLUMNS = 13;

export function hdHeatmapGridRows<T>(items: T[], columns: number = HD_HEATMAP_COLUMNS): T[][] {
  if (items.length === 0) {
    return [];
  }
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns));
  }
  return rows;
}
