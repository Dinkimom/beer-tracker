import type { SprintContextPayload } from '@/lib/sprints/sprintContextTypes';

/** Почему задача не попала в короткий список «Что отдать агенту» — без модели, по данным доски. */
type DelegateExclusion = 'blocked' | 'done' | 'not_assignee' | 'not_this_sprint' | 'started';

interface DelegateShortlistTask {
  assigneeName: string | null;
  /** Задача разложена на доске; false — в бэклоге спринта. */
  onBoard: boolean;
  parentKey: string | null;
  /** Оценка: дни на доске и story points из трекера — что известно. */
  size: { days?: number; storyPoints?: number };
  statusDisplay: string | null;
  summary: string | null;
  taskId: string;
}

interface DelegateShortlist {
  eligible: DelegateShortlistTask[];
  excluded: Array<{ blockedBy?: string[]; reason: DelegateExclusion; taskId: string }>;
}

interface Row {
  assigneeId: string | null;
  inTrackerSprint: boolean;
  statusCategory: string | null;
  task: DelegateShortlistTask;
}

function sprintRows(context: SprintContextPayload): Map<string, Row> {
  const partsPerDay = Math.max(1, context.meta.partsPerDay);
  const rows = new Map<string, Row>();
  for (const position of context.positions) {
    if (position.isQa || rows.has(position.taskId)) {
      continue;
    }
    rows.set(position.taskId, {
      assigneeId: position.assigneeId,
      inTrackerSprint: position.inTrackerSprint !== false,
      statusCategory: position.statusCategory ?? null,
      task: {
        assigneeName: position.assigneeName ?? null,
        onBoard: true,
        parentKey: position.parentKey ?? null,
        size: { days: Math.round((position.duration / partsPerDay) * 10) / 10 },
        statusDisplay: position.statusDisplay ?? null,
        summary: position.summary ?? null,
        taskId: position.taskId,
      },
    });
  }
  for (const task of context.unplannedTasks ?? []) {
    if (rows.has(task.taskId)) {
      continue;
    }
    rows.set(task.taskId, {
      assigneeId: task.assigneeId ?? null,
      inTrackerSprint: true,
      statusCategory: task.statusCategory ?? null,
      task: {
        assigneeName: task.assigneeName ?? null,
        onBoard: false,
        parentKey: task.parentKey ?? null,
        size: task.storyPoints == null ? {} : { storyPoints: task.storyPoints },
        statusDisplay: task.statusDisplay ?? null,
        summary: task.summary,
        taskId: task.taskId,
      },
    });
  }
  return rows;
}

/** Незакрытые задачи, из которых на доске идёт стрелка в эту: пока они не готовы, браться рано. */
function openBlockers(context: SprintContextPayload, rows: Map<string, Row>, taskId: string): string[] {
  return context.taskLinks
    .filter((link) => link.toTaskId === taskId && link.fromTaskId !== taskId)
    .map((link) => link.fromTaskId)
    .filter((from) => {
      const status = rows.get(from)?.statusCategory;
      return status != null && status !== 'done';
    });
}

function exclusion(row: Row, blockers: string[], assigneeId: string | undefined): DelegateExclusion | null {
  if (!row.inTrackerSprint) {
    return 'not_this_sprint';
  }
  if (row.statusCategory === 'done') {
    return 'done';
  }
  if (row.statusCategory != null && row.statusCategory !== 'todo') {
    return 'started';
  }
  if (assigneeId && row.assigneeId !== assigneeId) {
    return 'not_assignee';
  }
  return blockers.length > 0 ? 'blocked' : null;
}

/** Меньше — раньше: дни на доске, иначе story points; без оценки — в конце. */
function sizeRank(task: DelegateShortlistTask): number {
  return task.size.days ?? task.size.storyPoints ?? Number.POSITIVE_INFINITY;
}

/**
 * Короткий список для скилла «Что отдать агенту»: задачи этого спринта, которые ещё не начаты, не
 * QA и не ждут незакрытую задачу по стрелке доски. Правила — здесь, а не в инструкции модели:
 * так отбор одинаков от запуска к запуску. Качество описания не фильтр: его агент смотрит сам.
 * `assigneeId` — только задачи этого человека (scope «Мои»).
 */
export function buildDelegateShortlist(context: SprintContextPayload, assigneeId?: string): DelegateShortlist {
  const rows = sprintRows(context);
  const eligible: DelegateShortlistTask[] = [];
  const excluded: DelegateShortlist['excluded'] = [];
  for (const row of rows.values()) {
    const { taskId } = row.task;
    const blockers = openBlockers(context, rows, taskId);
    const reason = exclusion(row, blockers, assigneeId);
    if (reason) {
      excluded.push({ reason, taskId, ...(reason === 'blocked' ? { blockedBy: blockers } : {}) });
    } else {
      eligible.push(row.task);
    }
  }
  eligible.sort((a, b) => sizeRank(a) - sizeRank(b));
  return { eligible, excluded };
}
