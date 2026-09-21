import { describe, expect, it } from 'vitest';

import {
  isMainPageLoadingGatePending,
  isSprintPositionsGatePending,
  resolveShowFullScreenLoadingFromGates,
} from './mainPageClientLoadingHelpers';

describe('isSprintPositionsGatePending', () => {
  it('is idle when no sprint is selected', () => {
    expect(
      isSprintPositionsGatePending({
        positionsLoadPending: true,
        positionsSettledSprintId: null,
        selectedSprintId: null,
      })
    ).toBe(false);
  });

  it('waits until the selected sprint has a settled positions fetch', () => {
    expect(
      isSprintPositionsGatePending({
        positionsLoadPending: false,
        positionsSettledSprintId: null,
        selectedSprintId: 1974,
      })
    ).toBe(true);
  });

  it('waits while a positions fetch is in flight', () => {
    expect(
      isSprintPositionsGatePending({
        positionsLoadPending: true,
        positionsSettledSprintId: 1974,
        selectedSprintId: 1974,
      })
    ).toBe(true);
  });

  it('is idle when positions for the selected sprint have settled', () => {
    expect(
      isSprintPositionsGatePending({
        positionsLoadPending: false,
        positionsSettledSprintId: 1974,
        selectedSprintId: 1974,
      })
    ).toBe(false);
  });
});

describe('isMainPageLoadingGatePending', () => {
  const ready = {
    positionsPending: false,
    selectedBoardId: 381 as number | null,
    selectedSprintId: 1974 as number | null,
    sprintsLoading: false,
    tasksPending: false,
  };

  it('waits for the sprints list when a board is selected', () => {
    expect(isMainPageLoadingGatePending({ ...ready, sprintsLoading: true })).toBe(true);
  });

  it('waits for sprint tasks when a sprint is selected', () => {
    expect(isMainPageLoadingGatePending({ ...ready, tasksPending: true })).toBe(true);
  });

  it('does not wait for tasks when no sprint is selected', () => {
    expect(
      isMainPageLoadingGatePending({
        ...ready,
        selectedSprintId: null,
        tasksPending: true,
      })
    ).toBe(false);
  });

  it('waits for swimlane positions before showing the board', () => {
    expect(isMainPageLoadingGatePending({ ...ready, positionsPending: true })).toBe(true);
  });

  it('is idle when tasks, positions and sprints are ready', () => {
    expect(isMainPageLoadingGatePending(ready)).toBe(false);
  });
});

describe('resolveShowFullScreenLoadingFromGates', () => {
  const idleGates = {
    activeTab: 'board' as const,
    boardsLoading: false,
    boardSwitchPending: false,
    isMounted: true,
    selectedBoardId: 377 as number | null,
    sprintBoardGatesPending: false,
  };

  it('shows overlay immediately while a board switch is in flight', () => {
    expect(
      resolveShowFullScreenLoadingFromGates({
        ...idleGates,
        boardSwitchPending: true,
      })
    ).toBe(true);
  });

  it('shows overlay during board switch even on non-board tabs', () => {
    expect(
      resolveShowFullScreenLoadingFromGates({
        ...idleGates,
        activeTab: 'backlog',
        boardSwitchPending: true,
      })
    ).toBe(true);
  });

  it('does not wait for mount or boards list before showing board-switch overlay', () => {
    expect(
      resolveShowFullScreenLoadingFromGates({
        ...idleGates,
        boardSwitchPending: true,
        boardsLoading: true,
        isMounted: false,
      })
    ).toBe(true);
  });

  it('hides overlay on non-board tabs when nothing else is pending', () => {
    expect(
      resolveShowFullScreenLoadingFromGates({
        ...idleGates,
        activeTab: 'backlog',
      })
    ).toBe(false);
  });

  it('keeps overlay while sprint board gates are pending', () => {
    expect(
      resolveShowFullScreenLoadingFromGates({
        ...idleGates,
        sprintBoardGatesPending: true,
      })
    ).toBe(true);
  });

  it('does not wait for boards list when a board id is already known', () => {
    expect(
      resolveShowFullScreenLoadingFromGates({
        ...idleGates,
        boardsLoading: true,
        selectedBoardId: 377,
      })
    ).toBe(false);
  });

  it('waits for boards list when no board is selected yet', () => {
    expect(
      resolveShowFullScreenLoadingFromGates({
        ...idleGates,
        boardsLoading: true,
        selectedBoardId: null,
      })
    ).toBe(true);
  });
});
