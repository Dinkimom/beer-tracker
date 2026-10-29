import type { ChangelogEntry } from '@/types/tracker';
import type { TaskStatus } from '@/utils/statusMapper';

/** Статус из истории или перехода: id стабилен между языками, key — запасной вариант. */
export interface FlowStatus {
  display: string;
  id: string | null;
  key: string;
}

interface FlowCandidate {
  samples: number;
  status: FlowStatus;
}

/**
 * Статус, в который команда переводит задачи на этом шаге, или причина, почему его нет:
 * not_enough_history — мало задач прошли шаг; ambiguous — нет статуса хотя бы у половины;
 * no_review_stage — из «в работе» задачи сразу закрывают.
 */
export type FlowStep =
  | { candidates: FlowCandidate[]; reason: 'ambiguous' | 'no_review_stage' | 'not_enough_history'; samples: number }
  | { samples: number; share: number; status: FlowStatus };

export interface IssueStatusFlow {
  inProgress: FlowStep;
  review: FlowStep;
  /** Сколько задач с историей статусов легло в выборку. */
  sampleSize: number;
}

const MIN_SAMPLES = 3;
const MIN_SHARE = 0.5;

function statusIdentity(status: FlowStatus): string {
  return status.id ?? status.key;
}

export function sameFlowStatus(a: Pick<FlowStatus, 'id' | 'key'>, b: Pick<FlowStatus, 'id' | 'key'>): boolean {
  return a.id && b.id ? a.id === b.id : a.key === b.key;
}

function toFlowStatus(value: unknown): FlowStatus | null {
  const row = value as { display?: unknown; id?: unknown; key?: unknown } | null;
  if (!row || typeof row.key !== 'string' || !row.key) {
    return null;
  }
  return {
    display: typeof row.display === 'string' && row.display ? row.display : row.key,
    id: typeof row.id === 'string' && row.id ? row.id : null,
    key: row.key,
  };
}

/** Смены статуса задачи по порядку времени. */
function statusChanges(history: readonly ChangelogEntry[]): Array<{ from: FlowStatus | null; to: FlowStatus }> {
  return [...history]
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .flatMap((entry) => {
      const field = entry.fields?.find((item) => item?.field?.id === 'status');
      const to = toFlowStatus(field?.to);
      return to ? [{ from: toFlowStatus(field?.from), to }] : [];
    });
}

class StatusTally {
  private readonly rows = new Map<string, FlowCandidate>();

  add(status: FlowStatus) {
    const row = this.rows.get(statusIdentity(status)) ?? { samples: 0, status };
    this.rows.set(statusIdentity(status), { ...row, samples: row.samples + 1 });
  }

  pick(): FlowStep {
    const candidates = [...this.rows.values()].sort((a, b) => b.samples - a.samples);
    const samples = candidates.reduce((sum, row) => sum + row.samples, 0);
    const top = candidates[0];
    if (!top || samples < MIN_SAMPLES) {
      return { candidates, reason: 'not_enough_history', samples };
    }
    const share = top.samples / samples;
    if (share < MIN_SHARE) {
      return { candidates: candidates.slice(0, 3), reason: 'ambiguous', samples };
    }
    return { samples, share: Math.round(share * 100) / 100, status: top.status };
  }
}

/**
 * Флоу команды по истории соседних задач. «В работу» — статус, в который задачи чаще всего впервые
 * попадают из категории in-progress. «Ревью» — куда их чаще всего переводят дальше из этого статуса
 * (возвраты назад не считаются); если дальше сразу done — отдельного ревью у команды нет.
 */
export function learnIssueStatusFlow(
  histories: ReadonlyArray<readonly ChangelogEntry[]>,
  categoryOf: (status: FlowStatus) => TaskStatus
): IssueStatusFlow {
  const issues = histories.map(statusChanges).filter((changes) => changes.length > 0);
  const starts = new StatusTally();
  for (const changes of issues) {
    const start = changes.find((change) => categoryOf(change.to) === 'in-progress');
    if (start) {
      starts.add(start.to);
    }
  }
  const inProgress = starts.pick();
  if (!('status' in inProgress)) {
    return { inProgress, review: inProgress, sampleSize: issues.length };
  }
  const nexts = new StatusTally();
  for (const changes of issues) {
    const next = changes.find(
      (change) =>
        change.from != null &&
        sameFlowStatus(change.from, inProgress.status) &&
        ['done', 'in-progress'].includes(categoryOf(change.to))
    );
    if (next) {
      nexts.add(next.to);
    }
  }
  const review = nexts.pick();
  if ('status' in review && categoryOf(review.status) === 'done') {
    return {
      inProgress,
      review: {
        candidates: [{ samples: Math.round(review.share * review.samples), status: review.status }],
        reason: 'no_review_stage',
        samples: review.samples,
      },
      sampleSize: issues.length,
    };
  }
  return { inProgress, review, sampleSize: issues.length };
}
