import type { DemoFixtureState } from './demoFixtureSeed';

import { createDemoFixtureSeed } from './demoFixtureSeed';

let state: DemoFixtureState = createDemoFixtureSeed();

export function getDemoFixtureStore(): DemoFixtureState {
  return state;
}

export function resetDemoFixtureStore(): void {
  state = createDemoFixtureSeed();
}

export function replaceDemoRetroBoard(sprintId: number, board: DemoFixtureState['retroBoards'][string]): void {
  state.retroBoards[String(sprintId)] = board;
}

export function replaceDemoPositions(rows: DemoFixtureState['positions']): void {
  state.positions = rows;
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
