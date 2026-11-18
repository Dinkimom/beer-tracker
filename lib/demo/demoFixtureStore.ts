import type { DemoFixtureState } from './demoFixtureSeed';
import type { Task } from '@/types';

import { createDemoFixtureSeed } from './demoFixtureSeed';
import { applyDemoStressVariant, type DemoFixtureVariant } from './demoFixtureStress';
import { DEMO_SPRINT_NEXT_ID } from './demoIds';

/** Вариант фикстуры из адреса страницы (`?fixture=stress`); на сервере — обычный. */
function variantFromLocation(): DemoFixtureVariant {
  if (typeof window === 'undefined') return 'default';
  return new URLSearchParams(window.location.search).get('fixture') === 'stress' ? 'stress' : 'default';
}

function createState(variant: DemoFixtureVariant): DemoFixtureState {
  const seed = createDemoFixtureSeed();
  return variant === 'stress' ? applyDemoStressVariant(seed) : seed;
}

const variant = variantFromLocation();
let state: DemoFixtureState = createState(variant);

export function getDemoFixtureStore(): DemoFixtureState {
  return state;
}

export function resetDemoFixtureStore(): void {
  state = createState(variant);
}

/** Задачи спринта. Прошлый (архивный) спринт по-прежнему показывает задачи текущего. */
export function getDemoSprintTasks(sprintId: number): Task[] {
  return sprintId === DEMO_SPRINT_NEXT_ID ? state.nextSprintTasks : state.tasks;
}

/**
 * Перенести задачу в спринт (`sprintId`) или в бэклог (`null`).
 * Возвращает false, если задачи нет в фикстуре.
 */
export function moveDemoIssueToSprint(issueKey: string, sprintId: number | null): boolean {
  const issue = [...state.tasks, ...state.nextSprintTasks, ...state.backlogTasks].find(
    (t) => t.id === issueKey
  );
  if (!issue) return false;
  const without = (list: Task[]) => list.filter((t) => t.id !== issueKey);
  state.tasks = without(state.tasks);
  state.nextSprintTasks = without(state.nextSprintTasks);
  state.backlogTasks = without(state.backlogTasks);
  if (sprintId == null) {
    state.backlogTasks = [...state.backlogTasks, issue];
  } else if (sprintId === DEMO_SPRINT_NEXT_ID) {
    state.nextSprintTasks = [...state.nextSprintTasks, issue];
  } else {
    state.tasks = [...state.tasks, issue];
  }
  return true;
}

export function replaceDemoRetroBoard(sprintId: number, board: DemoFixtureState['retroBoards'][string]): void {
  state.retroBoards[String(sprintId)] = board;
}

export function replaceDemoPositions(rows: DemoFixtureState['positions']): void {
  state.positions = rows;
}

export function writeDemoLaneLayers(layers: ReadonlyArray<{ cardId: string; layer: number | null }>): void {
  const next = { ...state.laneLayers };
  for (const { cardId, layer } of layers) {
    if (layer == null) {
      delete next[cardId];
    } else {
      next[cardId] = layer;
    }
  }
  state.laneLayers = next;
}

export function replaceDemoFeatureLanes(lanes: DemoFixtureState['featureLanes']): void {
  state.featureLanes = lanes;
}

export function upsertDemoPosition(row: DemoFixtureState['positions'][number]): void {
  const idx = state.positions.findIndex(
    (p) => p.task_id === row.task_id && Boolean(p.is_qa) === Boolean(row.is_qa)
  );
  if (idx >= 0) {
    state.positions[idx] = row;
  } else {
    state.positions.push(row);
  }
}

export function removeDemoPosition(taskId: string, isQa?: boolean): void {
  state.positions = state.positions.filter((p) => {
    if (p.task_id !== taskId) return true;
    if (isQa === undefined) return false;
    return Boolean(p.is_qa) !== isQa;
  });
}

export function upsertDemoComment(row: DemoFixtureState['comments'][number]): void {
  const idx = state.comments.findIndex((c) => c.id === row.id);
  if (idx >= 0) {
    state.comments[idx] = row;
  } else {
    state.comments.push(row);
  }
}

export function removeDemoComment(commentId: string): void {
  state.comments = state.comments.filter((c) => c.id !== commentId);
}
