/** @vitest-environment jsdom */

import { act, cleanup, render } from '@testing-library/react';
import { Profiler } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getPartsPerDay } from '@/constants';
import { SwimlaneDragHoverContext } from '@/features/swimlane/hooks/useSwimlaneDragHover';
import { SwimlaneDragHoverStore } from '@/lib/layers/application/swimlaneDrag';

import { TaskLayerOverdueBaselineStrips } from './TaskLayerOverdueBaselineStrips';

vi.mock('@/contexts/LanguageContext', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

function setup(taskCount: number) {
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
  const commits = new Map<string, number>();
  const onRender = (id: string) => {
    commits.set(id, (commits.get(id) ?? 0) + 1);
  };
  const view = render(
    <SwimlaneDragHoverContext.Provider value={store}>
      {Array.from({ length: taskCount }, (_, i) => (
        <Profiler key={i} id={`task-${i}`} onRender={onRender}>
          <TaskLayerOverdueBaselineStrips
            activeTaskDuration={2}
            assigneeId="lane-a"
            baselineHeight={40}
            baselineTop={0}
            currentCell={30}
            isDraggingTask
            status="in-progress"
            strips={[{ baselineStart: 10 + (i % 3), baselineWidth: 4 }]}
            taskId={`task-${i}`}
            timelineTotalParts={30}
          />
        </Profiler>
      ))}
    </SwimlaneDragHoverContext.Provider>
  );
  const hover = (assigneeId: string, cellIndex: number) => {
    act(() => {
      store.set({
        assigneeId,
        day: Math.floor(cellIndex / getPartsPerDay()),
        part: cellIndex % getPartsPerDay(),
      });
      while (pending.length > 0) pending.shift()!();
    });
  };
  return { commits, hover, view };
}

describe('TaskLayerOverdueBaselineStrips drag dimming', () => {
  it('re-renders a strip only when the drop range starts or stops covering it', () => {
    const { commits, hover, view } = setup(1);

    for (let cell = 0; cell < 30; cell++) {
      hover('lane-a', cell);
      if (cell === 11) {
        const strip = view.container.querySelector('.bg-red-400') as HTMLElement;
        expect(strip.style.opacity).toBe('0.3');
      }
    }

    expect(commits.get('task-0')).toBe(3);
  });

  it('ignores hover in other lanes', () => {
    const { commits, hover } = setup(1);
    for (let cell = 0; cell < 30; cell++) hover('lane-b', cell);
    expect(commits.get('task-0')).toBe(1);
  });

  it('keeps commits bounded with 200 overdue cards in the hovered lane', () => {
    const TASKS = 200;
    const { commits, hover } = setup(TASKS);
    const started = performance.now();
    for (let cell = 0; cell < 30; cell++) hover('lane-a', cell);
    const elapsed = performance.now() - started;

    for (let i = 0; i < TASKS; i++) {
      expect(commits.get(`task-${i}`)).toBe(3);
    }
    expect(elapsed).toBeLessThan(3000);
  });
});
