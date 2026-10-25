/**
 * Метрики спринтов доски: выбор спринтов в окне, чтение сохранённых, досчёт недостающих порциями.
 * Закончившийся спринт считается один раз и замораживается; открытый — пересчитывается не чаще TTL.
 */

import type { StoredSprintMetrics } from './sprintMetricsRepository';
import type { BoardSprintMetrics } from './sprintMetricsTypes';
import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';
import type { SprintListItem } from '@/types/tracker';

import { loadSprintBurndownSource } from '@/lib/burndown/loadSprintBurndownSource';
import { apiCache, cacheKeys } from '@/lib/cache';
import { sprintTaskCompletionRulesFromIntegration } from '@/lib/sprints/sprintTaskCompletion';
import { loadTrackerIntegrationForOrganization } from '@/lib/trackerIntegration';

import { DEFAULT_METRICS_QUARTERS, resolveMetricsWindowStartMs } from './aggregateSprintMetrics';
import { buildSprintIssueFacts } from './sprintIssueFacts';
import {
  listStoredSprintMetrics,
  tallySprintGoals,
  upsertSprintMetrics,
} from './sprintMetricsRepository';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Спринт замораживается через сутки после конца: поздние закрытия и перенос задач успевают попасть. */
const FREEZE_AFTER_END_MS = MS_PER_DAY;
/** Открытый спринт пересчитывается не чаще. */
const OPEN_SPRINT_TTL_MS = 15 * 60 * 1000;
/** Спринтов, считаемых параллельно (щадим rate limit трекера). */
const COMPUTE_CONCURRENCY = 2;
/** Спринт, расчёт которого упал, не повторяется это время — иначе `pending` не обнулится никогда. */
const FAILURE_COOLDOWN_MS = 30 * 60 * 1000;

/** Как у GET /api/sprints: клиент опрашивает дашборд каждые несколько секунд, трекер дёргать незачем. */
const SPRINTS_CACHE_TTL_SECONDS = 10 * 60;

/** Расчёт спринта дольше — в лог (обычно это медленный changelog трекера). */
const SLOW_SPRINT_MS = 5000;

const failedAt = new Map<string, number>();
/** Фоновый досчёт по доске: один на (организация, доска). */
const backfills = new Map<string, Promise<void>>();

function sprintStartMs(sprint: Pick<SprintListItem, 'startDate' | 'startDateTime'>): number {
  return Date.parse(sprint.startDateTime || sprint.startDate);
}

/** Начавшиеся спринты, стартовавшие не раньше окна, по дате старта. */
export function selectSprintsForMetrics(
  sprints: SprintListItem[],
  windowStartMs: number,
  nowMs: number
): SprintListItem[] {
  return sprints
    .filter((sprint) => {
      const start = sprintStartMs(sprint);
      return Number.isFinite(start) && start >= windowStartMs && start <= nowMs;
    })
    .sort((a, b) => sprintStartMs(a) - sprintStartMs(b));
}

export function needsRecompute(stored: StoredSprintMetrics | undefined, nowMs: number): boolean {
  if (!stored) return true;
  if (stored.frozen) return false;
  return nowMs - Date.parse(stored.computedAt) > OPEN_SPRINT_TTL_MS;
}

/** Сначала текущий спринт, потом история от новых к старым. */
function computeOrder(sprints: SprintListItem[]): SprintListItem[] {
  return [...sprints].reverse();
}

async function computeSprintRecord(input: {
  boardId: number;
  issueTracker: IssueTrackerProviderClient;
  nowMs: number;
  organizationId: string;
  sprintId: number;
}): Promise<StoredSprintMetrics> {
  const integration = await loadTrackerIntegrationForOrganization(input.organizationId);
  const source = await loadSprintBurndownSource({
    boardId: input.boardId,
    integration,
    issueTracker: input.issueTracker,
    organizationId: input.organizationId,
    sprintId: input.sprintId,
  });
  const { sprintInfo } = source;
  const startMs = Date.parse(sprintInfo.startDateTime);
  const endMs = Date.parse(sprintInfo.endDateTime);
  const facts = buildSprintIssueFacts(source.realIssues, source.burndownIssues, {
    completionRules: sprintTaskCompletionRulesFromIntegration({
      readyStatusKey: integration?.releaseReadiness?.readyStatusKey,
      statuses: integration?.statuses,
    }),
    endMs,
    nowMs: input.nowMs,
    sprintId: sprintInfo.id != null ? String(sprintInfo.id) : undefined,
    sprintName: sprintInfo.name ?? '',
    startMs,
  });
  return {
    computedAt: new Date(input.nowMs).toISOString(),
    endDate: sprintInfo.endDateTime,
    facts,
    frozen: input.nowMs > endMs + FREEZE_AFTER_END_MS,
    name: sprintInfo.name,
    open: input.nowMs < endMs,
    sprintId: sprintInfo.id,
    startDate: sprintInfo.startDateTime,
  };
}

function failureKey(organizationId: string, boardId: number, sprintId: number): string {
  return `${organizationId}:${boardId}:${sprintId}`;
}

function recentlyFailed(key: string, nowMs: number): boolean {
  const at = failedAt.get(key);
  return at != null && nowMs - at < FAILURE_COOLDOWN_MS;
}

interface LoadBoardSprintMetricsInput {
  boardId: number;
  issueTracker: IssueTrackerProviderClient;
  nowMs: number;
  organizationId: string;
  quarters?: number;
}

async function computeQueue(input: LoadBoardSprintMetricsInput, queue: SprintListItem[]): Promise<void> {
  const pendingQueue = [...queue];
  const worker = async () => {
    while (pendingQueue.length > 0) {
      const sprint = pendingQueue.shift() as SprintListItem;
      const key = failureKey(input.organizationId, input.boardId, sprint.id);
      try {
        const sprintStartedAt = Date.now();
        const record = await computeSprintRecord({ ...input, sprintId: sprint.id });
        await upsertSprintMetrics({ boardId: input.boardId, organizationId: input.organizationId, record });
        const tookMs = Date.now() - sprintStartedAt;
        if (tookMs > SLOW_SPRINT_MS) {
          console.warn(
            `[sprint-metrics] slow sprint: board ${input.boardId} sprint ${sprint.id}, ${record.facts.length} facts, ${tookMs}ms`
          );
        }
      } catch (error) {
        failedAt.set(key, Date.now());
        console.error(`[sprint-metrics] board ${input.boardId} sprint ${sprint.id} failed:`, error);
      }
    }
  };
  await Promise.all(Array.from({ length: COMPUTE_CONCURRENCY }, worker));
}

async function listBoardSprintsCached(
  issueTracker: IssueTrackerProviderClient,
  boardId: number
): Promise<SprintListItem[]> {
  const cacheKey = cacheKeys.sprints(boardId);
  const cached = apiCache.get<SprintListItem[]>(cacheKey);
  if (cached) return cached;
  const sprints = await issueTracker.listSprints(boardId);
  if (sprints.length > 0) apiCache.set(cacheKey, sprints, SPRINTS_CACHE_TTL_SECONDS);
  return sprints;
}

function startBackfill(input: LoadBoardSprintMetricsInput, queue: SprintListItem[]): void {
  const key = `${input.organizationId}:${input.boardId}`;
  if (backfills.has(key) || queue.length === 0) return;
  const job = computeQueue(input, queue)
    .catch((error: unknown) => console.error(`[sprint-metrics] backfill board ${input.boardId} failed:`, error))
    .finally(() => backfills.delete(key));
  backfills.set(key, job);
}

/**
 * Отдаёт сохранённые записи сразу; недостающие и устаревшие спринты досчитываются в фоне
 * (`pending` — сколько спринтов ещё без записи, клиент повторяет запрос).
 */
export async function loadBoardSprintMetrics(input: LoadBoardSprintMetricsInput): Promise<BoardSprintMetrics> {
  const { boardId, organizationId, nowMs } = input;
  const windowStartMs = resolveMetricsWindowStartMs(input.quarters ?? DEFAULT_METRICS_QUARTERS, nowMs);
  const sprints = selectSprintsForMetrics(
    await listBoardSprintsCached(input.issueTracker, boardId),
    windowStartMs,
    nowMs
  );
  const sprintIds = sprints.map((sprint) => sprint.id);
  const stored = await listStoredSprintMetrics({ boardId, organizationId, sprintIds });

  const queue = computeOrder(sprints).filter(
    (sprint) =>
      needsRecompute(stored.get(sprint.id), nowMs) &&
      !recentlyFailed(failureKey(organizationId, boardId, sprint.id), nowMs)
  );
  const pending = queue.filter((sprint) => !stored.has(sprint.id)).length;
  startBackfill(input, queue);

  const goals = await tallySprintGoals({ organizationId, sprintIds });
  const records = sprints
    .map((sprint) => stored.get(sprint.id))
    .filter((record): record is StoredSprintMetrics => record != null)
    .map((record) => ({ ...record, goals: goals.get(record.sprintId) ?? { done: 0, total: 0 } }));

  return {
    pending,
    records,
    windowStart: new Date(windowStartMs).toISOString(),
  };
}
