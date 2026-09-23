import type { Task, TaskPosition } from '@/types';

import { WORKING_DAYS, getPartsPerDay } from '@/constants';

export type PlannerHotPathDensity = 'dense' | 'sparse';

export interface PlannerHotPathSprint {
  assigneeIds: string[];
  currentCell: number;
  qaTasksMap: Map<string, Task>;
  taskCount: number;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  tasksMap: Map<string, Task>;
  workingDaysCount: number;
}

interface BuildPlannerHotPathSprintInput {
  density: PlannerHotPathDensity;
  taskCount: number;
  workingDaysCount?: number;
}

const DENSE_ASSIGNEE_COUNT = 2;
const SPARSE_ASSIGNEE_COUNT = 8;
const BASELINE_CURRENT_CELL = 20;
const QA_EVERY = 8;
const MULTI_SEGMENT_EVERY = 11;
const IN_PROGRESS_EVERY = 5;

function totalCells(workingDaysCount: number): number {
  return Math.max(1, workingDaysCount) * getPartsPerDay();
}

function splitCell(cell: number, cellCount: number): { startDay: number; startPart: number } {
  const normalized = ((cell % cellCount) + cellCount) % cellCount;
  return {
    startDay: Math.floor(normalized / getPartsPerDay()),
    startPart: normalized % getPartsPerDay(),
  };
}

function assigneeCountFor(density: PlannerHotPathDensity): number {
  return density === 'dense' ? DENSE_ASSIGNEE_COUNT : SPARSE_ASSIGNEE_COUNT;
}

function buildAssigneeIds(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `dev-${index}`);
}

function isQaIndex(index: number): boolean {
  return index > 0 && index % QA_EVERY === QA_EVERY - 1;
}

function placementForIndex(
  index: number,
  density: PlannerHotPathDensity,
  cellCount: number
): { duration: number; startCell: number } {
  if (density === 'dense') {
    return {
      duration: 5,
      startCell: (index * 2) % Math.max(1, cellCount - 5),
    };
  }
  return {
    duration: 2,
    startCell: (Math.floor(index / SPARSE_ASSIGNEE_COUNT) * 2) % Math.max(1, cellCount - 2),
  };
}

function buildSegments(
  startCell: number,
  duration: number,
  cellCount: number,
  useMultiSegment: boolean
): TaskPosition['segments'] {
  if (!useMultiSegment || duration < 2) {
    return undefined;
  }
  const first = splitCell(startCell, cellCount);
  const second = splitCell(startCell + 2, cellCount);
  return [
    { duration: 1, startDay: first.startDay, startPart: first.startPart },
    { duration: 1, startDay: second.startDay, startPart: second.startPart },
  ];
}

function buildTask(index: number, isQa: boolean): Task {
  const id = `TASK-${index}`;
  if (isQa) {
    return {
      id,
      link: '',
      name: id,
      originalTaskId: `TASK-${index - 1}`,
      status: 'todo',
      team: 'QA',
      testPoints: 1,
    };
  }
  return {
    id,
    link: '',
    name: id,
    status: index % IN_PROGRESS_EVERY === 0 ? 'in-progress' : 'todo',
    storyPoints: 1 + (index % 5),
    team: 'Web',
    testPoints: index % 3,
  };
}

function buildPosition(
  taskId: string,
  assignee: string,
  startCell: number,
  duration: number,
  cellCount: number,
  useMultiSegment: boolean
): TaskPosition {
  const { startDay, startPart } = splitCell(startCell, cellCount);
  return {
    assignee,
    duration,
    segments: buildSegments(startCell, duration, cellCount, useMultiSegment),
    startDay,
    startPart,
    taskId,
  };
}

/**
 * Синтетический спринт для бенчмарков раскладки слоёв, занятости и геометрии DnD.
 * Живой спринт в среднем ~80–100 карточек.
 * dense — 2 дорожки и сильные пересечения; sparse — 8 дорожек.
 */
export function buildPlannerHotPathSprint(
  input: BuildPlannerHotPathSprintInput
): PlannerHotPathSprint {
  const workingDaysCount = input.workingDaysCount ?? WORKING_DAYS;
  const cellCount = totalCells(workingDaysCount);
  const assignees = buildAssigneeIds(assigneeCountFor(input.density));
  const tasks: Task[] = [];
  const taskPositions = new Map<string, TaskPosition>();
  const tasksMap = new Map<string, Task>();
  const qaTasksMap = new Map<string, Task>();

  for (let index = 0; index < input.taskCount; index++) {
    const isQa = isQaIndex(index);
    const task = buildTask(index, isQa);
    const assignee = assignees[index % assignees.length]!;
    const { duration, startCell } = placementForIndex(index, input.density, cellCount);
    const position = buildPosition(
      task.id,
      assignee,
      startCell,
      duration,
      cellCount,
      index % MULTI_SEGMENT_EVERY === 0
    );
    tasks.push(task);
    tasksMap.set(task.id, task);
    taskPositions.set(task.id, position);
    if (isQa && task.originalTaskId) {
      qaTasksMap.set(task.originalTaskId, task);
    }
  }

  return {
    assigneeIds: assignees,
    currentCell: BASELINE_CURRENT_CELL,
    qaTasksMap,
    taskCount: input.taskCount,
    taskPositions,
    tasks,
    tasksMap,
    workingDaysCount,
  };
}
