import { describe, expect, it } from 'vitest';

import {
  isActiveDeveloperRowDrag,
  isActiveSwimlaneTaskDrag,
  SWIMLANE_DEVELOPER_ROW_DRAG_KIND,
  SWIMLANE_TASK_DRAG_DATA_KIND,
  parseSwimlaneTaskDraggableId,
} from './swimlaneDragIds';

describe('isActiveDeveloperRowDrag', () => {
  it('is true only for explicit kind', () => {
    expect(
      isActiveDeveloperRowDrag({
        data: { current: { kind: SWIMLANE_DEVELOPER_ROW_DRAG_KIND } },
      })
    ).toBe(true);
    expect(isActiveDeveloperRowDrag({ data: { current: {} } })).toBe(false);
  });

  it('is false when data is missing — id может быть swimlane-… у задачи; не полагаться на префикс', () => {
    expect(isActiveDeveloperRowDrag({})).toBe(false);
  });
});

describe('isActiveSwimlaneTaskDrag', () => {
  it('is true when data.kind is swimlane-task', () => {
    expect(
      isActiveSwimlaneTaskDrag({
        data: { current: { kind: SWIMLANE_TASK_DRAG_DATA_KIND } },
      })
    ).toBe(true);
  });

  it('is false without kind', () => {
    expect(isActiveSwimlaneTaskDrag({ data: { current: {} } })).toBe(false);
  });
});

describe('parseSwimlaneTaskDraggableId', () => {
  it('parses segment id', () => {
    expect(parseSwimlaneTaskDraggableId('NW-1::0')).toEqual({
      taskId: 'NW-1',
      segmentIndex: 0,
    });
  });
});
