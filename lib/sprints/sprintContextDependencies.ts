import type { IssueTrackerIssueLink } from '@/lib/issueTrackerProvider/issueLinkTypes';
import type {
  SprintContextDependencies,
  SprintContextDependencyTarget,
  SprintContextTaskDependencies,
  SprintContextTaskLink,
} from '@/lib/sprints/sprintContextTypes';

/** Задача по обе стороны связи: что о ней известно для сравнения сроков. */
export interface DependencyTaskInfo {
  assigneeName?: string | null;
  /** null — статус неизвестен (трекер не ответил). */
  done: boolean | null;
  /** Последний рабочий день карточки на доске, YYYY-MM-DD. */
  plannedEnd?: string;
  /** Первый рабочий день карточки на доске, YYYY-MM-DD. */
  plannedStart?: string;
  sprint?: { name: string; sprintId: number; status?: string };
  statusCategory?: string | null;
  summary?: string | null;
}

type Bucket = 'blocks' | 'relates' | 'waitsFor';

/** Связь трекера с точки зрения задачи: ждёт, блокирует или просто связана. Дубликаты — не зависимость. */
function trackerBucket(link: IssueTrackerIssueLink): Bucket | null {
  switch (link.relationship) {
    case 'blocked_by':
      return 'waitsFor';
    case 'blocks':
      return 'blocks';
    case 'duplicated_by':
    case 'duplicates':
      return null;
    default:
      return 'relates';
  }
}

/**
 * Риск по срокам, только когда ждущая задача не сделана, а та, которую ждут, — тоже: её нигде нет на доске
 * (`not_planned`) или по плану она кончается в день начала ждущей задачи или позже (`ends_after_start`).
 */
function dependencyRisk(
  awaited: DependencyTaskInfo | undefined,
  waiting: DependencyTaskInfo | undefined
): SprintContextDependencyTarget['risk'] {
  if (!awaited || awaited.done === true || waiting?.done === true) {
    return undefined;
  }
  if (!awaited.plannedEnd) {
    return 'not_planned';
  }
  if (waiting?.plannedStart && awaited.plannedEnd >= waiting.plannedStart) {
    return 'ends_after_start';
  }
  return undefined;
}

function toTarget(
  taskId: string,
  info: DependencyTaskInfo | undefined,
  inThisSprint: boolean
): SprintContextDependencyTarget {
  return {
    done: info?.done ?? null,
    inThisSprint,
    taskId,
    via: [],
    ...(info?.summary ? { summary: info.summary } : {}),
    ...(info?.statusCategory ? { statusCategory: info.statusCategory } : {}),
    ...(info?.assigneeName ? { assigneeName: info.assigneeName } : {}),
    ...(info?.sprint && !inThisSprint ? { sprint: info.sprint } : {}),
    ...(info?.plannedStart ? { plannedStart: info.plannedStart } : {}),
    ...(info?.plannedEnd ? { plannedEnd: info.plannedEnd } : {}),
  };
}

type TargetWithBucket = SprintContextDependencyTarget & { bucket: Bucket };

interface DependencyIndex {
  byTask: Map<string, Map<string, TargetWithBucket>>;
  sprintTasks: ReadonlyMap<string, DependencyTaskInfo>;
  infoOf: (taskId: string) => DependencyTaskInfo | undefined;
  /** Задача этого спринта, даже если выпала из sprintTasks фильтром (assigneeId, taskIds). */
  inThisSprint: (taskId: string) => boolean;
}

function addDependency(
  index: DependencyIndex,
  edge: { bucket: Bucket; label?: string; otherId: string; taskId: string; via: 'board' | 'tracker' }
): void {
  const { bucket, otherId, taskId } = edge;
  if (taskId === otherId || !index.sprintTasks.has(taskId)) {
    return;
  }
  const targets = index.byTask.get(taskId) ?? new Map<string, TargetWithBucket>();
  index.byTask.set(taskId, targets);
  const key = `${bucket}:${otherId}`;
  const target = targets.get(key) ?? {
    ...toTarget(otherId, index.infoOf(otherId), index.inThisSprint(otherId)),
    bucket,
  };
  if (!target.via.includes(edge.via)) {
    target.via.push(edge.via);
  }
  if (edge.label && bucket === 'relates') {
    target.label = edge.label;
  }
  targets.set(key, target);
}

function addTrackerLink(index: DependencyIndex, taskId: string, link: IssueTrackerIssueLink): void {
  const bucket = trackerBucket(link);
  const otherId = link.linkedIssueKey?.trim();
  if (!bucket || !otherId) {
    return;
  }
  const label = link.relationship ? undefined : link.relationshipLabel;
  addDependency(index, { bucket, label, otherId, taskId, via: 'tracker' });
}

/** Риск считается у той стороны, которую ждут: у ожидания — другая задача, у «держит» — эта. */
function riskOf(index: DependencyIndex, taskId: string, target: TargetWithBucket): SprintContextDependencyTarget['risk'] {
  const self = index.sprintTasks.get(taskId);
  if (target.bucket === 'waitsFor') {
    return dependencyRisk(index.infoOf(target.taskId), self);
  }
  if (target.bucket === 'blocks') {
    return dependencyRisk(self, index.infoOf(target.taskId));
  }
  return undefined;
}

function toTaskDependencies(
  index: DependencyIndex,
  taskId: string,
  targets: Map<string, TargetWithBucket>
): SprintContextTaskDependencies {
  const entry: SprintContextTaskDependencies = { blocks: [], relates: [], taskId, waitsFor: [] };
  for (const withBucket of targets.values()) {
    const { bucket, ...target } = withBucket;
    const risk = riskOf(index, taskId, withBucket);
    entry[bucket].push(risk ? { ...target, risk } : target);
  }
  return entry;
}

/**
 * Зависимости задач спринта: связи трекера (blocks / blocked_by / relates и свои фразы трекера) и стрелки
 * доски (`from → to`: to ждёт from). У каждой задачи — что она ждёт, кого держит и с чем связана; у
 * ожидания — где стоит другая задача и когда по плану кончается.
 */
export function buildSprintContextDependencies(input: {
  boardArrows: readonly SprintContextTaskLink[];
  /** Задачи вне спринта, на которые ссылаются связи. */
  outside: ReadonlyMap<string, DependencyTaskInfo>;
  /** Tracker sprint id этого спринта: задача вне sprintTasks, но в нём же, — не «вне спринта». */
  sprintId: number;
  /** Задачи спринта (позиции и бэклог спринта). */
  sprintTasks: ReadonlyMap<string, DependencyTaskInfo>;
  trackerLinks: Readonly<Record<string, readonly IssueTrackerIssueLink[]>>;
}): SprintContextDependencies {
  const index: DependencyIndex = {
    byTask: new Map(),
    infoOf: (taskId) => input.sprintTasks.get(taskId) ?? input.outside.get(taskId),
    inThisSprint: (taskId) =>
      input.sprintTasks.has(taskId) || input.outside.get(taskId)?.sprint?.sprintId === input.sprintId,
    sprintTasks: input.sprintTasks,
  };
  for (const [taskId, links] of Object.entries(input.trackerLinks)) {
    links.forEach((link) => addTrackerLink(index, taskId, link));
  }
  for (const arrow of input.boardArrows) {
    addDependency(index, { bucket: 'waitsFor', otherId: arrow.fromTaskId, taskId: arrow.toTaskId, via: 'board' });
    addDependency(index, { bucket: 'blocks', otherId: arrow.toTaskId, taskId: arrow.fromTaskId, via: 'board' });
  }
  const tasks = [...index.byTask]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([taskId, targets]) => toTaskDependencies(index, taskId, targets));
  const waitingOutside = tasks.flatMap((task) => {
    const open = task.waitsFor.filter((target) => !target.inThisSprint && target.done !== true);
    return open.length > 0 ? [{ taskId: task.taskId, waitsFor: open.map((target) => target.taskId) }] : [];
  });
  return { tasks, waitingOutside };
}
