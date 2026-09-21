import type { GitLabFactEvent } from '@/lib/gitlab/mergeRequestFactTypes';

/** Макс. пауза между соседними одинаковыми событиями в одном батче. */
const GITLAB_FACT_EVENT_BATCH_GAP_MS = 60 * 60 * 1000;

/** Батч одинаковых событий (один маркер на таймлайне). */
export interface GitLabFactEventBatch {
  /** Время для позиции маркера — первое событие в цепочке. */
  at: string;
  items: GitLabFactEvent[];
  kind: GitLabFactEvent['kind'];
}

/**
 * Все события GitLab на таймлайне (без фильтра по фазе review).
 * Клиппинг по окну спринта делается при раскладке маркеров.
 */
export function filterGitlabFactEventsForTimeline(
  events: GitLabFactEvent[]
): GitLabFactEvent[] {
  return [...events].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

function groupEventsByKind(
  events: GitLabFactEvent[]
): Map<GitLabFactEvent['kind'], GitLabFactEvent[]> {
  const byKind = new Map<GitLabFactEvent['kind'], GitLabFactEvent[]>();
  for (const event of events) {
    const list = byKind.get(event.kind);
    if (list) {
      list.push(event);
    } else {
      byKind.set(event.kind, [event]);
    }
  }
  return byKind;
}

/**
 * Склеивает подряд идущие события одного kind, пока пауза до предыдущего ≤ gapMs.
 */
function batchSameKindConsecutive(
  kind: GitLabFactEvent['kind'],
  kindEvents: GitLabFactEvent[],
  gapMs: number
): GitLabFactEventBatch[] {
  const batches: GitLabFactEventBatch[] = [];
  let current: GitLabFactEvent[] = [];
  let lastAtMs = 0;

  for (const event of kindEvents) {
    const atMs = new Date(event.at).getTime();
    const continuesChain = current.length > 0 && atMs - lastAtMs <= gapMs;
    if (continuesChain) {
      current.push(event);
      lastAtMs = atMs;
      continue;
    }
    if (current.length > 0) {
      batches.push({ at: current[0].at, items: current, kind });
    }
    current = [event];
    lastAtMs = atMs;
  }

  if (current.length > 0) {
    batches.push({ at: current[0].at, items: current, kind });
  }
  return batches;
}

/**
 * Склеивает одинаковые события в батчи: одно `kind`, соседние с паузой не больше `gapMs`.
 * Разные kind не смешиваются; склейка по kind независима.
 */
export function batchGitlabFactEventsWithinWindow(
  events: GitLabFactEvent[],
  gapMs: number = GITLAB_FACT_EVENT_BATCH_GAP_MS
): GitLabFactEventBatch[] {
  if (events.length === 0) return [];

  const batches: GitLabFactEventBatch[] = [];
  for (const [kind, kindEvents] of groupEventsByKind(
    filterGitlabFactEventsForTimeline(events)
  )) {
    batches.push(...batchSameKindConsecutive(kind, kindEvents, gapMs));
  }

  return batches.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
