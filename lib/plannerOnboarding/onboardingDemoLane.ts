import type { Developer, Task, TaskLink, TaskPosition } from '@/types';

import { isTeamSwimlaneAssigneeId } from '@/lib/swimlane/teamSwimlaneAssignee';

export const ONBOARDING_ASSIGNEE_ID = 'onboarding-pivchik';
const ONBOARDING_SECOND_ASSIGNEE_ID = 'onboarding-slivchik';
export const ONBOARDING_SAMPLE_TASK_ID = 'onboarding-pivchik-task';
const ONBOARDING_SECOND_SAMPLE_TASK_ID = 'onboarding-slivchik-task';
export const ONBOARDING_SAMPLE_TASK_KEY = 'BT-1';
const ONBOARDING_SECOND_SAMPLE_TASK_KEY = 'BT-2';
export const ONBOARDING_DEMO_LINK_ID = 'onboarding-demo-link';
/** На сколько частей дня карточка уезжает вперёд на шаге перетаскивания. */
export const ONBOARDING_DRAG_SHIFT_PARTS = 2;

function createOnboardingAssignee(id: string, name: string): Developer {
  return { id, name, role: 'other' };
}

export function isOnboardingDemoAssigneeId(id: string): boolean {
  return id === ONBOARDING_ASSIGNEE_ID || id === ONBOARDING_SECOND_ASSIGNEE_ID;
}

export function isOnboardingSampleTaskId(taskId: string): boolean {
  return taskId === ONBOARDING_SAMPLE_TASK_ID || taskId === ONBOARDING_SECOND_SAMPLE_TASK_ID;
}

/** Маркер строки для обводки тура. У настоящей строки маркера нет. */
export function onboardingAssigneeMarker(id: string): 'pivchik' | 'slivchik' | null {
  if (id === ONBOARDING_ASSIGNEE_ID) {
    return 'pivchik';
  }
  if (id === ONBOARDING_SECOND_ASSIGNEE_ID) {
    return 'slivchik';
  }
  return null;
}

/** Демо-строки сразу под общей. Вторая строка — на шагах переноса и связи. */
export function insertOnboardingAssigneeRow(
  rows: readonly Developer[],
  includeSecondRow = false,
  names: { assigneeName: string; secondAssigneeName: string }
): Developer[] {
  const withoutDemo = rows.filter((row) => !isOnboardingDemoAssigneeId(row.id));
  const pivchik = createOnboardingAssignee(ONBOARDING_ASSIGNEE_ID, names.assigneeName);
  const demoRows = includeSecondRow
    ? [
        pivchik,
        createOnboardingAssignee(ONBOARDING_SECOND_ASSIGNEE_ID, names.secondAssigneeName),
      ]
    : [pivchik];
  const teamIndex = withoutDemo.findIndex((row) => isTeamSwimlaneAssigneeId(row.id));
  if (teamIndex < 0) {
    return [...demoRows, ...withoutDemo];
  }
  return [
    ...withoutDemo.slice(0, teamIndex + 1),
    ...demoRows,
    ...withoutDemo.slice(teamIndex + 1),
  ];
}

export function pickOnboardingSampleDayIndex(
  dayCount: number,
  isToday: (dayIndex: number) => boolean
): number {
  const count = Math.max(0, dayCount);
  for (let dayIndex = 0; dayIndex < count; dayIndex += 1) {
    if (isToday(dayIndex)) {
      return dayIndex;
    }
  }
  return 0;
}

export function buildOnboardingSampleTask(taskName: string): Task {
  return buildDemoTask(ONBOARDING_SAMPLE_TASK_ID, ONBOARDING_SAMPLE_TASK_KEY, taskName);
}

function buildDemoTask(id: string, key: string, taskName: string): Task {
  return {
    id,
    link: '',
    name: taskName,
    originalTaskId: key,
    status: 'todo',
    team: 'Web',
    type: 'task',
  };
}

function buildOnboardingDemoLink(): TaskLink {
  return {
    fromTaskId: ONBOARDING_SAMPLE_TASK_ID,
    id: ONBOARDING_DEMO_LINK_ID,
    toTaskId: ONBOARDING_SECOND_SAMPLE_TASK_ID,
  };
}

/** Если слой связей выключен, на шаге тура всё равно рисуем учебную стрелку. */
export function taskLinksForOnboardingArrows(
  showUserLinks: boolean,
  links: readonly TaskLink[]
): TaskLink[] {
  if (showUserLinks) {
    return [...links];
  }
  return links.filter((link) => link.id === ONBOARDING_DEMO_LINK_ID);
}

export function buildOnboardingSamplePosition(
  dayIndex: number,
  durationParts: number,
  startPart = 0
): TaskPosition {
  return {
    assignee: ONBOARDING_ASSIGNEE_ID,
    duration: durationParts,
    startDay: dayIndex,
    startPart,
    taskId: ONBOARDING_SAMPLE_TASK_ID,
  };
}

/** Чтобы меню демо-карточки видело позицию и показывало те же пункты, что у задачи на доске. */
export function withOnboardingMenuPosition(
  positions: Map<string, TaskPosition> | undefined,
  durationParts: number
): Map<string, TaskPosition> {
  const next = new Map(positions);
  next.set(
    ONBOARDING_SAMPLE_TASK_ID,
    buildOnboardingSamplePosition(0, durationParts, next.get(ONBOARDING_SAMPLE_TASK_ID)?.startPart ?? 0)
  );
  return next;
}

/** Вторая карточка стоит минимум на день правее первой, чтобы стрелка шла по диагонали. */
export function resolveOnboardingLinkedCardStart(input: {
  dayCount: number;
  dayIndex: number;
  durationParts: number;
  partsPerDay: number;
  startPart: number;
}): { startDay: number; startPart: number } {
  const partsPerDay = Math.max(1, input.partsPerDay);
  const durationParts = Math.max(1, input.durationParts);
  const span = Math.max(1, input.dayCount) * partsPerDay;
  const firstStart = Math.max(0, input.dayIndex) * partsPerDay + Math.max(0, input.startPart);
  const maxStart = Math.max(0, span - durationParts);
  const secondStart = Math.min(maxStart, firstStart + durationParts + partsPerDay);
  return {
    startDay: Math.floor(secondStart / partsPerDay),
    startPart: secondStart % partsPerDay,
  };
}

export function withOnboardingSample(input: {
  dayCount?: number;
  dayIndex: number;
  durationParts: number;
  includeSecondCard?: boolean;
  partsPerDay?: number;
  positions: ReadonlyMap<string, TaskPosition>;
  startPart?: number;
  taskName: string;
  tasks: ReadonlyMap<string, Task>;
}): { link: TaskLink | null; positions: Map<string, TaskPosition>; tasks: Map<string, Task> } {
  const task = buildOnboardingSampleTask(input.taskName);
  const positions = new Map(input.positions);
  const tasks = new Map(input.tasks);
  const startPart = input.startPart ?? 0;
  positions.set(
    task.id,
    buildOnboardingSamplePosition(input.dayIndex, input.durationParts, startPart)
  );
  tasks.set(task.id, task);
  if (!input.includeSecondCard) {
    return { link: null, positions, tasks };
  }
  const second = buildDemoTask(
    ONBOARDING_SECOND_SAMPLE_TASK_ID,
    ONBOARDING_SECOND_SAMPLE_TASK_KEY,
    input.taskName
  );
  const linkedStart = resolveOnboardingLinkedCardStart({
    dayCount: input.dayCount ?? input.dayIndex + 2,
    dayIndex: input.dayIndex,
    durationParts: input.durationParts,
    partsPerDay: input.partsPerDay ?? input.durationParts,
    startPart,
  });
  positions.set(second.id, {
    assignee: ONBOARDING_SECOND_ASSIGNEE_ID,
    duration: input.durationParts,
    startDay: linkedStart.startDay,
    startPart: linkedStart.startPart,
    taskId: second.id,
  });
  tasks.set(second.id, second);
  return { link: buildOnboardingDemoLink(), positions, tasks };
}
