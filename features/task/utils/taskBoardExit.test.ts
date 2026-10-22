import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getTaskBoardExitSnapshot,
  playTaskBoardExit,
  resolveTaskBoardExit,
  TASK_BOARD_EXIT_MS,
  taskBoardExitClassName,
} from './taskBoardExit';

function stubReducedMotion(reduce: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce') }));
}

describe('playTaskBoardExit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps the card on the board while the exit plays, then removes it', async () => {
    stubReducedMotion(false);
    const onDone = vi.fn();
    const played = playTaskBoardExit(['T-1', 'T-1-qa'], 'backlog', onDone);

    expect(getTaskBoardExitSnapshot().get('T-1')).toBe('backlog');
    expect(getTaskBoardExitSnapshot().get('T-1-qa')).toBe('backlog');
    expect(onDone).not.toHaveBeenCalled();

    vi.advanceTimersByTime(TASK_BOARD_EXIT_MS);
    await played;
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(getTaskBoardExitSnapshot().size).toBe(0);
  });

  it('removes the card right away with reduced motion', () => {
    stubReducedMotion(true);
    const onDone = vi.fn();
    void playTaskBoardExit(['T-1'], 'sprint', onDone);

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(getTaskBoardExitSnapshot().size).toBe(0);
  });

  it('builds the exit class name', () => {
    expect(taskBoardExitClassName(undefined)).toBe('');
    expect(taskBoardExitClassName('sprint')).toBe(
      ' task-board-exit task-board-exit-sprint'
    );
  });
});

describe('resolveTaskBoardExit', () => {
  it('takes the QA card along when its dev task leaves the sprint', () => {
    const exits = new Map([['DEV-1', 'backlog' as const]]);
    expect(resolveTaskBoardExit(exits, 'DEV-1-qa', 'DEV-1')).toBe('backlog');
  });

  it('keeps the QA card when only the dev card is removed from the plan', () => {
    const exits = new Map([['DEV-1', 'plan' as const]]);
    expect(resolveTaskBoardExit(exits, 'DEV-1-qa', 'DEV-1')).toBeUndefined();
    expect(resolveTaskBoardExit(exits, 'DEV-1')).toBe('plan');
  });
});
