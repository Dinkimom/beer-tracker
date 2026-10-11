/** @vitest-environment jsdom */

import type { Task, TaskPosition } from '@/types';

import { act, cleanup, render } from '@testing-library/react';
import { Profiler } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { getPartsPerDay } from '@/constants';
import { SwimlaneDragHoverContext } from '@/features/swimlane/hooks/useSwimlaneDragHover';
import { SwimlaneDragHoverStore } from '@/lib/layers/application/swimlaneDrag';

import { SwimlaneDropPreview } from './SwimlaneDropPreview';

afterEach(cleanup);

const DAYS = 10;
const TOTAL_CELLS = DAYS * getPartsPerDay();
const EMPTY_CARD_ROWS = new Map();
const BAND = { hasTaskOverlaps: true, layerHeight: 60 };

function task(id: string): Task {
  return { id, link: '', name: id, status: 'todo', storyPoints: 1, team: 'Back' };
}

function position(taskId: string, assignee: string, startCell: number, duration: number): TaskPosition {
  return {
    assignee,
    duration,
    startDay: Math.floor(startCell / getPartsPerDay()),
    startPart: startCell % getPartsPerDay(),
    taskId,
  };
}

function setup(
  laneCount: number,
  tasksPerLane: number,
  startCellFor: (index: number) => number = (index) => (index * 2) % (TOTAL_CELLS - 3),
  activeTask: Task = task('active')
) {
  const pending: Array<() => void> = [];
  const store = new SwimlaneDragHoverStore({
    cancel: () => {
      pending.length = 0;
    },
    request: (callback) => {
      pending.push(callback);
      return pending.length;
    },
  });
  const taskPositions = new Map<string, TaskPosition>([['active', position('active', 'lane-0', 0, 2)]]);
  const laneTasksById = new Map<string, Array<{ position: TaskPosition; task: Task }>>();
  for (let lane = 0; lane < laneCount; lane++) {
    const laneId = `lane-${lane}`;
    const items = Array.from({ length: tasksPerLane }, (_, i) => {
      const id = `${laneId}-t${i}`;
      const pos = position(id, laneId, startCellFor(i), 3);
      taskPositions.set(id, pos);
      return { position: pos, task: task(id) };
    });
    laneTasksById.set(laneId, items);
  }

  const commits = new Map<string, number>();
  const onRender = (id: string) => {
    commits.set(id, (commits.get(id) ?? 0) + 1);
  };
  const view = render(
    <SwimlaneDragHoverContext.Provider value={store}>
      {[...laneTasksById.entries()].map(([laneId, laneTasks]) => (
        <div key={laneId} data-lane={laneId}>
          <Profiler id={laneId} onRender={onRender}>
            <SwimlaneDropPreview
              activeDraggableId="active"
              activeTask={activeTask}
              activeTaskDuration={2}
              band={BAND}
              developerId={laneId}
              dropDisabled={false}
              isDraggingTask
              layout={{
                baselineLayoutMode: 'compact',
                currentCell: 0,
                positionedTasks: laneTasks,
                stickyNoteCardRowById: EMPTY_CARD_ROWS,
                taskBandVisualHeight: 400,
                totalHeight: 400,
              }}
              taskPositions={taskPositions}
              timelineTotalParts={TOTAL_CELLS}
            />
          </Profiler>
        </div>
      ))}
    </SwimlaneDragHoverContext.Provider>
  );
  const hover = (assigneeId: string | null, cellIndex = 0) => {
    act(() => {
      store.set(
        assigneeId == null
          ? null
          : {
              assigneeId,
              day: Math.floor(cellIndex / getPartsPerDay()),
              part: cellIndex % getPartsPerDay(),
            }
      );
      while (pending.length > 0) pending.shift()!();
    });
  };
  return { commits, hover, view };
}

describe('SwimlaneDropPreview', () => {
  it('draws a card-sized slot only in the hovered lane', () => {
    const { hover, view } = setup(3, 0);
    hover('lane-1', 4);

    const slots = view.container.querySelectorAll('[data-swimlane-drop-preview]');
    expect(slots).toHaveLength(1);
    expect(slots[0]!.closest('[data-lane]')?.getAttribute('data-lane')).toBe('lane-1');
    expect((slots[0] as HTMLElement).style.height).toBe('60px');

    hover(null);
    expect(view.container.querySelector('[data-swimlane-drop-preview]')).toBeNull();
  });

  it('switches to the new-layer line when every visible layer is taken', () => {
    const { hover, view } = setup(1, 10, () => 5);
    hover('lane-0', 6);
    const marker = view.container.querySelector('[data-swimlane-drop-preview]');
    expect(marker?.getAttribute('data-swimlane-drop-preview')).toBe('new-layer');
  });

  it('paints the new-layer line in the sticky note color', () => {
    const note: Task = { ...task('active'), localDraftKind: 'comment', stickyNoteColor: 'pink' };
    const { hover, view } = setup(1, 10, () => 5, note);
    hover('lane-0', 6);
    const marker = view.container.querySelector<HTMLElement>('[data-swimlane-drop-preview="new-layer"]');
    expect(marker?.style.borderTopColor).toBe('rgb(249, 168, 212)');
  });

  it('never re-renders previews of lanes the pointer does not touch (30 lanes × 25 cards)', () => {
    const LANES = 30;
    const { commits, hover } = setup(LANES, 25);
    const started = performance.now();
    for (let cell = 0; cell < TOTAL_CELLS - 2; cell++) hover('lane-7', cell);
    const elapsed = performance.now() - started;

    expect(commits.get('lane-7')).toBe(1 + (TOTAL_CELLS - 2));
    for (let lane = 0; lane < LANES; lane++) {
      if (lane !== 7) expect(commits.get(`lane-${lane}`)).toBe(1);
    }
    expect(elapsed).toBeLessThan(3000);
  });
});
