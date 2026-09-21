import type { Task, TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  computeSwimlaneRowBandBox,
  resolveSwimlaneStackedTaskBandHeightPx,
  SWIMLANE_TASK_ROW_VERTICAL_INSET_PX,
} from '@/features/swimlane/utils/taskLayerTaskLayout';

import {
  applyRemotePresenceCardRowPreviews,
  applyRemotePresencePositionToDeveloperTasks,
  computeSwimlaneLayoutDimensions,
  computeSwimlanePointTotals,
} from './useSwimlaneLayoutHelpers';

const SINGLE_ROW_HEIGHT = 82;
const ONE_CARD_HEIGHT_PX = SINGLE_ROW_HEIGHT - SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2;

describe('computeSwimlanePointTotals', () => {
  it('ignores quick-add chooser and non-task drafts in participant volume', () => {
    const positionedTasks: Array<{ task: Task; position: TaskPosition }> = [
      {
        position: {
          assignee: 'dev-1',
          duration: 1,
          startDay: 0,
          startPart: 0,
          taskId: 'ISSUE-1',
        },
        task: { id: 'ISSUE-1', link: '', name: 'Issue', storyPoints: 5, team: 'Back' },
      },
      {
        position: {
          assignee: 'dev-1',
          duration: 1,
          startDay: 1,
          startPart: 0,
          taskId: 'local-task-1',
        },
        task: {
          id: 'local-task-1',
          isLocalTask: true,
          link: '',
          name: '',
          storyPoints: 0,
          team: 'Back',
        },
      },
      {
        position: {
          assignee: 'dev-1',
          duration: 1,
          startDay: 2,
          startPart: 0,
          taskId: 'local-task-2',
        },
        task: {
          id: 'local-task-2',
          isLocalTask: true,
          link: '',
          localDraftKind: 'task',
          name: '',
          storyPoints: 1,
          team: 'Back',
        },
      },
    ];

    expect(computeSwimlanePointTotals(positionedTasks)).toEqual({
      completedSP: 0,
      completedTP: 0,
      hasVolumeTasks: true,
      totalSP: 6,
      totalTP: 0,
    });
  });

  it('counts SP and TP from the original task on one row', () => {
    const positionedTasks: Array<{ task: Task; position: TaskPosition }> = [
      {
        position: {
          assignee: 'feature-1',
          duration: 3,
          startDay: 0,
          startPart: 0,
          taskId: 'ISSUE-1',
        },
        task: {
          id: 'ISSUE-1',
          link: '',
          name: 'Issue',
          storyPoints: 5,
          team: 'Back',
          testPoints: 3,
        },
      },
    ];

    expect(computeSwimlanePointTotals(positionedTasks)).toEqual({
      completedSP: 0,
      completedTP: 0,
      hasVolumeTasks: true,
      totalSP: 5,
      totalTP: 3,
    });
  });

  it('does not double-count TP when the QA phantom sits on the same row', () => {
    const positionedTasks: Array<{ task: Task; position: TaskPosition }> = [
      {
        position: {
          assignee: 'feature-1',
          duration: 3,
          startDay: 0,
          startPart: 0,
          taskId: 'ISSUE-1',
        },
        task: {
          id: 'ISSUE-1',
          link: '',
          name: 'Issue',
          storyPoints: 5,
          team: 'Back',
          testPoints: 3,
        },
      },
      {
        position: {
          assignee: 'feature-1',
          duration: 3,
          startDay: 1,
          startPart: 0,
          taskId: 'ISSUE-1-qa',
        },
        task: {
          id: 'ISSUE-1-qa',
          link: '',
          name: '[QA] Issue',
          originalTaskId: 'ISSUE-1',
          storyPoints: 0,
          team: 'QA',
          testPoints: 3,
        },
      },
    ];

    expect(computeSwimlanePointTotals(positionedTasks)).toEqual({
      completedSP: 0,
      completedTP: 0,
      hasVolumeTasks: true,
      totalSP: 5,
      totalTP: 3,
    });
  });

  it('still counts TP from a QA-only row', () => {
    const positionedTasks: Array<{ task: Task; position: TaskPosition }> = [
      {
        position: {
          assignee: 'qa-1',
          duration: 3,
          startDay: 0,
          startPart: 0,
          taskId: 'ISSUE-1-qa',
        },
        task: {
          id: 'ISSUE-1-qa',
          link: '',
          name: '[QA] Issue',
          originalTaskId: 'ISSUE-1',
          storyPoints: 0,
          team: 'QA',
          testPoints: 3,
        },
      },
    ];

    expect(computeSwimlanePointTotals(positionedTasks)).toEqual({
      completedSP: 0,
      completedTP: 0,
      hasVolumeTasks: true,
      totalSP: 0,
      totalTP: 3,
    });
  });

  it('does not treat notes-only rows as having volume work', () => {
    expect(
      computeSwimlanePointTotals([
        {
          position: {
            assignee: 'dev-1',
            duration: 2,
            startDay: 0,
            startPart: 0,
            taskId: 'comment:c1',
          },
          task: {
            id: 'comment:c1',
            link: '',
            localDraftKind: 'comment',
            name: 'заметка',
            storyPoints: 0,
            team: 'Back',
          },
        },
      ])
    ).toEqual({
      completedSP: 0,
      completedTP: 0,
      hasVolumeTasks: false,
      totalSP: 0,
      totalTP: 0,
    });
  });

  it('marks a row with tasks but no points as having work', () => {
    expect(
      computeSwimlanePointTotals([
        {
          position: {
            assignee: 'feature-1',
            duration: 1,
            startDay: 0,
            startPart: 0,
            taskId: 'ISSUE-1',
          },
          task: {
            id: 'ISSUE-1',
            link: '',
            name: 'Issue',
            storyPoints: 0,
            team: 'Back',
            testPoints: 0,
          },
        },
      ])
    ).toEqual({
      completedSP: 0,
      completedTP: 0,
      hasVolumeTasks: true,
      totalSP: 0,
      totalTP: 0,
    });
  });
});

describe('computeSwimlaneLayoutDimensions', () => {
  it('uses the default row height without extra bottom padding', () => {
    const layout = computeSwimlaneLayoutDimensions({
      baselineLayerMap: new Map(),
      showParent: false,
      taskLayerMap: new Map([['QUEUE-1', 0]]),
    });

    expect(layout.totalHeight).toBe(SINGLE_ROW_HEIGHT);
    expect(layout.taskBandTotalHeight).toBe(SINGLE_ROW_HEIGHT);
    expect(layout.taskBandVisualHeight).toBe(SINGLE_ROW_HEIGHT);
    expect(layout.layerHeight).toBe(SINGLE_ROW_HEIGHT);
    expect(layout.hasTaskOverlaps).toBe(false);
  });

  it('grows the row to two card heights for a two-slot photo without stacking', () => {
    const layout = computeSwimlaneLayoutDimensions({
      baselineLayerMap: new Map(),
      showParent: false,
      taskLayerMap: new Map([['local-image:1', 0]]),
      taskLayerSpanById: new Map([['local-image:1', 2]]),
    });

    expect(layout.hasTaskOverlaps).toBe(false);
    expect(layout.taskBandTotalHeight).toBe(SINGLE_ROW_HEIGHT);
    expect(layout.taskBandVisualHeight).toBe(
      ONE_CARD_HEIGHT_PX * 2 + SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2
    );
    expect(layout.totalHeight).toBe(
      ONE_CARD_HEIGHT_PX * 2 + SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2
    );
  });

  it('grows the row to two card heights for a two-row sticky note without stacking', () => {
    const layout = computeSwimlaneLayoutDimensions({
      baselineLayerMap: new Map(),
      showParent: false,
      taskLayerMap: new Map([['comment:1', 0]]),
      taskVerticalLayoutById: new Map([['comment:1', { layerShiftUp: 0, span: 2 }]]),
    });

    expect(layout.hasTaskOverlaps).toBe(false);
    expect(layout.taskBandTotalHeight).toBe(SINGLE_ROW_HEIGHT);
    expect(layout.taskBandVisualHeight).toBe(
      ONE_CARD_HEIGHT_PX * 2 + SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2
    );
    expect(layout.totalHeight).toBe(
      ONE_CARD_HEIGHT_PX * 2 + SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2
    );
  });

  it('grows the row to two card heights for a photo with local vertical override', () => {
    const layout = computeSwimlaneLayoutDimensions({
      baselineLayerMap: new Map(),
      showParent: false,
      taskLayerMap: new Map([['local-image:1', 0]]),
      taskVerticalLayoutById: new Map([['local-image:1', { layerShiftUp: 0, span: 2 }]]),
    });

    expect(layout.hasTaskOverlaps).toBe(false);
    expect(layout.taskBandTotalHeight).toBe(SINGLE_ROW_HEIGHT);
    expect(layout.taskBandVisualHeight).toBe(
      ONE_CARD_HEIGHT_PX * 2 + SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2
    );
    expect(layout.totalHeight).toBe(
      ONE_CARD_HEIGHT_PX * 2 + SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2
    );
  });

  it('grows the row to three card heights for a three-slot photo without stacking', () => {
    const layout = computeSwimlaneLayoutDimensions({
      baselineLayerMap: new Map(),
      showParent: false,
      taskLayerMap: new Map([['local-image:1', 0]]),
      taskLayerSpanById: new Map([['local-image:1', 3]]),
    });

    expect(layout.hasTaskOverlaps).toBe(false);
    expect(layout.taskBandTotalHeight).toBe(SINGLE_ROW_HEIGHT);
    expect(layout.taskBandVisualHeight).toBe(
      ONE_CARD_HEIGHT_PX * 3 + SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2
    );
    expect(layout.totalHeight).toBe(
      ONE_CARD_HEIGHT_PX * 3 + SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2
    );
  });

  it('includes photo span and stacked cards in the row height', () => {
    const layout = computeSwimlaneLayoutDimensions({
      baselineLayerMap: new Map(),
      showParent: false,
      taskLayerMap: new Map([
        ['QUEUE-1', 0],
        ['local-image:1', 1],
        ['comment:1', 3],
      ]),
      taskLayerSpanById: new Map([
        ['QUEUE-1', 1],
        ['local-image:1', 2],
        ['comment:1', 1],
      ]),
    });

    expect(layout.hasTaskOverlaps).toBe(true);
    expect(layout.maxTaskLayers).toBe(4);
    expect(layout.layerHeight).toBe(ONE_CARD_HEIGHT_PX);
    expect(layout.taskBandTotalHeight).toBe(resolveSwimlaneStackedTaskBandHeightPx(4, ONE_CARD_HEIGHT_PX));
    expect(layout.taskBandVisualHeight).toBe(resolveSwimlaneStackedTaskBandHeightPx(4, ONE_CARD_HEIGHT_PX));
    expect(layout.totalHeight).toBe(resolveSwimlaneStackedTaskBandHeightPx(4, ONE_CARD_HEIGHT_PX));
  });

  it('grows a single-row lane like a photo when hover needs two card rows', () => {
    const layout = computeSwimlaneLayoutDimensions({
      baselineLayerMap: new Map(),
      previewSpanLayers: 2,
      showParent: false,
      taskLayerMap: new Map([['QUEUE-1', 0]]),
    });

    expect(layout.hasTaskOverlaps).toBe(false);
    expect(layout.maxTaskLayers).toBe(2);
    expect(layout.totalHeight).toBe(
      ONE_CARD_HEIGHT_PX * 2 + SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2
    );
  });

  it('uses stacked height when hover plus starts below a two-row photo lane', () => {
    const layout = computeSwimlaneLayoutDimensions({
      baselineLayerMap: new Map(),
      minTaskLayers: 3,
      showParent: false,
      taskLayerMap: new Map([['local-image:1', 0]]),
      taskLayerSpanById: new Map([['local-image:1', 2]]),
    });

    expect(layout.contentMaxTaskLayers).toBe(2);
    expect(layout.maxTaskLayers).toBe(3);
    expect(layout.hasTaskOverlaps).toBe(false);
    expect(layout.totalHeight).toBe(resolveSwimlaneStackedTaskBandHeightPx(3, ONE_CARD_HEIGHT_PX));
  });

  it('grows the row when the user reserved extra empty task layers', () => {
    const layout = computeSwimlaneLayoutDimensions({
      baselineLayerMap: new Map(),
      minTaskLayers: 3,
      showParent: false,
      taskLayerMap: new Map([['QUEUE-1', 0]]),
    });

    expect(layout.contentMaxTaskLayers).toBe(1);
    expect(layout.maxTaskLayers).toBe(3);
    expect(layout.hasTaskOverlaps).toBe(false);
    expect(layout.totalHeight).toBe(resolveSwimlaneStackedTaskBandHeightPx(3, ONE_CARD_HEIGHT_PX));
  });

  it('keeps the first-layer card height when a second layer is added', () => {
    const single = computeSwimlaneLayoutDimensions({
      baselineLayerMap: new Map(),
      showParent: false,
      taskLayerMap: new Map([['QUEUE-1', 0]]),
    });
    const stacked = computeSwimlaneLayoutDimensions({
      baselineLayerMap: new Map(),
      showParent: false,
      taskLayerMap: new Map([
        ['QUEUE-1', 0],
        ['local-task-draft', 1],
      ]),
    });
    const singleCard = computeSwimlaneRowBandBox(
      false,
      0,
      single.taskBandTotalHeight,
      single.layerHeight
    );
    const stackedCard = computeSwimlaneRowBandBox(
      true,
      0,
      stacked.taskBandTotalHeight,
      stacked.layerHeight
    );

    expect(stacked.hasTaskOverlaps).toBe(true);
    expect(stackedCard.height).toBe(singleCard.height);
  });
});

describe('applyRemotePresencePositionToDeveloperTasks', () => {
  const task = { id: 'BT-1', link: '', name: 'Issue', storyPoints: 1, team: 'Back' } as Task;
  const saved: TaskPosition = {
    assignee: 'dev-a',
    duration: 3,
    startDay: 0,
    startPart: 0,
    taskId: 'BT-1',
  };
  const taskPositions = new Map<string, TaskPosition>([['BT-1', saved]]);
  const tasksMap = new Map<string, Task>([['BT-1', task]]);
  const onRowA = [{ task, position: saved }];

  it('leaves the row unchanged without a preview', () => {
    expect(
      applyRemotePresencePositionToDeveloperTasks(onRowA, null, 'dev-a', taskPositions, tasksMap, 30)
    ).toBe(onRowA);
  });

  it('moves the card along the same row', () => {
    const next = applyRemotePresencePositionToDeveloperTasks(
      onRowA,
      { duration: 3, startCell: 6, taskId: 'BT-1' },
      'dev-a',
      taskPositions,
      tasksMap,
      30
    );
    expect(next[0]?.position.startDay).toBe(2);
    expect(next[0]?.position.startPart).toBe(0);
  });

  it('removes the card when the remote drag targets another row', () => {
    const next = applyRemotePresencePositionToDeveloperTasks(
      onRowA,
      { assignee: 'dev-b', duration: 3, startCell: 3, taskId: 'BT-1' },
      'dev-a',
      taskPositions,
      tasksMap,
      30
    );
    expect(next).toEqual([]);
  });

  it('injects the card onto the hovered row', () => {
    const next = applyRemotePresencePositionToDeveloperTasks(
      [],
      { assignee: 'dev-b', duration: 3, startCell: 3, taskId: 'BT-1' },
      'dev-b',
      taskPositions,
      tasksMap,
      30
    );
    expect(next).toHaveLength(1);
    expect(next[0]?.task.id).toBe('BT-1');
    expect(next[0]?.position.startDay).toBe(1);
    expect(next[0]?.position.startPart).toBe(0);
  });

  it('synthesizes a sticky note when the target row has no comment projection', () => {
    const next = applyRemotePresencePositionToDeveloperTasks(
      [],
      {
        assignee: 'dev-b',
        duration: 2,
        note: { color: 'pink', text: 'hello' },
        startCell: 6,
        taskId: 'comment:9',
      },
      'dev-b',
      new Map(),
      new Map(),
      30
    );
    expect(next).toHaveLength(1);
    expect(next[0]?.task).toMatchObject({
      id: 'comment:9',
      localDraftKind: 'comment',
      name: 'hello',
      stickyNoteColor: 'pink',
    });
    expect(next[0]?.position).toMatchObject({
      assignee: 'dev-b',
      duration: 2,
      startDay: 2,
      startPart: 0,
    });
  });
});

describe('applyRemotePresenceCardRowPreviews', () => {
  it('overlays a foreign height without replacing the local busy card', () => {
    const next = applyRemotePresenceCardRowPreviews(
      new Map([['note-1', { layerShiftUp: 0, span: 1 }]]),
      new Map([
        ['note-1', { layerShiftUp: 1, span: 3 }],
        ['note-2', { layerShiftUp: 0, span: 4 }],
      ]),
      'note-1'
    );
    expect(next.get('note-1')).toEqual({ layerShiftUp: 0, span: 1 });
    expect(next.get('note-2')).toEqual({ layerShiftUp: 0, span: 4 });
  });
});
